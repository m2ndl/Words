"""Split a word into its letter groups and their sounds, for the "sound it out" button.

    segment('ship', 'ʃˈɪp')   -> [('sh', 'ʃ'), ('i', 'ɪ'), ('p', 'p')]
    segment('cake', 'kˈAk')   -> [('c', 'k'), ('a_e', 'A'), ('k', 'k')]    split digraph: a…e
    segment('night', 'nˈIt')  -> [('n', 'n'), ('igh', 'I'), ('t', 't')]

Each part is (letters, sound). letters uses '_' for a split digraph; the app highlights those
letters while the sound plays. Sounds are misaki US phonemes, with r-vowels (ɑɹ), x (ks), qu (kw)
and the "you" sound (ju) kept as one sound, as phonics teaches them.
Returns None when the word cannot be split with the spellings below (it then has no sound-it-out).
"""
import re

# sound -> spellings (most common first). A spelling's index is its cost, so common ones win.
SPELLINGS = {
    'p': ['p', 'pp'], 'b': ['b', 'bb'], 't': ['t', 'tt', 'ed'], 'd': ['d', 'dd', 'ed'],
    'k': ['c', 'k', 'ck', 'ch'], 'ɡ': ['g', 'gg', 'gu'], 'f': ['f', 'ff', 'ph'], 'v': ['v', 've'],
    'θ': ['th'], 'ð': ['th'], 's': ['s', 'ss', 'c', 'ce', 'se'], 'z': ['s', 'z', 'zz', 'se', 'ze', 'es'],
    'ʃ': ['sh', 'ch'], 'ʧ': ['ch', 'tch'], 'ʤ': ['j', 'g', 'ge', 'dge'],
    'm': ['m', 'mm', 'mb'], 'n': ['n', 'nn', 'kn'], 'ŋ': ['ng', 'n'], 'l': ['l', 'll', 'le'],
    'ɹ': ['r', 'rr', 'wr'], 'w': ['w', 'wh'], 'j': ['y'], 'h': ['h', 'wh'],
    'ks': ['x'], 'kw': ['qu'],
    'æ': ['a'], 'ɛ': ['e', 'ea'], 'ɪ': ['i', 'y'], 'ɑ': ['o', 'a'], 'ʌ': ['u', 'o'], 'ʊ': ['oo', 'u', 'ou'],
    'A': ['a_e', 'ai', 'ay', 'a', 'eigh', 'ea'], 'I': ['i_e', 'igh', 'y', 'ie', 'i', 'y_e'],
    'O': ['o_e', 'oa', 'ow', 'o', 'oe'], 'i': ['ee', 'ea', 'e', 'y', 'e_e', 'ie', 'ey'],
    'u': ['oo', 'ew', 'u_e', 'ue', 'u', 'o'], 'ju': ['u_e', 'ew', 'u', 'ue'],
    'W': ['ou', 'ow'], 'Y': ['oi', 'oy'], 'ɔ': ['aw', 'au', 'a', 'al'],
    'ɑɹ': ['ar'], 'ɔɹ': ['or', 'ore', 'oor', 'our', 'oar'], 'ɜɹ': ['er', 'ir', 'ur', 'or', 'ear'],
    'ɛɹ': ['air', 'are', 'ear', 'ere'], 'ɪɹ': ['ear', 'eer', 'ere'],
}
# Two phonemes taught as one sound.
JOINED = {('k', 's'): 'ks', ('k', 'w'): 'kw', ('j', 'u'): 'ju', ('ɑ', 'ɹ'): 'ɑɹ', ('ɔ', 'ɹ'): 'ɔɹ',
          ('ɜ', 'ɹ'): 'ɜɹ', ('ɛ', 'ɹ'): 'ɛɹ', ('ɪ', 'ɹ'): 'ɪɹ'}
# Reduced vowels (as in the second part of "basket"): a word with one is not sounded out letter by letter.
REDUCED = set('əɐᵻᵊ')
MAX_SOUNDS = 6


def phoneme_list(phonemes):
    """'kˈAk' -> ['k', 'A', 'k'] (stress marks dropped; flapped T is a t)."""
    ph = re.sub('[ˈˌ.?!, ]', '', phonemes).replace('T', 't').replace('ʤ', 'ʤ')
    return list(ph)


def segment(word, phonemes):
    word = word.lower()
    ph = phoneme_list(phonemes)
    if not ph or any(p in REDUCED for p in ph) or not re.fullmatch('[a-z]+', word):
        return None
    n, m = len(word), len(ph)
    INF = float('inf')
    # State: (letters used, phonemes used, split digraph used). Once a split digraph (a_e) is used,
    # the final e belongs to it, so the other spellings must stop before it.
    best = {(0, 0, False): (0, None)}

    def relax(state, cost, back):
        if cost < best.get(state, (INF,))[0]:
            best[state] = (cost, back)

    for i in range(n + 1):
        for j in range(m + 1):
            for split in (False, True):
                if (i, j, split) not in best:
                    continue
                cost = best[(i, j, split)][0]
                limit = n - 1 if split else n
                options = [(ph[j], 1)] if j < m else []
                if j + 1 < m and (ph[j], ph[j + 1]) in JOINED:  # two phonemes taught as one sound
                    options.append((JOINED[(ph[j], ph[j + 1])], 2))
                for sound, used in options:
                    for rank, spelling in enumerate(SPELLINGS.get(sound, [])):
                        if '_' in spelling:  # split digraph: vowel, one or two consonants, final e
                            if (not split and i < n and word[i] == spelling[0] and word.endswith('e')
                                    and re.fullmatch('[^aeiou]{1,2}', word[i + 1:n - 1])):
                                relax((i + 1, j + used, True), cost + rank - 2 * (used - 1), (i, j, split, sound, spelling))
                        elif word.startswith(spelling, i) and i + len(spelling) <= limit:
                            # sounds taught as one (ear, ar, x) win over splitting them up
                            relax((i + len(spelling), j + used, split), cost + rank - 2 * (used - 1), (i, j, split, sound, None))
    ends = [k for k in ((n, m, False), (n - 1, m, True)) if k in best]
    if not ends:
        return None
    state = min(ends, key=lambda k: best[k][0])
    parts = []
    while state != (0, 0, False):
        i, j, split, sound, spelling = best[state][1]
        parts.append((spelling or word[i:state[0]], sound))
        state = (i, j, split)
    parts.reverse()
    return parts if len(parts) <= MAX_SOUNDS else None
