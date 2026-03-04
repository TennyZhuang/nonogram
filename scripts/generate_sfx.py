#!/usr/bin/env python3.12
"""Generate original UI sound effects for the web app.

Outputs:
  public/sounds/click.wav
  public/sounds/success.wav
  public/sounds/error.wav
"""

from __future__ import annotations

import wave
from pathlib import Path

import numpy as np

SAMPLE_RATE = 44_100
RNG = np.random.default_rng(20260304)


def _fade(signal: np.ndarray, attack_ms: float, release_ms: float) -> np.ndarray:
    out = signal.copy()
    attack = max(1, int(SAMPLE_RATE * attack_ms / 1000))
    release = max(1, int(SAMPLE_RATE * release_ms / 1000))

    out[:attack] *= np.linspace(0.0, 1.0, attack, endpoint=True)
    out[-release:] *= np.linspace(1.0, 0.0, release, endpoint=True)
    return out


def _finalize(signal: np.ndarray, peak: float = 0.88) -> np.ndarray:
    # Gentle saturation keeps transient peaks from sounding brittle.
    softened = np.tanh(signal * 1.2)
    max_amp = float(np.max(np.abs(softened)))
    if max_amp > 1e-8:
        softened = softened * (peak / max_amp)
    return np.clip(softened, -1.0, 1.0)


def _write_wav(path: Path, signal: np.ndarray) -> None:
    pcm = (signal * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(pcm.tobytes())


def synth_click() -> np.ndarray:
    duration = 0.09
    n = int(SAMPLE_RATE * duration)
    t = np.arange(n, dtype=np.float64) / SAMPLE_RATE

    sweep_hz = np.linspace(2300.0, 1150.0, n)
    phase = 2 * np.pi * np.cumsum(sweep_hz) / SAMPLE_RATE
    tone = 0.82 * np.sin(phase) + 0.26 * np.sin(phase * 2.07)

    noise = RNG.normal(0.0, 1.0, n)
    noise = noise - np.convolve(noise, np.ones(7) / 7.0, mode="same")

    body = 0.22 * np.sin(2 * np.pi * 620.0 * t)
    env = np.exp(-t * 42.0)
    click = (0.83 * tone + 0.12 * noise + body) * env
    click = _fade(click, attack_ms=1.0, release_ms=10.0)
    return _finalize(click, peak=0.84)


def _tone(freq: float, seconds: float, decay: float) -> np.ndarray:
    n = int(SAMPLE_RATE * seconds)
    t = np.arange(n, dtype=np.float64) / SAMPLE_RATE
    phase = 2 * np.pi * freq * t
    harmonic = np.sin(phase) + 0.33 * np.sin(phase * 2.0) + 0.1 * np.sin(phase * 3.0)
    env = np.exp(-t * decay)
    note = harmonic * env
    return _fade(note, attack_ms=2.0, release_ms=22.0)


def synth_success() -> np.ndarray:
    duration = 0.64
    n = int(SAMPLE_RATE * duration)
    signal = np.zeros(n, dtype=np.float64)

    notes = [
        (0.00, 659.25, 0.14, 10.5),  # E5
        (0.09, 830.61, 0.14, 10.0),  # G#5
        (0.18, 987.77, 0.17, 9.0),   # B5
        (0.30, 1318.51, 0.24, 7.2),  # E6
    ]

    for start_s, freq, length_s, decay in notes:
        start = int(start_s * SAMPLE_RATE)
        note = _tone(freq, length_s, decay)
        end = min(n, start + len(note))
        signal[start:end] += note[: end - start]

    for delay_s, gain in ((0.075, 0.24), (0.135, 0.14)):
        delay = int(delay_s * SAMPLE_RATE)
        echo = np.zeros_like(signal)
        echo[delay:] = signal[:-delay] * gain
        signal += echo

    return _finalize(signal, peak=0.86)


def synth_error() -> np.ndarray:
    duration = 0.36
    n = int(SAMPLE_RATE * duration)
    t = np.arange(n, dtype=np.float64) / SAMPLE_RATE

    glide_hz = np.linspace(430.0, 170.0, n)
    phase = 2 * np.pi * np.cumsum(glide_hz) / SAMPLE_RATE
    base = np.sin(phase)
    rough = 0.32 * np.sin(phase * 1.95 + 0.8) + 0.12 * np.sign(np.sin(phase * 0.74))
    signal = base + rough

    second_start = int(0.16 * SAMPLE_RATE)
    second_len = int(0.11 * SAMPLE_RATE)
    t2 = np.arange(second_len, dtype=np.float64) / SAMPLE_RATE
    second_hz = np.linspace(290.0, 180.0, second_len)
    phase2 = 2 * np.pi * np.cumsum(second_hz) / SAMPLE_RATE
    second = np.sin(phase2) * np.exp(-t2 * 12.0)
    signal[second_start:second_start + second_len] += 0.56 * second

    env = np.exp(-t * 7.8)
    signal *= env
    signal = _fade(signal, attack_ms=2.0, release_ms=34.0)
    return _finalize(signal, peak=0.85)


def main() -> None:
    out_dir = Path("public/sounds")
    out_dir.mkdir(parents=True, exist_ok=True)

    assets = {
        "click.wav": synth_click(),
        "success.wav": synth_success(),
        "error.wav": synth_error(),
    }
    for name, signal in assets.items():
        _write_wav(out_dir / name, signal)

    print("Generated:", ", ".join(sorted(assets)))


if __name__ == "__main__":
    main()
