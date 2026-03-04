# Sound Effects

This directory should contain the following sound effect files:

- `click.wav` / `click.mp3` - Sound played when clicking a cell
- `success.wav` / `success.mp3` - Sound played when completing a puzzle
- `error.wav` / `error.mp3` - Sound played when making a mistake

`useSound` prefers `.wav` and falls back to `.mp3` when needed.

## Regenerate Original Assets

Run:

```bash
python3.12 scripts/generate_sfx.py
```

The generator creates original one-shot UI sounds that are safe to use in this project.

## Replace With External Assets

You can still replace with your own files and keep the same names. Free sources:

- https://freesound.org/
- https://mixkit.co/free-sound-effects/
- https://www.zapsplat.com/

## Format

- Format: WAV preferred, MP3 fallback
- Duration: Short (< 1 second recommended)
- Volume: Normalized
