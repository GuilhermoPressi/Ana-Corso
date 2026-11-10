#!/usr/bin/env python3
"""Ferramenta de planejamento: folha 2x2 de quadros 4K com grade (a cada 400 px) para escolher ROIs.
Uso: python3 scripts/folha_tela.py brutos/YT01.mp4 <saida.jpg> t1 t2 t3 t4"""
import subprocess, sys, cv2, numpy as np
src, out, ts = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3:7]]
tiles = []
for t in ts:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", src, "-frames:v", "1", "-vf", "scale=1280:720",
                          "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True, check=True).stdout
    im = np.frombuffer(raw, np.uint8).reshape(720, 1280, 3).copy()
    for x in range(400, 3840, 400):
        cv2.line(im, (x // 3, 0), (x // 3, 720), (0, 0, 255), 1)
        cv2.putText(im, str(x), (x // 3 + 2, 14), 0, 0.45, (0, 0, 255), 1)
    for y in range(400, 2160, 400):
        cv2.line(im, (0, y // 3), (1280, y // 3), (255, 0, 0), 1)
        cv2.putText(im, str(y), (2, y // 3 - 3), 0, 0.45, (255, 0, 0), 1)
    cv2.putText(im, f"{t:.1f}s", (560, 40), 0, 1.2, (0, 0, 255), 3)
    tiles.append(im)
cv2.imwrite(out, np.vstack([np.hstack(tiles[:2]), np.hstack(tiles[2:4])]), [cv2.IMWRITE_JPEG_QUALITY, 88])
