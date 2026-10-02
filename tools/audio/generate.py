#!/usr/bin/env python3
"""Generate the Words app's audio with Kokoro-82M (Apache-2.0) and check it with Whisper.

Reads curriculum.json and writes:
  audio/<voice>/<kind>/<slug>.mp3   MP3, mono, 24 kHz, 48 kbps (plays on iPhone and Android)
  audio/manifest.json               {"clips": {"<text, lower case>": {"f": "f/w/cat.mp3?v=<hash>", ...}}}
  tools/audio/qa-report.json        what Whisper heard for every clip

Clips: every glossary word (w) and every sentence (s).
Voices: f = af_heart (main voice), m = am_michael (second talker, for the words in listening items,
so learners hear more than one speaker).

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
VOICES = {'f': 'af_heart', 'm': 'am_michael'}
PIPELINE_VERSION = '1'  # bump to regenerate everything

# The course teaches short o as in "hot" (/ɑ/, a common American accent), so words spelled with a
# single o between consonants (dog, long, off) use /ɑ/ too, not the lexicon's /ɔ/.
SHORT_O = re.compile(r'^[b-df-hj-np-tv-z]*o[b-df-hj-np-tv-z]+$')
# Pronunciations to force (misaki US phonemes): heteronyms and words the lexicon gets wrong.
PHONEME_OVERRIDES = {}


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
            elif SHORT_O.match(word):
                ph = ph.replace('ɔ', 'ɑ')
            out.append(ph + (' ' if t.whitespace else ''))
        return ''.join(out).strip()

    def say(self, phonemes, voice):
        a, sr = self.k.create(phonemes, voice=voice, speed=1.0, is_phonemes=True)
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


# An isolated word often comes back with a filler ("A cat.") or as a homophone ("knot" for "not").
FILLERS = {'a', 'an', 'the', 'and', 'uh', 'um', 'oh'}
HOMOPHONES = {'i': {'i', 'eye', 'aye'}, 'a': {'a', 'uh'}, 'to': {'to', 'too', 'two'}, 'not': {'not', 'knot'},
              'be': {'be', 'bee'}, 'see': {'see', 'sea'}, 'sun': {'sun', 'son'}, 'no': {'no', 'know'},
              'by': {'by', 'buy', 'bye'}, 'for': {'for', 'four'}, 'one': {'one', 'won'}, 'you': {'you', 'u'}}


def words_of(t):
    return re.sub(r"[^a-z' ]", ' ', t.lower().replace('-', ' ')).replace("'", '').split()


def heard_ok(expected, heard):
    want, got = words_of(expected), words_of(heard)
    if len(want) > 1:
        return got == want
    if len(got) > 1 and want[0] not in FILLERS:
        got = [g for g in got if g not in FILLERS] or got
    return len(got) == 1 and got[0] in HOMOPHONES.get(want[0], {want[0]})


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
    manifest = {'version': 2, 'voices': VOICES, 'clips': {}}
    report = {'heard': {}}
    keep = set()

    for kind, text, voices in clips:
        key = text.lower()
        entry = {}
        source = synth.phonemes(text)
        for v in voices:
            h = sha('|'.join([PIPELINE_VERSION, key, VOICES[v], source]))
            rel = f'{v}/{kind}/{slug(text)}.mp3'
            keep.add(rel)
            prev = old.get(key, {}).get(v)
            rkey = f'{key}@{v}'
            if prev == f'{rel}?v={h}' and (OUT / rel).exists() and not args.force:
                entry[v] = prev
                if rkey in old_report.get('heard', {}):
                    report['heard'][rkey] = old_report['heard'][rkey]
                continue
            a = fade(trim_silence(synth.say(source, VOICES[v])))
            heard = checker.text(a)
            report['heard'][rkey] = {'heard': heard, 'ok': heard_ok(text, heard), 'phonemes': source}
            encode_mp3(normalise(a), OUT / rel)
            entry[v] = f'{rel}?v={h}'
            print(f'{rkey:48s} {"ok " if report["heard"][rkey]["ok"] else "?? "} {heard}', flush=True)
        manifest['clips'][key] = entry

    # Remove clips that are no longer in the course.
    for f in OUT.glob('*/*/*.mp3'):
        if str(f.relative_to(OUT)) not in keep:
            f.unlink()

    report['flagged'] = sorted(k for k, r in report['heard'].items() if not r['ok'])
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=0) + '\n', encoding='utf-8')
    REPORT.write_text(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=1) + '\n', encoding='utf-8')
    files = sum(len(e) for e in manifest['clips'].values())
    print(f"\n{len(manifest['clips'])} clips, {files} files; Whisper flagged {len(report['flagged'])} (listen to those)")
    return 0


if __name__ == '__main__':
    sys.exit(main())
