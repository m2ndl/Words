# Recorded audio

The app plays a recorded clip for every word or sentence listed in `manifest.json`, and uses the
device's text-to-speech for anything else.

```json
{
  "version": 2,
  "voices": { "f": "af_heart", "m": "am_michael" },
  "clips": {
    "cat": { "f": "f/w/cat.mp3?v=3f2a91c0d4" },
    "not": { "f": "f/w/not.mp3?v=8b1e04a7c2", "m": "m/w/not.mp3?v=51d9e2b6aa" },
    "the bus is hot.": { "f": "f/s/the-bus-is-hot.mp3?v=0c7d3e9f11" }
  }
}
```

- **Keys** are the exact text the app speaks, in lowercase (a word, or a whole sentence).
- **Voices:** `f` is the main voice. Listening items alternate between all the voices a word has,
  so learners hear more than one speaker.
- **`?v=`** is a content hash, so browsers fetch a clip again when it changes.

## Generating the clips

`tools/audio/generate.py` makes every clip with **Kokoro-82M** (Apache-2.0), an American-English
voice model, and transcribes each one with Whisper so odd clips can be found and listened to.
The same method was used on the literacy app.

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

Re-run it after changing `curriculum.json`. Fix a wrong pronunciation in `PHONEME_OVERRIDES`
in the script. The clips Whisper did not recognise are listed under `flagged` in
`tools/audio/qa-report.json`; listen to those before committing.

**Licences:** kokoro-onnx (MIT), the Kokoro model and voices (Apache-2.0), misaki (Apache-2.0),
sherpa-onnx (Apache-2.0), Whisper (MIT). None of these are shipped with the app; only the MP3s are.

**Status:** no clips have been generated yet, so the app still uses text-to-speech everywhere.
