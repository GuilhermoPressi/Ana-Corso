#!/usr/bin/env python3
"""Ferramenta de revisão: extrai um quadro 4K e desenha grade com coordenadas da fonte.
Uso: python3 scripts/grade.py brutos/YT01.mp4 <t> <saida.jpg> [x0 y0 x1 y1]"""
import subprocess, sys, cv2, numpy as np
src, t, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
x0, y0, x1, y1 = map(int, sys.argv[4:8]) if len(sys.argv) >= 8 else (0, 0, 3840, 2160)
raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", src, "-frames:v", "1", "-f", "rawvideo",
                      "-pix_fmt", "bgr24", "-"], capture_output=True, check=True).stdout
im = np.frombuffer(raw, np.uint8).reshape(2160, 3840, 3)[y0:y1, x0:x1].copy()
step = 100 if (x1 - x0) < 1600 else 200
for x in range((x0 // step + 1) * step, x1, step):
    cv2.line(im, (x - x0, 0), (x - x0, y1 - y0), (0, 0, 255), 1)
    cv2.putText(im, str(x), (x - x0 + 3, 30), 0, 0.9, (0, 0, 255), 2)
for y in range((y0 // step + 1) * step, y1, step):
    cv2.line(im, (0, y - y0), (x1 - x0, y - y0), (255, 0, 0), 1)
    cv2.putText(im, str(y), (3, y - y0 - 4), 0, 0.9, (255, 0, 0), 2)
s = min(1.0, 1900 / (x1 - x0))
cv2.imwrite(out, cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA))
