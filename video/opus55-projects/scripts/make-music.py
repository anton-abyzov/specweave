"""Generate an original ambient music bed (no samples, no licences needed).

Slow pad progression (Am - F - C - G) with soft attack, a gentle pulse and a
low-pass smoothing. Output: assets/bed.wav, 48 kHz stereo.
"""
import sys, wave
import numpy as np

SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 560.0
BAR = 8.0  # seconds per chord

def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)

CHORDS = [
    [45, 57, 60, 64, 69],  # A minor
    [41, 53, 57, 60, 65],  # F major
    [48, 55, 60, 64, 67],  # C major
    [43, 55, 59, 62, 67],  # G major
]

t_total = int(SR * DUR)
out = np.zeros((t_total, 2), dtype=np.float64)
n_bars = int(np.ceil(DUR / BAR)) + 1
seg = int(SR * (BAR + 3.0))  # overlap for crossfade tails
tt = np.arange(seg) / SR
env = np.minimum(tt / 2.5, 1.0) * np.clip((BAR + 3.0 - tt) / 3.0, 0, 1)
rng = np.random.default_rng(7)

for b in range(n_bars):
    start = int(b * BAR * SR)
    if start >= t_total:
        break
    chord = CHORDS[b % len(CHORDS)]
    sig = np.zeros((seg, 2))
    for i, note in enumerate(chord):
        f = midi(note)
        det = 1.0 + (rng.random() - 0.5) * 0.003
        tone = (np.sin(2 * np.pi * f * tt) * 0.6 +
                np.sin(2 * np.pi * f * det * 2 * tt) * 0.15 +
                np.sin(2 * np.pi * f * 0.5 * tt) * (0.25 if i == 0 else 0.0))
        pan = 0.3 + 0.4 * (i / max(len(chord) - 1, 1))
        amp = 0.09 if i else 0.12
        sig[:, 0] += tone * amp * (1 - pan)
        sig[:, 1] += tone * amp * pan
    # soft eighth-note pulse on the root octave
    pulse_f = midi(chord[2])
    gate = (np.sin(2 * np.pi * (1.0 / 0.5) * tt) > 0.6).astype(float)
    gate = np.convolve(gate, np.ones(400) / 400, mode="same")
    pulse = np.sin(2 * np.pi * pulse_f * 2 * tt) * gate * 0.025
    sig[:, 0] += pulse
    sig[:, 1] += pulse
    sig *= env[:, None]
    end = min(start + seg, t_total)
    out[start:end] += sig[: end - start]

# gentle low-pass (moving-average) for warmth
k = np.hanning(48)
k /= k.sum()
for ch in range(2):
    out[:, ch] = np.convolve(out[:, ch], k, mode="same")

fade = int(SR * 4)
out[:fade] *= np.linspace(0, 1, fade)[:, None]
out[-fade:] *= np.linspace(1, 0, fade)[:, None]
out /= np.max(np.abs(out)) + 1e-9
out *= 0.5

pcm = (out * 32767).astype("<i2")
with wave.open("assets/bed.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote assets/bed.wav", DUR, "s")
