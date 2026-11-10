#!/usr/bin/env python3
"""Gera prévias (folha de quadros) de vários cortes escolhendo momentos úteis:
gancho (1s), 1ª inserção, 1º punch-in (zoom forte) e final. Junta tudo em review/lote_*.jpg.
Uso: python3 scripts/previa_lote.py config/YT01-C02.json [...]"""
import json, subprocess, sys
from pathlib import Path
import cv2, numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import render as r

rows = []
for cp in sys.argv[1:]:
    cfg = r.load_cfg(cp)
    p, tot = r.build_edl(cfg, r.load_words())
    fps = cfg["E"]["saida"]["fps"]
    ts = [1.0]
    ins = cfg.get("insercoes", [])
    if ins:
        o = r.src_to_out(p, fps, (ins[0]["de"] + ins[0]["ate"]) / 2)
        ts.append(o if o is not None else tot * 0.35)
    else:
        ts.append(tot * 0.35)
    punch = [k for k in cfg["camera"] if r.roi_params(k["roi"], cfg["E"])[2] <= 0.7]
    o = r.src_to_out(p, fps, punch[0]["t"] + 0.6) if punch else None
    ts.append(o if o is not None else tot * 0.65)
    ts.append(tot - 0.4)
    subprocess.run([sys.executable, str(ROOT / "scripts/render.py"), cp, "--previa", "--tempos",
                    ",".join(f"{t:.2f}" for t in ts)], check=True, capture_output=True)
    im = cv2.imread(str(ROOT / "review" / f"{cfg['id']}_quadros.jpg"))
    im = cv2.resize(im, (im.shape[1] // 2, im.shape[0] // 2), interpolation=cv2.INTER_AREA)
    cv2.putText(im, cfg["id"], (8, 40), 0, 1.2, (0, 0, 255), 3)
    rows.append(im)
    print(cfg["id"], f"{tot:.1f}s", [round(t, 1) for t in ts], flush=True)
for i in range(0, len(rows), 4):
    cv2.imwrite(str(ROOT / "review" / f"lote_{i // 4 + 1}.jpg"), np.vstack(rows[i:i + 4]), [cv2.IMWRITE_JPEG_QUALITY, 85])
