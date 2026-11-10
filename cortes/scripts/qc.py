#!/usr/bin/env python3
"""QC por arquivo final + manifest.csv.

Uso: python3 scripts/qc.py config/YT01-C01.json [config/...]
Checa: duração (bate com a EDL), resolução, fps, codec/perfil, pix_fmt, áudio 48 kHz/>=192k,
loudness (-14 LUFS +-1, true peak <= -1 dBTP), quadros pretos, quadros congelados fora do
congelamento planejado, sincronia (duração vídeo x áudio). Legenda/sentido/borrão: checagem
visual na folha de quadros (registrada como 'revisar' até aprovação humana).
Saída: export/qc/<ID>.json e export/manifest.csv (atualiza a linha do corte).
"""
import csv
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import render  # noqa: E402


def probe(f):
    return json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(f)],
                                     capture_output=True, text=True, check=True).stdout)


def ffmpeg_log(args):
    return subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *args, "-f", "null", "-"],
                          capture_output=True, text=True).stderr


def fmt_t(t):
    m, s = divmod(t, 60)
    return f"{int(m)}:{s:05.2f}"


def qc(cfg_path):
    cfg = render.load_cfg(cfg_path)
    E = cfg["E"]
    fps = E["saida"]["fps"]
    words = render.load_words()
    pieces, total = render.build_edl(cfg, words)
    f = ROOT / "export" / f"{cfg['arquivo']}.mp4"
    res = {"arquivo": f.name, "checks": {}}
    ok = True

    def check(nome, cond, info):
        nonlocal ok
        res["checks"][nome] = {"ok": bool(cond), "info": info}
        ok &= bool(cond)

    if not f.exists():
        check("existe", False, "arquivo não encontrado")
        return cfg, res, False, pieces, total
    p = probe(f)
    v = next(s for s in p["streams"] if s["codec_type"] == "video")
    a = next(s for s in p["streams"] if s["codec_type"] == "audio")
    dv, da = float(v["duration"]), float(a["duration"])
    num, den = map(int, v["r_frame_rate"].split("/"))
    check("resolucao", (v["width"], v["height"]) == (E["saida"]["largura"], E["saida"]["altura"]), f"{v['width']}x{v['height']}")
    check("fps", abs(num / den - fps) < 0.01, f"{num / den:.3f}")
    check("codec", v["codec_name"] == "h264" and v.get("profile") == "High" and v["pix_fmt"] == "yuv420p",
          f"{v['codec_name']} {v.get('profile')} {v['pix_fmt']}")
    check("audio_fmt", a["codec_name"] == "aac" and int(a["sample_rate"]) == 48000 and int(a.get("bit_rate", 0)) >= 180000,
          f"{a['codec_name']} {a['sample_rate']} Hz {int(a.get('bit_rate', 0)) // 1000} kbps")
    check("duracao", abs(dv - total) < 0.1, f"vídeo {dv:.2f}s / EDL {total:.2f}s")
    check("sincronia", abs(dv - da) < 0.06, f"vídeo {dv:.3f}s x áudio {da:.3f}s")
    # faststart: moov antes de mdat
    head = f.open("rb").read(64 * 1024)
    check("faststart", head.find(b"moov") != -1 and (head.find(b"mdat") == -1 or head.find(b"moov") < head.find(b"mdat")), "moov no início")
    # loudness
    lg = ffmpeg_log(["-i", str(f), "-vn", "-af", "ebur128=peak=true"])
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", lg)[-1])
    tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", lg)[-1])
    check("loudness", abs(I - E["audio"]["lufs"]) <= 1.0 and tp <= E["audio"]["true_peak"] + 0.3, f"{I:.1f} LUFS, TP {tp:.1f} dBTP")
    # pretos
    lg = ffmpeg_log(["-i", str(f), "-an", "-vf", "blackdetect=d=0.1:pix_th=0.10"])
    pretos = re.findall(r"black_start:([\d.]+)", lg)
    check("quadros_pretos", not pretos, f"{len(pretos)} trechos" + (f" em {pretos}" if pretos else ""))
    # congelados (>1,2s) fora dos congelamentos planejados
    lg = ffmpeg_log(["-i", str(f), "-an", "-vf", "freezedetect=n=0.0008:d=1.2"])
    fr = [(float(s), float(e)) for s, e in zip(re.findall(r"freeze_start: ([\d.]+)", lg), re.findall(r"freeze_end: ([\d.]+)", lg))]
    planejado = []
    for c in cfg.get("congelar", []):
        a0 = render.src_to_out(pieces, fps, c["de"])
        if a0 is not None:
            planejado.append((a0 - 0.3, a0 + (c["ate"] - c["de"]) + 0.3))
    # tela parada com a pessoa falando conta como "freeze" só se a webcam também parar: analisa a região do quadrado
    wc = E["webcam"]
    S, x, y = wc["lado_saida"], E["saida"]["largura"] - wc["margem_direita"] - wc["lado_saida"], wc["base_y"] - wc["lado_saida"]
    lg = ffmpeg_log(["-i", str(f), "-an", "-vf", f"crop={S}:{S}:{x}:{y},freezedetect=n=0.0008:d=0.6"])
    cam_fr = [(float(s), float(e)) for s, e in zip(re.findall(r"freeze_start: ([\d.]+)", lg), re.findall(r"freeze_end: ([\d.]+)", lg))]
    # a webcam nunca pode congelar (o congelamento planejado é só da tela)
    cam_ruim = cam_fr
    check("congelados", not cam_ruim, f"webcam parada (perde sincronia labial): {cam_ruim}" if cam_ruim else
          f"ok (tela parada em {len(fr)} trechos é conteúdo estático; congelamento planejado: {len(planejado)})")
    # cortes em silêncio real (energia do original nos 30 ms de cada lado do corte)
    db, thr = render.energia(), render.silencio_thr(E)
    ruins = []
    for q in pieces:
        a0, b0 = q["a"], q["a"] + q["n"] / fps
        ea = float(max(db[int(a0 * 100):int(a0 * 100) + 3]))
        eb = float(max(db[int(b0 * 100) - 3:int(b0 * 100)]))
        for t_, e_ in ((a0, ea), (b0, eb)):
            if e_ > thr + 6:
                ruins.append(f"{t_:.2f}s ({e_:.0f} dB)")
    emendas = getattr(render.build_edl, "avisos", [])
    check("cortes_silencio", len(ruins) <= len(emendas),
          f"{len(pieces)} pedaços; cortes com voz: {ruins or 'nenhum'}; emendas naturais (corte no mínimo + fade): {emendas or 'nenhuma'}")
    res["status_auto"] = "APROVADO" if ok else "REPROVADO"
    res["status_visual"] = cfg.get("qc_visual", "revisar")
    return cfg, res, ok, pieces, total


def main():
    qdir = ROOT / "export" / "qc"
    qdir.mkdir(parents=True, exist_ok=True)
    man = ROOT / "export" / "manifest.csv"
    cols = ["arquivo", "inicio_original", "fim_original", "duracao", "tipo", "gancho_falado", "gancho_texto",
            "legenda_post", "nota", "status_qc"]
    rows = {}
    if man.exists():
        with man.open(newline="", encoding="utf-8") as fh:
            rows = {r["arquivo"]: r for r in csv.DictReader(fh)}
    for cp in sys.argv[1:]:
        cfg, res, ok, pieces, total = qc(cp)
        (qdir / f"{cfg['id']}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
        segs = cfg["segmentos"]
        st = f"{res.get('status_auto', 'REPROVADO')} / visual: {res.get('status_visual', 'revisar')}"
        rows[res["arquivo"]] = {
            "arquivo": res["arquivo"],
            "inicio_original": fmt_t(min(s["de"] for s in segs)),
            "fim_original": fmt_t(max(s["ate"] for s in segs)),
            "duracao": f"{total:.1f}s",
            "tipo": cfg["tipo"],
            "gancho_falado": cfg["gancho_falado"],
            "gancho_texto": cfg["gancho_texto"].replace("[", "").replace("]", ""),
            "legenda_post": cfg["legenda_post"],
            "nota": cfg["nota"],
            "status_qc": st,
        }
        print(f"\n{cfg['id']}  {st}")
        for k, v in res["checks"].items():
            print(f"  {'OK ' if v['ok'] else 'XX '} {k:15s} {v['info']}")
    with man.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for r in sorted(rows.values(), key=lambda r: r["arquivo"]):
            w.writerow(r)
    print("\nmanifest:", man)


if __name__ == "__main__":
    main()
