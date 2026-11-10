#!/usr/bin/env python3
"""Etapa 1 - localiza o quadradinho da webcam (PiP) e acompanha mudanças ao longo do vídeo.

Estratégia (1 amostra/s, decodificada em metade da resolução):
 1. YuNet detecta rostos no quadro inteiro.
 2. A caixa candidata do PiP (config abaixo, medida em 4K) é validada pela força das bordas
    retas nos 4 lados (gradiente na linha/coluna da borda vs. vizinhança).
 3. Cada amostra vira um estado:
      pip           - borda presente e rosto dentro da caixa
      pip_sem_rosto - borda presente, sem rosto (saí do quadro / olhei para baixo)
      cheia         - rosto grande (webcam em tela cheia)
      outra_posicao - rosto pequeno fora da caixa (PiP mudou de lugar)
      sem_webcam    - nem borda nem rosto
 4. Amostras consecutivas iguais viram intervalos; ruído de 1 amostra é suavizado.

Uso: python3 scripts/detectar_webcam.py brutos/YT01.mp4 [x y w h]
Saída: trabalho/webcam.json
"""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "trabalho"
STEP = 1.0
SCALE = 2  # decodifica em 1/2 da resolução


def probe(src):
    out = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                     "stream=width,height:format=duration", "-of", "json", src],
                                    check=True, capture_output=True, text=True).stdout)
    st = out["streams"][0]
    return st["width"], st["height"], float(out["format"]["duration"])


def frames(src, w, h):
    cmd = ["ffmpeg", "-v", "error", "-i", src, "-vf", f"fps=1/{STEP},scale={w}:{h}:flags=area",
           "-f", "rawvideo", "-pix_fmt", "bgr24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    size = w * h * 3
    i = 0
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield i * STEP, np.frombuffer(buf, np.uint8).reshape(h, w, 3)
        i += 1
    p.wait()


def border_score(gray, box):
    """Força média das bordas da caixa (lados que não encostam na borda do quadro)."""
    H, W = gray.shape
    x, y, w, h = box
    g = gray.astype(np.int16)
    scores = []
    if x > 2:  # lado esquerdo
        col = np.abs(g[y + 5:y + h - 5, x] - g[y + 5:y + h - 5, x - 2]).mean()
        scores.append(col)
    if y > 2:  # topo
        scores.append(np.abs(g[y, x + 5:x + w - 5] - g[y - 2, x + 5:x + w - 5]).mean())
    if y + h < H - 2:  # base
        yb = y + h
        scores.append(np.abs(g[yb - 1, x + 5:x + w - 5] - g[yb + 1, x + 5:x + w - 5]).mean())
    if x + w < W - 2:
        xr = x + w
        scores.append(np.abs(g[y + 5:y + h - 5, xr - 1] - g[y + 5:y + h - 5, xr + 1]).mean())
    return float(np.median(scores)) if scores else 0.0


def main(src, box4k):
    W, H, dur = probe(src)
    w2, h2 = W // SCALE, H // SCALE
    box = [v // SCALE for v in box4k]
    det = cv2.FaceDetectorYN.create(str(WORK / "models" / "face_detection_yunet_2023mar.onnx"), "", (w2, h2),
                                    score_threshold=0.6)
    samples = []
    for t, fr in frames(src, w2, h2):
        gray = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        bs = border_score(gray, box)
        _, faces = det.detect(fr)
        face = None
        if faces is not None and len(faces):
            f = max(faces, key=lambda r: r[2] * r[3])
            face = [int(v) * SCALE for v in f[:4]]
        borda = bs > 12
        if face:
            fx, fy, fw, fh = face
            cx, cy = fx + fw / 2, fy + fh / 2
            bx, by, bw, bh = box4k
            dentro = bx <= cx <= bx + bw and by <= cy <= by + bh
            if fw * fh > 0.03 * W * H:
                estado = "cheia"
            elif dentro:
                estado = "pip"
            else:
                estado = "outra_posicao"
        else:
            estado = "pip_sem_rosto" if borda else "sem_webcam"
        samples.append({"t": t, "estado": estado, "borda": round(bs, 1), "rosto": face})

    # suaviza ruído de uma amostra isolada
    est = [s["estado"] for s in samples]
    for i in range(1, len(est) - 1):
        if est[i - 1] == est[i + 1] != est[i]:
            est[i] = est[i - 1]
    intervalos = []
    for s, e in zip(samples, est):
        if intervalos and intervalos[-1]["estado"] == e:
            intervalos[-1]["fim"] = min(s["t"] + STEP, dur)
        else:
            intervalos.append({"estado": e, "inicio": s["t"], "fim": min(s["t"] + STEP, dur)})

    contagem = {}
    for e in est:
        contagem[e] = contagem.get(e, 0) + 1
    out = {"fonte": src, "resolucao": [W, H], "passo_s": STEP, "caixa_pip": box4k, "contagem": contagem,
           "intervalos": intervalos, "amostras": samples}
    (WORK / "webcam.json").write_text(json.dumps(out, indent=1))
    print("caixa PiP (x,y,w,h):", box4k, "| amostras por estado:", contagem)
    for iv in intervalos:
        print(f"  {iv['inicio']:7.1f}s - {iv['fim']:7.1f}s  {iv['estado']}")


if __name__ == "__main__":
    b = [int(v) for v in sys.argv[2:6]] if len(sys.argv) >= 6 else [3003, 651, 837, 470]
    main(sys.argv[1], b)
