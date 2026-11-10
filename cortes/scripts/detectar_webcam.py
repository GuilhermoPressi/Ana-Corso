#!/usr/bin/env python3
"""Etapa 1 - localiza o quadradinho da webcam e acompanha mudanças ao longo do vídeo.

Estratégia:
 1. Amostra 1 quadro a cada STEP segundos (decodificado em baixa resolução pelo ffmpeg).
 2. YuNet detecta rostos em cada amostra.
 3. Para cada rosto, procura a borda do retângulo da webcam: a região ao redor do rosto
    cujo conteúdo varia quadro a quadro (vídeo vivo) contra a tela do PC, que é mais estática,
    combinado com bordas retas (Canny + projeções).
 4. Agrupa amostras consecutivas com o mesmo retângulo em intervalos:
    "pip" (quadradinho), "cheia" (rosto grande = tela cheia), "sem_rosto".

Uso: python3 scripts/detectar_webcam.py brutos/YT01_original.mp4
Saída: trabalho/webcam.json e review/webcam_*.jpg
"""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "trabalho"
STEP = 2.0  # segundos entre amostras


def probe(src):
    out = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                     "stream=width,height:format=duration", "-of", "json", src],
                                    check=True, capture_output=True, text=True).stdout)
    st = out["streams"][0]
    return st["width"], st["height"], float(out["format"]["duration"])


def frames(src, w, h, step):
    """Gera (t, frame BGR em resolução cheia) a cada `step` segundos."""
    cmd = ["ffmpeg", "-v", "error", "-i", src, "-vf", f"fps=1/{step}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    size = w * h * 3
    i = 0
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield i * step, np.frombuffer(buf, np.uint8).reshape(h, w, 3)
        i += 1
    p.wait()


def find_box(frame, face, prev_gray):
    """Estima o retângulo da webcam ao redor do rosto usando bordas retas."""
    H, W = frame.shape[:2]
    x, y, fw, fh = face
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 40, 120)
    cx, cy = x + fw / 2, y + fh / 2

    def best_line(proj, lo, hi, prefer):
        lo, hi = max(0, int(lo)), min(len(proj) - 1, int(hi))
        if hi <= lo:
            return prefer
        seg = proj[lo:hi + 1]
        idx = int(np.argmax(seg))
        return lo + idx if seg[idx] > 0.35 * (hi - lo + 1) * 0 + seg.mean() * 3 else prefer

    # Bordas verticais: soma de pixels de borda nas colunas, restrita à faixa vertical do rosto ampliada.
    y0, y1 = int(max(0, y - fh)), int(min(H, y + 2 * fh))
    x0, x1 = int(max(0, x - 2.5 * fw)), int(min(W, x + 3.5 * fw))
    colproj = edges[y0:y1].sum(axis=0) / 255
    rowproj = edges[:, x0:x1].sum(axis=1) / 255
    left = best_line(colproj, x - 2.5 * fw, x - 0.2 * fw, 0)
    right = best_line(colproj, x + fw * 1.2, x + 3.5 * fw, W - 1)
    top = best_line(rowproj, y - 1.5 * fh, y - 0.1 * fh, 0)
    bottom = best_line(rowproj, y + fh * 1.1, y + 3 * fh, H - 1)
    return [int(left), int(top), int(right - left), int(bottom - top)]


def main(src):
    W, H, dur = probe(src)
    det = cv2.FaceDetectorYN.create(str(WORK / "models" / "face_detection_yunet_2023mar.onnx"), "", (W, H),
                                    score_threshold=0.7)
    samples = []
    review = ROOT / "review"
    for t, fr in frames(src, W, H, STEP):
        _, faces = det.detect(fr)
        if faces is None or len(faces) == 0:
            samples.append({"t": t, "estado": "sem_rosto"})
            continue
        f = max(faces, key=lambda r: r[2] * r[3])
        x, y, fw, fh = map(int, f[:4])
        area = fw * fh / (W * H)
        estado = "cheia" if area > 0.04 else "pip"
        box = find_box(fr, (x, y, fw, fh), None) if estado == "pip" else [0, 0, W, H]
        samples.append({"t": t, "estado": estado, "rosto": [x, y, fw, fh], "score": round(float(f[14]), 3),
                        "caixa": box})
        if int(t) % 120 == 0:
            vis = fr.copy()
            cv2.rectangle(vis, (x, y), (x + fw, y + fh), (0, 255, 0), 2)
            bx, by, bw, bh = box
            cv2.rectangle(vis, (bx, by), (bx + bw, by + bh), (0, 0, 255), 3)
            cv2.imwrite(str(review / f"webcam_{int(t):05d}.jpg"), cv2.resize(vis, (W // 2, H // 2)))

    # Caixa dominante do PiP (mediana) e intervalos.
    pips = [s for s in samples if s["estado"] == "pip"]
    dominante = np.median(np.array([s["caixa"] for s in pips]), axis=0).astype(int).tolist() if pips else None

    def rotulo(s):
        if s["estado"] != "pip" or dominante is None:
            return s["estado"]
        cx = s["rosto"][0] + s["rosto"][2] / 2
        cy = s["rosto"][1] + s["rosto"][3] / 2
        bx, by, bw, bh = dominante
        dentro = bx <= cx <= bx + bw and by <= cy <= by + bh
        return "pip" if dentro else "pip_outra_posicao"

    intervalos = []
    for s in samples:
        r = rotulo(s)
        if intervalos and intervalos[-1]["estado"] == r:
            intervalos[-1]["fim"] = s["t"] + STEP
        else:
            intervalos.append({"estado": r, "inicio": s["t"], "fim": s["t"] + STEP})
    for iv in intervalos:
        iv["fim"] = min(iv["fim"], dur)

    out = {"resolucao": [W, H], "passo_s": STEP, "caixa_pip_dominante": dominante, "intervalos": intervalos,
           "amostras": samples}
    (WORK / "webcam.json").write_text(json.dumps(out, indent=1))
    print("caixa PiP dominante (x,y,w,h):", dominante)
    for iv in intervalos:
        print(f"  {iv['inicio']:7.1f}s - {iv['fim']:7.1f}s  {iv['estado']}")


if __name__ == "__main__":
    main(sys.argv[1])
