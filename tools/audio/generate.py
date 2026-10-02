#!/usr/bin/env python3
"""Generate the Words app's audio with Kokoro-82M (Apache-2.0) and check it with Whisper.

Reads curriculum.json and writes:
  audio/<voice>/<kind>/<slug>.mp3   MP3, mono, 24 kHz, 48 kbps (plays on iPhone and Android)
  audio/manifest.json               {"clips": {"<text, lower case>": {"f": "f/w/cat.mp3?v=<hash>", ...}}}
  tools/audio/qa-report.json        the voice used and what Whisper heard for every clip

Clips: every glossary word (w) and every sentence (s), in two slots:
  f = the main clip, used everywhere;
  m = a second talker for the words in listening items, so learners hear more than one speaker.

Voice choice. No single Kokoro voice says every word cleanly in isolation. Compared on 64 test words
(f/v, final stops, short-vowel pairs): the female voices voice an initial /f/ so it sounds like [v]
(fat -> "vat"), and af_heart adds a voiced "uh" after a final /p/ (cup -> "cup-uh"); am_adam has the
clearest /f/. A short pause before the word or a full stop after it often fixes a word (fix, fish,
change, page, trip), but the pause (and the slow speed) make the model say "uh" first, so that vowel
is cut off and the clip must then be heard as the bare word. Each clip is made with the first voice
in VOICE_ORDER, and the first way of saying it in VARIANTS, that Whisper recognises.
A main clip that no voice gets right uses the first voice and is listed under "flagged" in the
report; a second-talker clip is only added when a different voice gets it right.

Usage: see audio/README.md
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'audio'
REPORT = ROOT / 'tools' / 'audio' / 'qa-report.json'
SR = 24000
VOICE_ORDER = {'f': ['af_sarah', 'af_heart', 'am_michael', 'am_adam'],
               'm': ['am_michael', 'am_adam', 'am_fenrir', 'af_heart']}
# Ways of saying a word, tried in this order for each voice: (before, after, speed).
VARIANTS = [('', '', 1.0), (', ', '', 1.0), ('… ', '', 1.0), ('', '.', 1.0), ('', '', 0.85)]
ADDS_UH = {1, 2, 4}  # variants that put an "uh" before the word
PIPELINE_VERSION = '4'  # bump to regenerate everything
STOPS = set('ptkbdɡ')

# The course teaches short o as in "hot" (/ɑ/, a common American accent), so words spelled with o
# (and no a) use /ɑ/ for the lexicon's /ɔ/: long, off, bosses. Not before r: "or" stays /ɔɹ/
# (fork, born and short must not turn into fark, barn and shart).
SHORT_O = re.compile('ɔ(?!ɹ)')
# Pronunciations to force (misaki US phonemes): heteronyms and words the lexicon gets wrong.
PHONEME_OVERRIDES = {'live': 'lˈɪv', 'use': 'jˈuz'}  # live: the heart word (to live); use: the verb


def sha(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:10]


def slug(text):
    s = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    return s if len(s) <= 40 else f'{s[:30]}-{sha(text)[:6]}'


def ffmpeg(a, args, suffix='.wav'):
    with tempfile.TemporaryDirectory() as d:
        src, dst = os.path.join(d, 'in.wav'), os.path.join(d, 'out' + suffix)
        sf.write(src, a, SR)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, *args, dst], check=True)
        return dst if suffix != '.wav' else sf.read(dst, dtype='float32')[0]


def trim_silence(a, thr_db=-50, pad=0.03):
    peak = np.max(np.abs(a)) + 1e-9
    idx = np.where(np.abs(a) > peak * 10 ** (thr_db / 20))[0]
    if not len(idx):
        return a
    p = int(SR * pad)
    return a[max(0, idx[0] - p):min(len(a), idx[-1] + p)]


def fade(a, fin=0.005, fout=0.03):
    a = a.copy()
    n_in, n_out = min(len(a), int(SR * fin)), min(len(a), int(SR * fout))
    if n_in:
        a[:n_in] *= np.linspace(0, 1, n_in)
    if n_out:
        a[-n_out:] *= np.linspace(1, 0, n_out)
    return a


def normalise(a, target_rms_db=-20.0, peak_db=-1.0):
    """Same loudness for every clip (RMS over the loud part), peaks kept below peak_db."""
    h = int(SR * 0.005)
    frames = [a[i:i + h] for i in range(0, max(len(a) - h, 1), h)]
    db = np.array([20 * np.log10(np.sqrt(np.mean(f ** 2)) + 1e-9) for f in frames])
    loud = np.concatenate([frames[i] for i in np.where(db > db.max() - 30)[0]])
    b = a * (10 ** (target_rms_db / 20) / (np.sqrt(np.mean(loud ** 2)) + 1e-9))
    peak = np.max(np.abs(b)) + 1e-9
    if peak > 10 ** (peak_db / 20):
        b *= 10 ** (peak_db / 20) / peak
    return b.astype(np.float32)


def trim_release(a):
    """After a final stop (cup, bed): keep the closure and the burst, cut a voiced "uh" after it."""
    hop = int(SR * 0.005)
    db = np.array([20 * np.log10(np.sqrt(np.mean(a[i:i + hop] ** 2)) + 1e-9) for i in range(0, len(a) - hop, hop)])
    top, end = db.max(), int(np.argmax(db))
    while end + 1 < len(db) and db[end + 1] > top - 25:  # end of the vowel
        end += 1
    i = end + 1
    while i < len(db) and db[i] > top - 38:  # into the closure
        i += 1
    if i >= len(db) or i - end > 60:
        return a
    j = i
    while j < len(db) and db[j] <= top - 38:  # the closure ends at the burst
        j += 1
    cut = j * hop + int(SR * 0.06)
    if j >= len(db) or j - i < 4 or cut >= len(a) - 2 * hop:  # no clear closure, or nothing after the burst
        return a
    b = a[:cut].copy()
    n = int(SR * 0.015)
    b[-n:] *= np.linspace(1, 0, n)
    return b


def trim_lead(a):
    """Cut a short vowel ("uh") said before the word: a loud stretch under 160 ms, then a dip, then the word."""
    hop = int(SR * 0.005)
    db = np.array([20 * np.log10(np.sqrt(np.mean(a[i:i + hop] ** 2)) + 1e-9) for i in range(0, len(a) - hop, hop)])
    loud = db > db.max() - 20
    if not loud.any():
        return a
    i = int(np.argmax(loud))
    j = i
    while j < len(db) and loud[j]:
        j += 1
    k = j
    while k < len(db) and not loud[k]:
        k += 1
    if k >= len(db) or j - i > 32 or k - j < 3:  # one loud stretch only, or too long to be an "uh"
        return a
    cut = (j + int(np.argmin(db[j:k]))) * hop
    return fade(a[cut:], 0.005, 0.03)


def encode_mp3(a, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        src = os.path.join(d, 'in.wav')
        sf.write(src, a, SR)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', str(SR),
                        '-c:a', 'libmp3lame', '-b:a', '48k', str(path)], check=True)


class Synth:
    def __init__(self, models):
        from kokoro_onnx import Kokoro
        from misaki import en, espeak
        self.k = Kokoro(str(Path(models) / 'kokoro-v1.0.onnx'), str(Path(models) / 'voices-v1.0.bin'))
        self.g2p = en.G2P(trf=False, british=False, fallback=espeak.EspeakFallback(british=False))

    def phonemes(self, text):
        if text.lower() in PHONEME_OVERRIDES:
            return PHONEME_OVERRIDES[text.lower()]
        _, tokens = self.g2p(text)
        out = []
        for t in tokens:
            ph = t.phonemes or ''
            word = t.text.lower()
            if word in PHONEME_OVERRIDES:
                ph = PHONEME_OVERRIDES[word]
            elif 'o' in word and 'a' not in word:
                ph = SHORT_O.sub('ɑ', ph)
            out.append(ph + (' ' if t.whitespace else ''))
        return ''.join(out).strip()

    def say(self, phonemes, voice, speed=1.0):
        a, sr = self.k.create(phonemes, voice=voice, speed=speed, is_phonemes=True)
        assert sr == SR, sr
        return np.asarray(a, dtype=np.float32)


class Checker:
    """Whisper small.en (sherpa-onnx): transcribes each clip so odd ones can be found and listened to."""
    def __init__(self, models):
        import sherpa_onnx
        d = Path(models) / 'sherpa-onnx-whisper-small.en'
        self.rec = sherpa_onnx.OfflineRecognizer.from_whisper(
            encoder=str(d / 'small.en-encoder.int8.onnx'), decoder=str(d / 'small.en-decoder.int8.onnx'),
            tokens=str(d / 'small.en-tokens.txt'), language='en', task='transcribe', num_threads=4)

    def text(self, a):
        pad = np.zeros(int(SR * 0.5), dtype=np.float32)
        s = self.rec.create_stream()
        s.accept_waveform(SR, np.concatenate([pad, a, pad]))
        self.rec.decode_stream(s)
        return s.result.text.strip()


# An isolated word often comes back with a filler ("A cat."), as digits ("4") or as a word that
# sounds the same ("deer" for "dear", the letter "C" for "see"). Those count as heard right.
FILLERS = {'a', 'an', 'the', 'and', 'uh', 'um', 'oh'}
DIGITS = {'1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight',
          '9': 'nine', '10': 'ten', '11': 'eleven', '12': 'twelve', '3rd': 'third'}
SAME_SOUND = [
    'i eye aye', 'a uh', 'to too two', 'not knot', 'be bee b', 'see sea c', 'sun son', 'no know', 'by buy bye',
    'for four', 'one won', 'you u', 'are r', 'am m', 'tea t', 'why y', 'eye i', 'dear deer', 'hear here',
    'high hi', 'hole whole', 'made maid', 'mail male', 'meat meet', 'need knead', 'pear pair', 'pole poll',
    'rose rows', 'sell cell', 'stare stair', 'tie thai', 'wear where', 'which witch', 'wood would', 'write right',
    'few phew', 'knew new', 'knight night', 'mat matt', 'fin finn', 'cord chord', 'peck pec', 'sack sac',
    'chew choo', 'glad glaad', 'fill phil', 'their there', 'hour our', 'week weak', 'sail sale', 'tail tale',
    'road rode', 'blue blew', 'flower flour', 'son sun', 'bear bare', 'plane plain', 'whole hole',
]
HOMOPHONES = {}
for group in SAME_SOUND:
    for w in group.split():
        HOMOPHONES.setdefault(w, {w}).update(group.split())


def words_of(t):
    t = re.sub(r'\d+(rd|th|st|nd)?', lambda m: ' ' + DIGITS.get(m.group(0), m.group(0)) + ' ', t.lower())
    return re.sub(r"[^a-z' ]", ' ', t.replace('-', ' ')).replace("'", '').split()


def heard_ok(expected, heard, strict=False):
    """strict: the bare word only (no "a" in front), for clips whose "uh" was cut off."""
    want, got = words_of(expected), words_of(heard)
    if len(want) > 1:
        return got == want
    w = want[0]
    if len(got) > 1 and w not in FILLERS and not strict:
        got = [g for g in got if g not in FILLERS] or got
    if len(set(got)) == 1 and len(got) <= 2:  # "knock knock"
        got = got[:1]
    return len(got) == 1 and got[0] in HOMOPHONES.get(w, {w})


def clip_list():
    """[(kind, text, voices)]: every glossary word, and every sentence in the items."""
    data = json.loads((ROOT / 'curriculum.json').read_text(encoding='utf-8'))
    listen, sentences = set(), []
    for tech in data['techniques']:
        for sub in tech['subSkills']:
            for step in ('drill', 'quiz'):
                for q in sub[step]['questions']:
                    if q['type'] == 'listen':
                        listen.add(q['audio'].lower())
                    if q['type'] == 'sentence' and q['text'] not in sentences:
                        sentences.append(q['text'])
    clips = [('w', w, ['f', 'm'] if w in listen else ['f']) for w in sorted(data['glossary'])]
    clips += [('s', s, ['f']) for s in sentences]
    return clips


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--models', required=True, help='folder with kokoro-v1.0.onnx, voices-v1.0.bin, sherpa-onnx-whisper-small.en/')
    ap.add_argument('--force', action='store_true', help='regenerate every clip, not only new or changed ones')
    ap.add_argument('--phonemes', action='store_true', help='only print the phonemes of every clip (to review)')
    args = ap.parse_args()

    clips = clip_list()
    synth = Synth(args.models)
    if args.phonemes:
        for kind, text, _ in clips:
            print(f'{kind}\t{text}\t{synth.phonemes(text)}')
        return 0

    checker = Checker(args.models)
    manifest_path = OUT / 'manifest.json'
    old = json.loads(manifest_path.read_text()).get('clips', {}) if manifest_path.exists() else {}
    old_report = json.loads(REPORT.read_text()) if REPORT.exists() else {}
    manifest = {'version': 2, 'voices': VOICE_ORDER, 'clips': {}}
    report = {'clips': {}}
    keep = set()

    def make(kind, text, source, voice, n):
        before, after, speed = VARIANTS[n]
        a = fade(trim_silence(synth.say(before + source + after, voice, speed)))
        strict = n in ADDS_UH
        if strict:
            if source.lstrip('ˈˌ')[:1] in 'aeiouæɑɐɔəɛɜɪʊʌAIOWYᵻ':
                return a, '(starts with a vowel: the "uh" cannot be cut off)', False
            a = trim_lead(a)
        if kind == 'w' and source.rstrip('ˈˌ')[-1:] in STOPS:
            a = trim_release(a)
        heard = checker.text(a)
        return a, heard, heard_ok(text, heard, strict)

    for kind, text, slots in clips:
        key = text.lower()
        entry = {}
        source = synth.phonemes(text)
        used = None
        for slot in slots:
            order = [v for v in VOICE_ORDER[slot] if v != used]
            h = sha('|'.join([PIPELINE_VERSION, key, slot, source, ','.join(order), repr(VARIANTS)]))
            rel = f'{slot}/{kind}/{slug(text)}.mp3'
            rkey = f'{key}@{slot}'
            prev = old_report.get('clips', {}).get(rkey)
            if not args.force and prev and prev.get('h') == h and (prev.get('voice') is None or (OUT / rel).exists()):
                report['clips'][rkey] = prev
                if prev.get('voice'):
                    entry[slot] = f'{rel}?v={h}'
                    keep.add(rel)
                    used = used or prev['voice']
                continue
            tried, chosen = [], None
            for voice in order:
                for n in range(len(VARIANTS) if kind == 'w' else 1):
                    a, heard, ok = make(kind, text, source, voice, n)
                    tried.append(f'{voice}/{n}: {heard}')
                    if ok:
                        chosen = (voice, a, True)
                        break
                    if chosen is None and slot == 'f':
                        chosen = (voice, a, False)  # nothing is recognised: keep the first, flagged
                if chosen and chosen[2]:
                    break
            if chosen is None:  # second talker: only added when a different voice is recognised
                report['clips'][rkey] = {'h': h, 'voice': None, 'ok': False, 'tried': tried}
                print(f'{rkey:44s} --  no second voice ({"; ".join(tried)})', flush=True)
                continue
            voice, a, ok = chosen
            encode_mp3(normalise(a), OUT / rel)
            keep.add(rel)
            entry[slot] = f'{rel}?v={h}'
            used = used or voice
            report['clips'][rkey] = {'h': h, 'voice': voice, 'variant': int(tried[-1].split(':')[0].split('/')[1]) if ok else 0,
                                     'ok': ok, 'tried': tried, 'phonemes': source}
            print(f'{rkey:44s} {"ok" if ok else "??"}  {voice:10s} {tried[-1] if ok else "; ".join(tried)}', flush=True)
        manifest['clips'][key] = entry

    # Remove clips that are no longer in the course.
    for f in OUT.glob('*/*/*.mp3'):
        if str(f.relative_to(OUT)) not in keep:
            f.unlink()

    report['flagged'] = sorted(k for k, r in report['clips'].items() if r['voice'] and not r['ok'])
    report['voices_used'] = {}
    for r in report['clips'].values():
        if r['voice']:
            report['voices_used'][r['voice']] = report['voices_used'].get(r['voice'], 0) + 1
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=0) + '\n', encoding='utf-8')
    REPORT.write_text(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=1) + '\n', encoding='utf-8')
    files = sum(len(e) for e in manifest['clips'].values())
    print(f"\n{len(manifest['clips'])} clips, {files} files, voices {report['voices_used']}; "
          f"no voice recognised for {len(report['flagged'])} (listen to those)")
    return 0


if __name__ == '__main__':
    sys.exit(main())
