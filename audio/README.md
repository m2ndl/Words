# Recorded audio (optional)

The app speaks words with the device's text-to-speech unless a recording is listed here.
To use recordings, put the files in this folder and list them in `manifest.json`:

```json
{
  "cat": "cat.mp3",
  "the bus is hot.": "s-the-bus-is-hot.mp3"
}
```

Keys are the exact text the app speaks, in lowercase (a word, or a whole sentence).
Use one speaker and one accent (the app uses US English), and record every word in a
quiet room at a natural speed. Any word without a file still uses text-to-speech.
