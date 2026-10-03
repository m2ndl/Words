# Recorded audio

The app plays a recorded clip for every word or sentence listed in `manifest.json`, and uses the
device's text-to-speech for anything else.

```json
{
  "version": 2,
  "clips": {
    "cat": { "f": "f/w/cat.mp3?v=3f2a91c0d4" },
    "not": { "f": "f/w/not.mp3?v=8b1e04a7c2", "m": "m/w/not.mp3?v=51d9e2b6aa" },
    "the bus is hot.": { "f": "f/s/the-bus-is-hot.mp3?v=0c7d3e9f11" }
  }
}
```

- **Keys** are the exact text the app speaks, in lowercase (a word, or a whole sentence).
- **`f`** is the main clip. **`m`** is a second talker for the words in listening items: listening
  items alternate between the two, so learners hear more than one speaker.
- **`?v=`** is a content hash, so browsers fetch a clip again when it changes.

## Generating the clips

`tools/audio/generate.py` makes every clip with **Kokoro-82M** (Apache-2.0), an American-English
voice model, and checks each one with the Whisper speech recogniser.

**Voices.** No single Kokoro voice says every word cleanly on its own. On 64 test words (f/v,
final stops, short-vowel pairs):
- The female voices voice an initial /f/, so *fat* sounds like *vat*.
- af_heart adds a voiced "uh" after a final /p/ (*cup* sounds like *cup-uh*).
- am_adam has the clearest /f/.

So the generator tries the voices in order and keeps the first one Whisper recognises:
- **Main clip:** af_sarah, af_heart, am_michael, am_adam.
- **Second talker:** am_michael, am_adam, am_fenrir, af_heart. This must be a different voice from
  the main clip, and it is only added when that voice is recognised.

If no voice gets a word right as it is, the generator tries saying it in other ways:
- **After a short pause.** This fixes many words (*fix, fish, change, page, trip*), but the model then
  says "uh" first. That vowel is cut off, and the clip must then be heard as the bare word.
- **With a full stop after it.**
- **Slower.**

A voiced "uh" after a final stop is also cut off.

## Sound it out

The 🐢 button plays a word sound by sound while its letters light up, then says the whole word
(*c – a – t … cat*). It appears on the Learn page and in feedback. It also plays by itself:
- after a wrong answer;
- after "ليس بعد" (not yet) in read-aloud items.

How the audio is made:
- **Single sounds.** These are `f/ph/*.mp3`, listed under `sounds` in the manifest.
  - A voice model cannot say a lone consonant, so `tools/audio/sounds.py` cuts each sound out of whole words.
  - Long vowels, vowel teams and r-vowels are also tried said whole (*ay, oh, ar*).
  - A cut is kept only if it passes the **blend test**: gluing the cut sounds back together (*c + a + t*) must
    give simple words the recogniser hears correctly. A failing sound is retested on words whose other sounds
    all passed, so one bad sound cannot sink another.
- **Word parts.** These are listed under `segments` in the manifest and come from `tools/audio/wordparts.py`.
  They show how each word splits into letters and sounds, e.g. `"cake": [["c","k"],["a_e","A"],["k","k"]]`,
  where a_e is a split digraph.
- **Not sounded out:**
  - irregular words that cannot be split with regular spellings (*said, was, come*);
  - one-sound words (*I*);
  - words with an unstressed vowel (*basket*);
  - words with more than six sounds;
  - words with a sound that failed the blend test (see `sounds` in `qa-report.json`).
- **Current status:** all 44 sounds pass, and 732 words can be sounded out (95% of the words the lessons use).
  The rest are by design: unstressed vowels (*seven, buses, basket*), long words, and one-sound words.
- **Hard sounds and how they were solved:**
  - **r** and **v** run into the vowel with no clear boundary, so they are a fixed 120 ms / 110 ms from the
    start of *red* / *van*.
  - **th** on its own sounds like *f* or *s*; listeners tell them apart by the start of the next vowel. The first
    110 ms of *thank* (voice af_nicole, not stretched) is heard as th in 7 of 8 words and contains no vowel.
  - **aw** said alone is unusable in every voice. The steady middle of *saw* (af_heart) is heard as "ah". That is
    the aw of the American accent the course uses, where the short o in *hot* is "ah" too.
  - Single sounds are quieter than words where that is natural (*f, th, v, h*). Raised to vowel loudness, they
    hiss like *s* or *sh*.

Needs Python 3.11, ffmpeg and about 1.7 GB of models (GitHub release assets):

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install kokoro-onnx==0.6.1 misaki==0.9.4 num2words spacy phonemizer-fork espeakng-loader soundfile sherpa-onnx numpy
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
mkdir -p models && cd models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.en.tar.bz2 | tar xj
cd ..
python tools/audio/generate.py --models models --phonemes   # review pronunciations first
python tools/audio/generate.py --models models              # only new or changed clips
```

Re-run it after changing `curriculum.json`; only new or changed clips are made. Fix a wrong
pronunciation in `PHONEME_OVERRIDES` in the script. `tools/audio/qa-report.json` records the voice
used for each clip and what Whisper heard. Main clips that no voice got right are listed under
`flagged`; listen to those. Whisper often mishears isolated short words (*bin* as "Ben"), so a flagged
clip may well be fine.

**Credits and licences:** the speech was generated with Kokoro-82M v1.0 (hexgrad), Apache-2.0,
using the voices named above. Tools: kokoro-onnx (MIT), misaki (Apache-2.0), sherpa-onnx
(Apache-2.0), Whisper (MIT). Only the MP3s are shipped with the app.
