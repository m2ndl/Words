"""Single speech sounds for the "sound it out" button (c – a – t … cat).

A voice model cannot say a lone consonant, so each sound is cut out of whole words at acoustic
landmarks (method from the literacy app's audio build):
  - the noise of s, f, sh, ch, th and of the voiceless stops;
  - the start of a voiced stop (b, d, g) or the stretch before the vowel (m, n, l, r, v, z, w, y);
  - the longest voiced stretch for vowels; long vowels, vowel teams and r-vowels are also tried
    said on their own (ay, ee, oy, ar, …).
Several cuts are tried for each sound. Each cut is then glued into the course's own short words
(c + a + t) and the speech recogniser must hear the word: the "blend test". The best cut is kept;
a sound that never passes is left out, and words with it have no sound-it-out.
"""
import re

import numpy as np

import wordparts

# File name for each sound (sounds are misaki US phonemes, see wordparts.py).
NAMES = {
    'p': 'p', 'b': 'b', 't': 't', 'd': 'd', 'k': 'k', 'ɡ': 'g', 'f': 'f', 'v': 'v', 'θ': 'th', 'ð': 'dh',
    's': 's', 'z': 'z', 'ʃ': 'sh', 'ʧ': 'ch', 'ʤ': 'j', 'm': 'm', 'n': 'n', 'ŋ': 'ng', 'l': 'l', 'ɹ': 'r',
    'w': 'w', 'j': 'y', 'h': 'h', 'ks': 'ks', 'kw': 'kw',
    'æ': 'a-short', 'ɛ': 'e-short', 'ɪ': 'i-short', 'ɑ': 'o-short', 'ʌ': 'u-short', 'ʊ': 'oo-short',
    'A': 'a-long', 'I': 'i-long', 'O': 'o-long', 'i': 'e-long', 'u': 'oo-long', 'ju': 'u-long',
    'W': 'ow', 'Y': 'oy', 'ɔ': 'aw', 'ɑɹ': 'ar', 'ɔɹ': 'or', 'ɜɹ': 'er', 'ɛɹ': 'air', 'ɪɹ': 'ear',
}
# Where each sound is cut from: (phonemes said, cut method).
CANDIDATES = {
    's': [('sˈʌn', 'frication'), ('sˈæt', 'frication'), ('sˈɪt', 'frication')],
    'f': [('fˈæn', 'frication'), ('fˈɪt', 'frication'), ('fˈʌn', 'frication'), ('ˈɪf', 'final'), ('ˈɑf', 'final'), ('kˈʌf', 'final')],
    'ʃ': [('ʃˈɪp', 'frication'), ('ʃˈɑp', 'frication')],
    'θ': [('θˈɪn', 'frication'), ('θˈɪk', 'frication'), ('θˈæŋk', 'frication'), ('bˈæθ', 'final'), ('mˈæθ', 'final')],
    'ʧ': [('ʧˈɪp', 'frication'), ('ʧˈɑp', 'frication')],
    'h': [('hˈæt', 'initial-weak'), ('hˈɑt', 'initial-weak'), ('hˈɪt', 'initial-weak'), ('hˈɑp', 'initial-weak')],
    'p': [('pˈæn', 'stop'), ('pˈɪn', 'stop'), ('pˈɑt', 'stop')],
    't': [('tˈɑp', 'stop'), ('tˈɪp', 'stop'), ('tˈæp', 'stop')],
    'k': [('kˈæt', 'stop'), ('kˈɪt', 'stop')],
    'ks': [('bˈɑks', 'final'), ('sˈɪks', 'final')],
    'kw': [('kwˈɪt', 'glide'), ('kwˈɪk', 'glide')],
    'b': [('bˈʌs', 'voiced-stop'), ('bˈæd', 'voiced-stop')],
    'd': [('dˈɑt', 'voiced-stop'), ('dˈæd', 'voiced-stop')],
    'ɡ': [('ɡˈæs', 'voiced-stop'), ('ɡˈɑt', 'voiced-stop'), ('ɡˈɛt', 'voiced-stop'), ('ɡˈʌm', 'voiced-stop')],
    'ʤ': [('ʤˈɑb', 'voiced-stop'), ('ʤˈɛt', 'voiced-stop')],
    'm': [('mˈæp', 'initial-nasal'), ('mˈɑp', 'initial-nasal'), ('mˈɛt', 'initial-nasal'), ('hˈæm', 'final-drop'), ('sˈʌm', 'final-drop')],
    'n': [('nˈæp', 'initial-nasal'), ('nˈɛt', 'initial-nasal')],
    'ŋ': [('sˈɪŋ', 'final-drop'), ('lˈɑŋ', 'final-drop')],
    'l': [('lˈæp', 'initial-weak-4'), ('lˈɪp', 'initial-nasal'), ('ˈɪl', 'final-drop')],
    'ɹ': [('ɹˈɛd', 'initial-weak-4'), ('ɹˈæt', 'initial-weak-4'), ('ɹˈʌn', 'initial-weak-4'), ('ɹˈɑk', 'initial-weak'),
          ('ɹˈɪp', 'initial-weak-4'), ('ɹˈʌɡ', 'initial-weak')],
    'z': [('zˈɪp', 'initial-voiced-fricative'), ('zˈæp', 'initial-voiced-fricative')],
    'v': [('vˈæn', 'initial-weak'), ('vˈɛt', 'initial-weak'), ('vˈæn', 'initial-voiced-fricative'), ('vˈɛt', 'initial-voiced-fricative'),
          ('hˈæv', 'final-drop'), ('ɡˈɪv', 'final-drop')],
    'ð': [('ðˈæt', 'initial-voiced-fricative'), ('ðˈɛn', 'initial-weak')],
    'w': [('wˈɛt', 'glide'), ('wˈɪn', 'glide')],
    'j': [('jˈɛs', 'glide'), ('jˈɛt', 'glide')],
    'æ': [('ˈæt', 'vowel'), ('kˈæt', 'vowel'), ('pˈæt', 'vowel'), ('ˈæ', 'whole')],
    'ɪ': [('ˈɪt', 'vowel'), ('pˈɪt', 'vowel'), ('sˈɪt', 'vowel'), ('kˈɪt', 'vowel'), ('ˈɪ', 'whole')],
    'ɛ': [('ˈɛʧ', 'vowel'), ('pˈɛt', 'vowel'), ('sˈɛt', 'vowel'), ('ˈɛ', 'whole')],
    'ʌ': [('ˈʌp', 'vowel'), ('kˈʌp', 'vowel'), ('sˈʌk', 'vowel'), ('ˈʌ', 'whole')],
    'ɑ': [('ˈɑks', 'vowel'), ('pˈɑt', 'vowel'), ('tˈɑp', 'vowel'), ('ˈɑ', 'whole')],
    'ʊ': [('fˈʊt', 'vowel'), ('kˈʊk', 'vowel'), ('pˈʊt', 'vowel'), ('ʃˈʊk', 'vowel'), ('ˈʊ', 'whole')],
    'A': [('ˈA', 'whole'), ('tˈAk', 'vowel'), ('kˈAk', 'vowel'), ('tˈAp', 'vowel')],
    'I': [('ˈI', 'whole'), ('kˈIt', 'vowel'), ('ˈIs', 'vowel'), ('pˈIp', 'vowel'), ('tˈIp', 'vowel')],
    'O': [('ˈO', 'whole'), ('kˈOt', 'vowel'), ('sˈOp', 'vowel'), ('ˈOk', 'vowel')],
    'i': [('ˈi', 'whole'), ('fˈit', 'vowel'), ('sˈik', 'vowel'), ('kˈip', 'vowel')],
    'u': [('ˈu', 'whole'), ('sˈup', 'vowel'), ('ʃˈut', 'vowel'), ('kˈut', 'vowel')],
    'ju': [('jˈu', 'whole'), ('kjˈut', 'vowel')],
    'W': [('ˈW', 'whole'), ('ˈWt', 'vowel'), ('kˈW', 'vowel'), ('ʃˈWt', 'vowel')],
    'Y': [('ˈY', 'whole'), ('tˈY', 'vowel'), ('sˈY', 'vowel')],
    'ɔ': [('ˈɔ', 'whole'), ('sˈɔ', 'vowel'), ('tˈɔk', 'vowel'), ('pˈɔ', 'vowel'), ('kˈɔt', 'vowel')],
    'ɑɹ': [('ˈɑɹ', 'whole'), ('kˈɑɹ', 'vowel'), ('pˈɑɹk', 'vowel')],
    'ɔɹ': [('ˈɔɹ', 'whole'), ('fˈɔɹ', 'vowel'), ('ʃˈɔɹt', 'vowel'), ('pˈɔɹt', 'vowel')],
    'ɜɹ': [('ˈɜɹ', 'whole'), ('hˈɜɹt', 'vowel'), ('ʃˈɜɹt', 'vowel'), ('hˈɜɹ', 'vowel')],
    'ɛɹ': [('ˈɛɹ', 'whole'), ('hˈɛɹ', 'vowel'), ('pˈɛɹ', 'vowel')],
    'ɪɹ': [('ˈɪɹ', 'whole'), ('hˈɪɹ', 'vowel'), ('ʧˈɪɹ', 'vowel')],
}
# Blend-test words: simple, common words, so a failure points at the sound being tested.
# (Short-vowel set from the literacy app's audio build; the rest added for the vowel teams.)
_B = '''
pan p æ n|cat k æ t|hat h æ t|sat s æ t|bad b æ d|map m æ p|tap t æ p|dad d æ d|hot h ɑ t|pot p ɑ t|top t ɑ p
box b ɑ ks|dog d ɑ ɡ|not n ɑ t|pin p ɪ n|sit s ɪ t|tip t ɪ p|big b ɪ ɡ|kit k ɪ t|fish f ɪ ʃ|pen p ɛ n|ten t ɛ n
bed b ɛ d|net n ɛ t|get ɡ ɛ t|set s ɛ t|cup k ʌ p|bus b ʌ s|sun s ʌ n|cut k ʌ t|hut h ʌ t|but b ʌ t|fan f æ n
fat f æ t|ship ʃ ɪ p|shop ʃ ɑ p|thin θ ɪ n|thick θ ɪ k|chip ʧ ɪ p|chop ʧ ɑ p|gas ɡ æ s|got ɡ ɑ t|jet ʤ ɛ t
job ʤ ɑ b|mad m æ d|nap n æ p|lap l æ p|lot l ɑ t|red ɹ ɛ d|rat ɹ æ t|zip z ɪ p|van v æ n|vet v ɛ t|wet w ɛ t
win w ɪ n|yes j ɛ s|yet j ɛ t|six s ɪ ks|sing s ɪ ŋ|long l ɑ ŋ|pink p ɪ ŋ k|bank b æ ŋ k|then ð ɛ n|that ð æ t
this ð ɪ s|make m A k|cake k A k|name n A m|tape t A p|same s A m|bike b I k|time t I m|kite k I t|ride ɹ I d
home h O m|note n O t|boat b O t|soap s O p|road ɹ O d|feet f i t|seed s i d|team t i m|keep k i p|sheep ʃ i p
moon m u n|food f u d|boot b u t|soon s u n|cool k u l|cute k ju t|huge h ju ʤ|mule m ju l|out W t|down d W n
town t W n|loud l W d|boy b Y|coin k Y n|join ʤ Y n|toy t Y|saw s ɔ|law l ɔ|paw p ɔ|ball b ɔ l|talk t ɔ k
car k ɑɹ|park p ɑɹ k|farm f ɑɹ m|star s t ɑɹ|dark d ɑɹ k|for f ɔɹ|fork f ɔɹ k|corn k ɔɹ n|short ʃ ɔɹ t
her h ɜɹ|bird b ɜɹ d|girl ɡ ɜɹ l|turn t ɜɹ n|fur f ɜɹ|hair h ɛɹ|chair ʧ ɛɹ|pair p ɛɹ|care k ɛɹ|bear b ɛɹ
ear ɪɹ|near n ɪɹ|hear h ɪɹ|dear d ɪɹ|fear f ɪɹ|book b ʊ k|foot f ʊ t|look l ʊ k|cook k ʊ k|good ɡ ʊ d
quit kw ɪ t|quick kw ɪ k|born b ɔɹ n|sort s ɔɹ t|port p ɔɹ t|hurt h ɜɹ t|shirt ʃ ɜɹ t|burn b ɜɹ n
night n I t|bite b I t|pie p I|put p ʊ t|took t ʊ k|caught k ɔ t|dawn d ɔ n|man m æ n|met m ɛ t|ham h æ m
run ɹ ʌ n|rock ɹ ɑ k|vest v ɛ s t|have h æ v|kick k ɪ k|keg k ɛ ɡ|gum ɡ ʌ m|hop h ɑ p|hit h ɪ t
gap ɡ æ p|bag b æ ɡ|pig p ɪ ɡ|leg l ɛ ɡ|rip ɹ ɪ p|rug ɹ ʌ ɡ|five f I v|bath b æ θ|math m æ θ|thank θ æ ŋ k
'''
BLEND_WORDS = {w: parts.split() for w, parts in (x.strip().split(' ', 1) for x in _B.replace('\n', '|').split('|') if x.strip())}
# Vowels said whole, as phonics names them; one of these passes if the recogniser hears the syllable.
SAID_AS = {'A': {'a', 'eh', 'hey', 'ay', 'aye'}, 'I': {'i', 'eye', 'aye', 'ai'}, 'O': {'o', 'oh', 'owe'},
           'i': {'e', 'ee', 'eee'}, 'u': {'oo', 'ooh', 'ou', 'who', 'u'}, 'ju': {'you', 'u', 'yu'},
           'W': {'ow', 'ouch', 'how', 'wow'}, 'Y': {'oy', 'oi', 'boy', 'ahoy'}, 'ɔ': {'aw', 'awe'},
           'ɑɹ': {'are', 'r', 'ar'}, 'ɔɹ': {'or', 'oar', 'ore'}, 'ɜɹ': {'er', 'err', 'her'},
           'ɛɹ': {'air', 'heir'}, 'ɪɹ': {'ear', 'year', 'here'}}

SHORT_VOWELS = {'æ', 'ɪ', 'ɛ', 'ʌ', 'ɑ', 'ʊ'}
VOWELS = {'æ', 'ɪ', 'ɛ', 'ʌ', 'ɑ', 'ʊ', 'A', 'I', 'O', 'i', 'u', 'ju', 'W', 'Y', 'ɔ', 'ɑɹ', 'ɔɹ', 'ɜɹ', 'ɛɹ', 'ɪɹ'}
CONTINUANTS = {'s', 'f', 'ʃ', 'θ', 'ð', 'm', 'n', 'l', 'ɹ', 'z', 'v', 'ŋ'}
PASS_SCORE = {'vowel': 0.6, 'consonant': 0.6}
# Loudness (RMS dB) of each kind of sound. f, th, v and h are naturally weak; raised to vowel loudness
# they hiss like s or sh ("for" glued from the cuts was heard as "short").
LOUDNESS = {'weak': -28.0, 'hiss': -24.0, 'other': -20.0}
WEAK, HISS = {'f', 'θ', 'v', 'ð', 'h'}, {'s', 'ʃ', 'ʧ', 'z', 'ks'}
# Acoustic checks for cut consonants: share of voiced frames and spectral centre (Hz).
CHECKS = {
    's': {'voiced_max': 0.3, 'centroid_min': 6000}, 'ʃ': {'voiced_max': 0.3, 'centroid_min': 3000, 'centroid_max': 7800},
    'f': {'voiced_max': 0.3}, 'θ': {'voiced_max': 0.4}, 'h': {'voiced_max': 0.7}, 'ʧ': {'voiced_max': 0.4, 'centroid_min': 1500},
    'p': {'voiced_max': 0.6}, 't': {'voiced_max': 0.6}, 'k': {'voiced_max': 0.6}, 'ks': {'centroid_min': 2500},
    'm': {'voiced_min': 0.6, 'centroid_max': 1200}, 'n': {'voiced_min': 0.6, 'centroid_max': 1200},
    'ŋ': {'voiced_min': 0.6, 'centroid_max': 1200}, 'l': {'voiced_min': 0.6, 'centroid_max': 1500},
    'ɹ': {'voiced_min': 0.6}, 'z': {'voiced_min': 0.5, 'centroid_min': 1000}, 'v': {'voiced_min': 0.5},
    'ð': {'voiced_min': 0.5},
}


class Signal:
    """Frame-level measures of a clip (5 ms hop)."""
    HOP = 0.005

    def __init__(self, a, sr):
        self.a, self.sr = a, sr
        h, w = int(sr * self.HOP), int(sr * 0.025)
        self.h = h
        frames = [a[i:i + w] for i in range(0, max(len(a) - w, 1), h)]
        self.db = np.array([20 * np.log10(np.sqrt(np.mean(f ** 2)) + 1e-9) for f in frames])
        freqs = np.fft.rfftfreq(w, 1 / sr)
        hi, lo, per = [], [], []
        for f in frames:
            f = np.pad(f, (0, w - len(f))) - f.mean()
            spec = np.abs(np.fft.rfft(f * np.hanning(w))) ** 2
            hi.append(spec[freqs >= 2500].sum() / (spec.sum() + 1e-12))
            lo.append(spec[freqs < 600].sum() / (spec.sum() + 1e-12))
            ac = np.correlate(f, f, 'full')[w - 1:]
            per.append(ac[int(sr / 400):int(sr / 70)].max() / (ac[0] + 1e-12))
        self.hi = np.array(hi)  # share of energy above 2.5 kHz
        self.lo = np.array(lo)  # share of energy below 600 Hz (high in a nasal murmur)
        self.voiced = (np.array(per) > 0.5) & (self.db > self.db.max() - 35)

    def t(self, i):
        return i * self.h / self.sr

    def cut(self, t0, t1):
        return self.a[max(0, int(t0 * self.sr)):min(len(self.a), int(t1 * self.sr))]


def runs(mask):
    out, st = [], None
    for i, m in enumerate(list(mask) + [False]):
        if m and st is None:
            st = i
        elif not m and st is not None:
            out.append((st, i - 1))
            st = None
    return out


def cut_sound(a, method, sr, trim_silence):
    """Cut one speech sound out of a whole word. Returns the segment or None."""
    a = trim_silence(a, -45, 0.0)
    if method == 'whole':
        return a
    s = Signal(a, sr)
    peak = s.db.max()
    if method in ('frication', 'stop'):
        r = [x for x in runs(s.hi > 0.4) if x[1] - x[0] >= 2]
        if not r:
            return None
        st, en = r[0]
        return s.cut(s.t(st) - 0.01, s.t(en) + 0.015 + (0.025 if method == 'stop' else 0))
    if method == 'voiced-stop':
        burst = next((i for i, d in enumerate(s.db) if d > peak - 25), 0)
        t0 = max(0.0, s.t(burst) - 0.01)
        return s.cut(t0, t0 + 0.08)
    if method.startswith('initial-weak'):
        drop = 4 if method.endswith('-4') else 6
        end = next((i for i in range(4, len(s.db)) if s.db[i] > peak - drop), None)
        return s.cut(0, s.t(end) - 0.005) if end else None
    if method == 'initial-nasal':
        end = next((i for i in range(4, len(s.lo)) if s.lo[i] < 0.8), None)
        return s.cut(0, s.t(end) - 0.005) if end else None
    if method == 'initial-voiced-fricative':
        r = runs(s.hi > 0.25)
        return s.cut(0, s.t(r[0][1]) + 0.01) if r else None
    vr = runs(s.voiced)
    if method == 'vowel':
        if not vr:
            return None
        st, en = max(vr, key=lambda x: x[1] - x[0])
        return s.cut(s.t(st) + 0.01, s.t(en) - 0.015)
    if method == 'glide':
        on = s.t(vr[0][0]) if vr else 0.0
        return s.cut(0, on + 0.11)
    if method == 'final':  # start a little after the voicing ends, so none of the vowel comes along
        return s.cut(s.t(vr[-1][1]) + 0.03, len(a) / sr) if vr else None
    if method == 'final-drop':
        top = int(np.argmax(s.db))
        drop = next((i for i in range(top, len(s.db)) if s.db[i] < peak - 6), None)
        return s.cut(s.t(drop), len(a) / sr) if drop else None
    raise ValueError(method)


def consonant_ok(ph, seg, sr):
    rule = CHECKS.get(ph, {})
    s = Signal(seg, sr)
    voiced = float(s.voiced.mean()) if len(s.voiced) else 0.0
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    centroid = float((spec * np.fft.rfftfreq(len(seg), 1 / sr)).sum() / (spec.sum() + 1e-12))
    return not (('voiced_max' in rule and voiced > rule['voiced_max'])
                or ('voiced_min' in rule and voiced < rule['voiced_min'])
                or ('centroid_min' in rule and centroid < rule['centroid_min'])
                or ('centroid_max' in rule and centroid > rule['centroid_max']))


def loose_ok(word, heard, heard_ok):
    """Glued sounds: also accept a doubled last letter or an added final vowel ("mapp", "zippa")."""
    if heard_ok(word, heard, True):
        return True
    got = re.sub(r"[^a-z ]", '', heard.lower()).split()
    if len(got) != 1:
        return False
    g = re.sub(r'(.)\1+', r'\1', re.sub(r'[aeo]$', '', got[0]))
    return g == re.sub(r'(.)\1+', r'\1', word)


def sound_heard(word, parts, ph, heard, words_of):
    """Was the sound ph heard right, even if another sound in the word was not?
    "bus" heard as "thus" still has the right vowel; "rat" heard as "not" has the wrong r."""
    got = words_of(heard)  # no fillers dropped: "a fish" means a vowel crept into the cut
    seg = wordparts.segment(word, ''.join(parts))
    if len(got) != 1 or not seg or ph not in parts:
        return False
    h, k = got[0], parts.index(ph)
    spellings = wordparts.SPELLINGS.get(ph, [])
    plain = [sp for sp in spellings if '_' not in sp]
    if ph in SHORT_VOWELS:  # short vowels are confused with each other: the heard word must spell it the same way
        return seg[k][0] in h
    if ph in VOWELS:
        return (any(sp in h for sp in plain)
                or any(re.search(sp[0] + '[^aeiou]{1,2}e$', h) for sp in spellings if '_' in sp))
    if k == 0:
        return any(h.startswith(sp) for sp in plain)
    if k == len(parts) - 1:
        return any(h.rstrip('e').endswith(sp) or h.endswith(sp) for sp in plain)
    return any(sp in h[1:] for sp in plain)


def build(g, synth, checker, needed, voices, blend_words=BLEND_WORDS, log=print):
    """Pick the best cut for each needed sound. g: the generate module (signal helpers).
    Returns ({sound: audio}, report)."""
    sr = g.SR
    candidates = {}
    for ph in needed:
        candidates[ph] = []
        # Consonants carry little of the speaker's voice, so other voices may supply them (the female
        # voices' /f/ is partly voiced); vowels use the main voice.
        for voice in (voices[:1] if ph in VOWELS else voices):
            for src, method in CANDIDATES.get(ph, []):
                seg = cut_sound(synth.say(src, voice), method, sr, g.trim_silence)
                if seg is None or len(seg) < sr * 0.04:
                    continue
                if ph not in VOWELS and not consonant_ok(ph, seg, sr):
                    continue
                if ph in CONTINUANTS and len(seg) < sr * 0.3:
                    seg = g.ffmpeg(seg, ['-filter:a', f'atempo={max(0.5, len(seg) / (sr * 0.3)):.3f}'])
                level = LOUDNESS['weak' if ph in WEAK else 'hiss' if ph in HISS else 'other']
                candidates[ph].append({'src': f'{voice}:{src}:{method}', 'audio': g.normalise(g.fade(seg, 0.008, 0.02), level)})
    current = {ph: c[0] for ph, c in candidates.items() if c}
    gap = np.zeros(int(sr * 0.012), dtype=np.float32)
    cache = {}

    def heard(word, parts, choice):
        key = (word,) + tuple(choice[p]['src'] for p in parts)
        if key not in cache:
            cache[key] = checker.text(np.concatenate([x for p in parts for x in (choice[p]['audio'], gap)]))
        return cache[key]

    def score(ph, choice, trusted=None):
        tests = [(w, parts) for w, parts in blend_words.items() if ph in parts and all(p in choice for p in parts)]
        if trusted is not None:  # only words whose other sounds already passed, if there are enough
            clean = [(w, parts) for w, parts in tests if all(p == ph or p in trusted for p in parts)]
            tests = clean if len(clean) >= 2 else tests
        tests = tests[:8]
        if not tests:
            return 0.0, []
        results = [(w, heard(w, parts, choice)) for w, parts in tests]
        ok = [loose_ok(w, h, g.heard_ok) or sound_heard(w, parts, ph, h, g.words_of)
              for (w, h), (_, parts) in zip(results, tests)]
        return sum(ok) / len(ok), [f"{w}: {h}{'' if k else ' ✗'}" for (w, h), k in zip(results, ok)]

    for _ in range(2):  # coordinate ascent: each sound's best cut, given the others
        for ph, cands in candidates.items():
            best, best_score = current.get(ph), -1
            for cand in cands:
                s, _ = score(ph, dict(current, **{ph: cand}))
                if s > best_score:
                    best, best_score = cand, s
            if best:
                current[ph] = best
    # Sounds that pass on all their test words are trusted; a failing sound is then tried again,
    # choosing its cut, on words made only of trusted sounds (so another bad sound cannot sink it).
    passes = lambda ph, sc: sc >= PASS_SCORE['vowel' if ph in VOWELS else 'consonant']
    trusted = {ph for ph in current if passes(ph, score(ph, current)[0])}
    for _ in range(3):
        for ph in [p for p in current if p not in trusted]:
            best, best_score = current[ph], -1
            for cand in candidates[ph]:
                sc, _ = score(ph, dict(current, **{ph: cand}), trusted)
                if sc > best_score:
                    best, best_score = cand, sc
            current[ph] = best
            if passes(ph, best_score):
                trusted.add(ph)
    sounds, report = {}, {}
    for ph in needed:
        if ph not in current:
            report[ph] = {'accepted': False, 'reason': 'no usable cut'}
            log(f'sound {ph:3s} --  no usable cut')
            continue
        s, detail = score(ph, current, trusted - {ph})
        accepted = passes(ph, s)
        if not accepted and ph in SAID_AS:
            # A vowel team or r-vowel said whole ("oh", "ar") is how phonics says it: accept it if heard as that.
            for cand in candidates[ph]:
                if cand['src'].endswith(':whole'):
                    heard_as = checker.text(cand['audio'])
                    got = [w.strip('.,!?"\'') for w in heard_as.lower().split()]
                    if len(got) == 1 and got[0] in SAID_AS[ph]:
                        current[ph], accepted = cand, True
                        detail.append(f'said whole, heard as "{heard_as}"')
                        break
                    detail.append(f'said whole, heard as "{heard_as}" ✗')
        report[ph] = {'accepted': accepted, 'score': round(s, 2), 'source': current[ph]['src'], 'tests': detail}
        log(f"sound {ph:3s} {'OK' if accepted else 'NO'}  {s:.2f}  {current[ph]['src']}  {'; '.join(detail)}")
        if accepted:
            sounds[ph] = current[ph]['audio']
    return sounds, report
