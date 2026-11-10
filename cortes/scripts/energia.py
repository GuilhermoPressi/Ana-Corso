#!/usr/bin/env python3
"""Envelope de energia do áudio (dBFS a cada 10 ms) usado para cortar só no silêncio real.
Uso: python3 scripts/energia.py brutos/YT01.mp4   ->  trabalho/energia_10ms.npy"""
import subprocess, sys, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
src = sys.argv[1]
wav = ROOT / "trabalho" / "audio" / f"{Path(src).stem}_16k.wav"
if not wav.exists():
    wav.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", str(wav)], check=True)
w = wave.open(str(wav))
a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
hop = 160
n = len(a) // hop
db = 20 * np.log10(np.sqrt((a[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
np.save(ROOT / "trabalho" / "energia_10ms.npy", db.astype(np.float32))
print(f"{n} quadros de 10 ms; piso (p10) {np.percentile(db, 10):.1f} dBFS")
