#!/usr/bin/env python3
"""Renderizador de cortes verticais a partir de config/<ID>.json + config/_estilo.json.

Uso:
  python3 scripts/render.py config/YT01-C01.json --previa     # folha de quadros-chave em review/
  python3 scripts/render.py config/YT01-C01.json              # render final em export/ + leve em export_leve/

Pipeline (cache em trabalho/cache/<ID>/, refeito só quando a parte da config muda):
  1. EDL: segmentos -> pedaços sem silêncios longos (limites de palavra do whisper)
  2. Áudio: pedaços com crossfade de 20 ms -> loudnorm 2 passagens (-14 LUFS, -1 dBTP)
  3. Legenda/gancho: .ass (Anton) no tempo de saída
  4. Vídeo: decodifica o original 4K, apaga o PiP, borra áreas sensíveis, recorta a ROI com
     câmera suave (ease in-out), compõe a webcam quadrada e o @, e envia para o x264.
"""
import argparse
import hashlib
import json
import math
import re
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "trabalho"
FONTS = ROOT / "assets" / "fonts"
SRC_W, SRC_H = 3840, 2160


# ---------------------------------------------------------------- config
def deep_merge(a, b):
    out = dict(a)
    for k, v in b.items():
        out[k] = deep_merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def load_cfg(path):
    cfg = json.loads(Path(path).read_text())
    est = json.loads((ROOT / "config" / "_estilo.json").read_text())
    cfg["E"] = deep_merge(est, cfg.get("estilo", {}))
    return cfg


def h(obj):
    return hashlib.sha1(json.dumps(obj, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]


# ---------------------------------------------------------------- palavras
def load_words():
    d = json.loads((WORK / "transcricao_revisada.json").read_text())
    raw = [w for s in d["segments"] for w in s["words"]]
    # junta tokens que o whisper separa: "R" "$" -> "R$", "50" "%" -> "50%", "2" ".39" -> "2.39"
    words = []
    for w in raw:
        t = w["w"].strip()
        if not t:
            continue
        if words and re.match(r"^[%$,.]", t) and not t.startswith("..."):
            words[-1] = {**words[-1], "w": words[-1]["w"] + t, "e": w["e"]}
        else:
            words.append(dict(w, w=t))
    return words


# ---------------------------------------------------------------- 1. EDL
def build_edl(cfg, words):
    E = cfg["E"]
    fps = E["saida"]["fps"]
    R = E["ritmo"]
    pieces = []  # cada pedaço: {a, b, seg}
    for si, seg in enumerate(cfg["segmentos"]):
        # "de" = início da 1ª palavra; "ate" = início da última palavra (ela entra inteira)
        ws = [w for w in words if seg["de"] - 0.02 <= w["s"] <= seg["ate"] + 0.02]
        if not ws:
            sys.exit(f"segmento {si} sem palavras")
        # próxima palavra depois do segmento (para não invadir)
        nxt = next((w for w in words if w["s"] > ws[-1]["s"] and w not in ws), None)
        prv = next((w for w in reversed(words) if w["e"] < ws[0]["s"]), None)
        a = ws[0]["s"] - seg.get("pad_antes", R["pad_antes"])
        if prv:
            a = max(a, prv["e"] + 0.02)
        groups = [[ws[0]]]
        for w in ws[1:]:
            if w["s"] - groups[-1][-1]["e"] > R["gap_max"]:
                groups.append([w])
            else:
                groups[-1].append(w)
        for gi, g in enumerate(groups):
            ga = a if gi == 0 else g[0]["s"] - R["pad_antes"]
            last = si == len(cfg["segmentos"]) - 1 and gi == len(groups) - 1
            gb = g[-1]["e"] + (R["cauda_final"] if last else R["pad_depois"])
            limite = (groups[gi + 1][0]["s"] - R["pad_antes"]) if gi + 1 < len(groups) else (nxt["s"] - 0.03 if nxt else gb)
            gb = min(gb, limite)
            n = max(1, round((gb - ga) * fps))
            pieces.append({"a": round(ga, 4), "n": n, "seg": si})
    t = 0
    for p in pieces:
        p["out"] = t
        t += p["n"] / fps
    return pieces, t


def src_to_out(pieces, fps, ts):
    for p in pieces:
        if p["a"] - 1e-3 <= ts < p["a"] + p["n"] / fps:
            return p["out"] + ts - p["a"]
    return None


# ---------------------------------------------------------------- 2. áudio
def build_audio(cfg, pieces, cache, teto_extra=0.0):
    E = cfg["E"]
    A = E["audio"]
    fps = E["saida"]["fps"]
    key = h([pieces, A, round(teto_extra, 2)])
    out = cache / f"audio_{key}.wav"
    if out.exists():
        return out
    sr = A["taxa"]
    xf = int(sr * A["crossfade_ms"] / 1000)
    chunks = []
    for p in pieces:
        dur = p["n"] / fps + xf / sr
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{p['a']:.4f}", "-i", str(ROOT / cfg["fonte"]),
                              "-t", f"{dur:.4f}", "-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).copy()
        need = int(round(p["n"] / fps * sr)) + xf
        x = np.pad(x, (0, max(0, need - len(x))))[:need]
        chunks.append(x)
    # overlap-add com crossfade equal-power de xf amostras
    fade_in = np.sin(np.linspace(0, np.pi / 2, xf)) ** 2
    fade_out = 1 - fade_in
    total = sum(len(c) - xf for c in chunks) + xf
    y = np.zeros(total, np.float32)
    pos = 0
    for i, c in enumerate(chunks):
        c = c.copy()
        if i > 0:
            c[:xf] *= fade_in
        if i < len(chunks) - 1:
            c[-xf:] *= fade_out
        y[pos:pos + len(c)] += c
        pos += len(c) - xf
    pre = cache / f"audio_{key}_pre.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-", str(pre)],
                   input=y.tobytes(), check=True)
    # loudness: ganho exato + limitador de pico (true peak), medido e corrigido em 2 passagens
    def medir(f):
        lg = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(f), "-af", "ebur128=peak=true",
                             "-f", "null", "-"], capture_output=True, text=True).stderr
        return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", lg)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", lg)[-1])
    alvo, tp = A["lufs"], A["true_peak"]
    lim = 10 ** ((tp - 0.5 - teto_extra) / 20)
    ganho = alvo - medir(pre)[0]
    for _ in range(3):
        af = (f"volume={ganho:.2f}dB,aresample=192000,alimiter=limit={lim:.4f}:attack=3:release=60:level=disabled,"
              f"aresample={sr}")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(pre), "-af", af, "-ac", "2", "-c:a", "pcm_f32le",
                        str(out)], check=True)
        i_med, p_med = medir(out)
        if abs(i_med - alvo) <= 0.2:
            break
        ganho += alvo - i_med
    return out


# ---------------------------------------------------------------- 3. legenda / gancho (.ass)
def ass_color(hexrgb):
    r, g, b = hexrgb[0:2], hexrgb[2:4], hexrgb[4:6]
    return f"&H00{b}{g}{r}".upper()


def ass_time(t):
    t = max(0, t)
    cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def norm(w):
    return re.sub(r"[^\wÀ-ÿ%$]", "", w.lower())


def build_ass(cfg, pieces, words, total, cache):
    E = cfg["E"]
    G, L = E["gancho"], E["legenda"]
    fps = E["saida"]["fps"]
    W, H = E["saida"]["largura"], E["saida"]["altura"]
    key = h([pieces, G, L, cfg.get("gancho_texto"), cfg.get("destaques"), cfg.get("legenda_pos")])
    out = cache / f"legenda_{key}.ass"
    if out.exists():
        return out
    dest = {norm(x) for x in cfg.get("destaques", [])}
    hi = ass_color(L["destaque"])
    # palavras no tempo de saída (respeitando a ordem dos pedaços, inclusive gancho reordenado)
    ow = []
    for p in pieces:
        a, b = p["a"], p["a"] + p["n"] / fps
        for w in words:
            if a - 0.01 <= w["s"] < b - 0.03:
                ow.append({"w": w["w"], "s": p["out"] + w["s"] - a, "e": min(p["out"] + w["e"] - a, p["out"] + p["n"] / fps),
                           "seg": p["seg"]})
    blocks = []
    for w in ow:
        cur = blocks[-1] if blocks else None
        txt = " ".join(x["w"] for x in cur) if cur else ""
        if (cur is None or cur[-1]["seg"] != w["seg"] or len(cur) >= L["max_palavras"] or re.search(r"[.,?!;:]$", cur[-1]["w"])
                or w["s"] - cur[-1]["e"] > L["pausa_quebra"] or len(txt) + 1 + len(w["w"]) > L["max_chars"]):
            blocks.append([w])
        else:
            cur.append(w)
    pos_y = cfg.get("legenda_pos", {}).get("base_y", L["base_y"])
    lines = []
    for i, b in enumerate(blocks):
        s = b[0]["s"]
        e = blocks[i + 1][0]["s"] if i + 1 < len(blocks) and blocks[i + 1][0]["s"] - b[-1]["e"] < 0.6 else b[-1]["e"] + 0.2
        e = min(e, total)
        parts = []
        for w in b:
            t = re.sub(r"[.,;:]+$", "", w["w"]).upper()
            if norm(w["w"]) in dest or re.search(r"\d", w["w"]):
                t = f"{{\\c{hi}}}{t}{{\\r}}"
            parts.append(t)
        anim = r"{\fscx88\fscy88\t(0,70,\fscx104\fscy104)\t(70,120,\fscx100\fscy100)}"
        lines.append(f"Dialogue: 1,{ass_time(s)},{ass_time(e)},Cap,,0,0,0,,{{\\pos({W // 2},{pos_y})}}{anim}{' '.join(parts)}")
    # gancho: [palavras] em destaque; quebra em 2 linhas se longo
    g = cfg.get("gancho_texto", "")
    if g:
        gtxt = re.sub(r"\[([^\]]+)\]", lambda m: f"{{\\c{ass_color(G['destaque'])}}}{m.group(1)}{{\\r}}", g)
        plain = re.sub(r"\[|\]", "", g)
        if len(plain) > 16 and "\\N" not in gtxt:
            ws = gtxt.split(" ")
            # quebra no ponto mais equilibrado
            pl = lambda xs: len(re.sub(r"\{[^}]*\}", "", " ".join(xs)))
            best = min(range(1, len(ws)), key=lambda k: abs(pl(ws[:k]) - pl(ws[k:])))
            gtxt = " ".join(ws[:best]) + "\\N" + " ".join(ws[best:])
        anim = r"{\fad(0,180)\fscx55\fscy55\t(0,110,\fscx106\fscy106)\t(110,190,\fscx100\fscy100)}"
        lines.append(f"Dialogue: 2,{ass_time(0)},{ass_time(G['dur'])},Hook,,0,0,0,,{{\\pos({W // 2},{G['margem_topo']})}}{anim}{gtxt}")
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hook,{G['fonte']},{G['tamanho']},{ass_color(G['cor'])},&H000000FF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,{G['contorno']},{G['sombra']},8,40,40,0,1
Style: Cap,{L['fonte']},{L['tamanho']},{ass_color(L['cor'])},&H000000FF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,{L['contorno']},{L['sombra']},2,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    out.write_text(head + "\n".join(lines) + "\n", encoding="utf-8")
    return out


# ---------------------------------------------------------------- 4. vídeo
def ease(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x) if x < 1 else 1.0


def roi_params(roi, E):
    x, y, w, hh = roi
    J = E["janela_conteudo"]
    win_h = J["y1"] - J["y0"]
    s = max(w / E["saida"]["largura"], hh / win_h)
    s = max(s, E["zoom"]["s_min"])
    s = min(s, SRC_H / E["saida"]["altura"] * 1.6)
    return (x + w / 2, y + hh / 2, s)


def camera_at(keys, t, E):
    """keys: lista ordenada por t. Retorna (cx, cy, s) com transição ease in-out."""
    ks = [k for k in keys if k["t"] <= t + 1e-6]
    if not ks:
        return roi_params(keys[0]["roi"], E)
    k = ks[-1]
    i = keys.index(k)
    cur = roi_params(k["roi"], E)
    if i == 0 or k.get("ease", 0) <= 0:
        return cur
    prev = camera_at(keys[:i], k["t"] - 1e-4, E)
    u = ease((t - k["t"]) / k["ease"])
    cx = prev[0] + (cur[0] - prev[0]) * u
    cy = prev[1] + (cur[1] - prev[1]) * u
    s = math.exp(math.log(prev[2]) + (math.log(cur[2]) - math.log(prev[2])) * u)
    return (cx, cy, s)


class Compositor:
    def __init__(self, cfg):
        self.cfg = cfg
        E = self.E = cfg["E"]
        self.W, self.H = E["saida"]["largura"], E["saida"]["altura"]
        J = E["janela_conteudo"]
        self.cy_out = (J["y0"] + J["y1"]) / 2
        wc = E["webcam"]
        bx, by, bw, bh = wc["fonte_caixa"]
        side = wc["lado_fonte"]
        cxw = wc.get("centro_x_fonte")
        if cxw is None:
            wj = json.loads((WORK / "webcam.json").read_text())
            cxw = float(np.median([s["rosto"][0] + s["rosto"][2] / 2 for s in wj["amostras"] if s.get("rosto")]))
        x0 = int(round(min(max(cxw - side / 2, bx), bx + bw - side)))
        self.cam_src = (x0, by + (bh - side) // 2, side)
        S = wc["lado_saida"]
        self.cam_S = S
        self.cam_x = self.W - wc["margem_direita"] - S if wc.get("canto", "direita") == "direita" else wc["margem_direita"]
        self.cam_y = wc["base_y"] - S
        # máscaras do quadrado arredondado, borda e sombra (pré-calculadas)
        m = np.zeros((S, S), np.uint8)
        r = wc["raio"]
        cv2.rectangle(m, (r, 0), (S - r - 1, S - 1), 255, -1)
        cv2.rectangle(m, (0, r), (S - 1, S - r - 1), 255, -1)
        for cx_, cy_ in [(r, r), (S - r - 1, r), (r, S - r - 1), (S - r - 1, S - r - 1)]:
            cv2.circle(m, (cx_, cy_), r, 255, -1, cv2.LINE_AA)
        self.cam_mask = cv2.GaussianBlur(m, (3, 3), 0).astype(np.float32)[..., None] / 255
        bpx = wc["borda_px"]
        inner = cv2.erode(m, np.ones((2 * bpx + 1, 2 * bpx + 1), np.uint8))
        self.cam_border = ((m.astype(np.float32) - inner) / 255 * wc["borda_alpha"])[..., None]
        pad = wc["sombra_blur"] * 2
        sh = np.zeros((S + 2 * pad, S + 2 * pad), np.float32)
        sh[pad + wc["sombra_offset"]:pad + wc["sombra_offset"] + S, pad:pad + S] = m / 255
        sh = cv2.GaussianBlur(sh, (0, 0), wc["sombra_blur"] / 2) * wc["sombra_alpha"]
        self.sh, self.sh_pad = sh[..., None], pad
        self.overlay = self._arroba() if self.E["arroba"].get("ativo", True) else None

    def _arroba(self):
        a = self.E["arroba"]
        img = Image.new("RGBA", (self.W, self.H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        f = ImageFont.truetype(str(FONTS / "Anton-Regular.ttf"), a["tam_texto"])
        tw = d.textlength(a["texto"], font=f)
        T = a["tam_icone"]
        gap = 12
        x0 = a["x"]
        y0 = a["y"]
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ds = ImageDraw.Draw(sh)
        if a.get("pilula_alpha", 0) > 0:
            ds.rounded_rectangle([x0 - 14, y0 - 10, x0 + T + gap + tw + 16, y0 + T + 10], radius=(T + 20) // 2,
                                 fill=(0, 0, 0, int(255 * a["pilula_alpha"])))
        lw = max(3, T // 11)
        for dd, col, off in [(ds, (0, 0, 0, 170), 2), (d, (255, 255, 255, 255), 0)]:
            ix, iy = x0 + off, y0 + off
            dd.rounded_rectangle([ix, iy, ix + T, iy + T], radius=T // 4, outline=col, width=lw)
            c, rr, dot = T / 2, T * 0.22, T * 0.07
            dd.ellipse([ix + c - rr, iy + c - rr, ix + c + rr, iy + c + rr], outline=col, width=lw)
            dd.ellipse([ix + T * 0.76 - dot, iy + T * 0.24 - dot, ix + T * 0.76 + dot, iy + T * 0.24 + dot], fill=col)
            bb = d.textbbox((0, 0), a["texto"], font=f)
            ty = iy + (T - (bb[3] - bb[1])) / 2 - bb[1]
            dd.text((ix + T + gap, ty), a["texto"], font=f, fill=col)
        from PIL import ImageFilter
        img = Image.alpha_composite(sh.filter(ImageFilter.GaussianBlur(1.5)), img)
        arr = np.array(img).astype(np.float32)
        arr[..., 3] *= a["alpha"]
        ys, xs = np.nonzero(arr[..., 3] > 0)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgba = arr[y0:y1, x0:x1]
        return (x0, y0, rgba[..., 2::-1].copy(), (rgba[..., 3:] / 255))

    def compose(self, frame, cam_params, t_src, cam_frame=None):
        """frame = tela (pode ser um quadro congelado); cam_frame = quadro ao vivo para a webcam."""
        cam_frame = frame if cam_frame is None else cam_frame
        E = self.E
        cx, cy, s = cam_params
        W, H = self.W, self.H
        x_src0, y_src0 = cx - W / 2 * s, cy - self.cy_out * s
        x_src1, y_src1 = x_src0 + W * s, y_src0 + H * s
        f = frame
        pm = E["pip_mascara"]
        need_pip = x_src1 > pm["x0"] and y_src0 < pm["y1"] and y_src1 > pm["y0"]
        boxes = [b for b in E["borrar_padrao"] + self.cfg.get("borrar", [])
                 if (b.get("de") is None or b["de"] <= t_src <= b.get("ate", 1e9))
                 and b["x"] < x_src1 and b["x"] + b["w"] > x_src0 and b["y"] < y_src1 and b["y"] + b["h"] > y_src0]
        if need_pip or boxes:
            f = frame.copy()
            if need_pip:
                f[pm["y0"]:pm["y1"], pm["x0"]:] = f[pm["y0"]:pm["y1"], pm["x0"] - 3:pm["x0"] - 2]
            for b in boxes:
                x, y, w, hh = b["x"], b["y"], b["w"], b["h"]
                reg = f[y:y + hh, x:x + w]
                small = cv2.resize(reg, (max(1, w // 24), max(1, hh // 24)), interpolation=cv2.INTER_AREA)
                f[y:y + hh, x:x + w] = cv2.GaussianBlur(cv2.resize(small, (w, hh), interpolation=cv2.INTER_LINEAR), (0, 0), 6)
        # recorte da ROI com subpixel (câmera suave): mapeia fonte -> saída
        M = np.array([[1 / s, 0, -x_src0 / s], [0, 1 / s, -y_src0 / s]], np.float32)
        # recorta só a região necessária (+margem) antes do warp, para economizar
        mx0, my0 = int(max(0, math.floor(x_src0) - 8)), int(max(0, math.floor(y_src0) - 8))
        mx1, my1 = int(min(SRC_W, math.ceil(x_src1) + 8)), int(min(SRC_H, math.ceil(y_src1) + 8))
        sub = f[my0:my1, mx0:mx1]
        M[0, 2] += mx0 / s
        M[1, 2] += my0 / s
        out = cv2.warpAffine(sub, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
        if s < E["zoom"]["nitidez_abaixo_de"]:
            bl = cv2.GaussianBlur(out, (0, 0), 1.2)
            out = cv2.addWeighted(out, 1.35, bl, -0.35, 0)
        # áreas fora da tela (ROI perto da borda): fundo escuro com degradê suave
        top = int(math.ceil((0 - y_src0) / s))
        bot = int(math.floor((SRC_H - y_src0) / s))
        dark = np.array(E.get("fundo_cor", [22, 18, 16]), np.float32)  # BGR
        fe = 48
        if bot < H:
            b0 = max(0, bot)
            out[b0:] = dark.astype(np.uint8)
            a0 = max(0, b0 - fe)
            if b0 > a0:
                k = np.linspace(0, 1, b0 - a0, dtype=np.float32)[:, None, None]
                out[a0:b0] = (out[a0:b0].astype(np.float32) * (1 - k) + dark * k).astype(np.uint8)
        if top > 0:
            t1 = min(H, top)
            out[:t1] = dark.astype(np.uint8)
            b1 = min(H, t1 + fe)
            k = np.linspace(1, 0, b1 - t1, dtype=np.float32)[:, None, None]
            out[t1:b1] = (out[t1:b1].astype(np.float32) * (1 - k) + dark * k).astype(np.uint8)
        # webcam quadrada com sombra, cantos arredondados e borda
        x0, y0, side = self.cam_src
        cam = cv2.resize(cam_frame[y0:y0 + side, x0:x0 + side], (self.cam_S, self.cam_S), interpolation=cv2.INTER_AREA)
        cxo, cyo, S, p = self.cam_x, self.cam_y, self.cam_S, self.sh_pad
        ya, yb, xa, xb = cyo - p, cyo + S + p, cxo - p, cxo + S + p
        sh = self.sh[max(0, -ya):self.sh.shape[0] - max(0, yb - H), max(0, -xa):self.sh.shape[1] - max(0, xb - W)]
        reg = out[max(0, ya):min(H, yb), max(0, xa):min(W, xb)].astype(np.float32)
        out[max(0, ya):min(H, yb), max(0, xa):min(W, xb)] = (reg * (1 - sh)).astype(np.uint8)
        reg = out[cyo:cyo + S, cxo:cxo + S].astype(np.float32)
        comp = reg * (1 - self.cam_mask) + cam.astype(np.float32) * self.cam_mask
        comp = comp * (1 - self.cam_border) + 255 * self.cam_border
        out[cyo:cyo + S, cxo:cxo + S] = comp.astype(np.uint8)
        # @ e ícone (opcional)
        if self.overlay is None:
            return out
        ox, oy, rgb, al = self.overlay
        reg = out[oy:oy + rgb.shape[0], ox:ox + rgb.shape[1]].astype(np.float32)
        out[oy:oy + rgb.shape[0], ox:ox + rgb.shape[1]] = (reg * (1 - al) + rgb * al).astype(np.uint8)
        return out


def congelado(cfg, ts):
    for c in cfg.get("congelar", []):
        if c["de"] <= ts < c["ate"]:
            return c["quadro"]
    return None


def seg_keys(cfg, si):
    seg = cfg["segmentos"][si]
    keys = seg.get("camera") or cfg["camera"]
    return sorted(keys, key=lambda k: k["t"])


def decode_range(src, a, nframes, fps):
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{a:.4f}", "-i", src, "-frames:v", str(nframes),
           "-vf", f"fps={fps},scale=in_color_matrix=bt709:out_color_matrix=bt709,format=bgr24",
           "-f", "rawvideo", "-pix_fmt", "bgr24", "-threads", "4", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=SRC_W * SRC_H * 3)
    size = SRC_W * SRC_H * 3
    for _ in range(nframes):
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(SRC_H, SRC_W, 3)
    p.stdout.close()
    p.wait()


def frame_at(src, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-i", src, "-frames:v", "1", "-vf",
                          "scale=in_color_matrix=bt709:out_color_matrix=bt709,format=bgr24", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(SRC_H, SRC_W, 3)


def burn_ass_on_image(img_path, ass, t, out_path):
    """Queima a legenda .ass num único quadro, no instante t da saída (para as folhas de revisão)."""
    vf = f"setpts=PTS+{t:.3f}/TB,subtitles='{ass}':fontsdir='{FONTS}'"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(img_path), "-vf", vf, "-frames:v", "1", str(out_path)],
                   check=True)


# ---------------------------------------------------------------- principal
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("config")
    ap.add_argument("--previa", action="store_true", help="gera só a folha de quadros-chave")
    ap.add_argument("--tempos", help="tempos de saída (s) para a prévia, separados por vírgula")
    args = ap.parse_args()
    cfg = load_cfg(args.config)
    E = cfg["E"]
    fps = E["saida"]["fps"]
    src = str(ROOT / cfg["fonte"])
    cache = WORK / "cache" / cfg["id"]
    cache.mkdir(parents=True, exist_ok=True)
    words = load_words()
    pieces, total = build_edl(cfg, words)
    (cache / "edl.json").write_text(json.dumps({"pecas": pieces, "duracao": total}, indent=1))
    ass = build_ass(cfg, pieces, words, total, cache)
    comp = Compositor(cfg)
    print(f"{cfg['id']}: {len(pieces)} pedaços, {total:.2f}s de saída")

    if args.previa:
        tempos = [float(x) for x in args.tempos.split(",")] if args.tempos else cfg.get("previa", [1.0, total * 0.35, total * 0.65, total - 0.4])
        rot = cfg.get("previa_rotulos", ["gancho", "zoom", "legenda sobre a tela", "final"])
        tiles = []
        for i, to in enumerate(tempos):
            p = max((p for p in pieces if p["out"] <= to + 1e-6), key=lambda p: p["out"])
            ts = p["a"] + (to - p["out"])
            cq = congelado(cfg, ts)
            fr_live = frame_at(src, ts)
            fr = frame_at(src, cq) if cq else fr_live
            img = comp.compose(fr, camera_at(seg_keys(cfg, p["seg"]), ts, E), ts, cam_frame=fr_live)
            tmp = cache / f"previa_{i}.png"
            cv2.imwrite(str(tmp), img)
            outp = cache / f"previa_{i}_leg.png"
            burn_ass_on_image(tmp, ass, to, outp)
            im = cv2.imread(str(outp))
            # guias da área segura (só na prévia)
            g = im.copy()
            for yy in (int(comp.H * E["area_segura"]["topo_pct"] / 100), int(comp.H * (1 - E["area_segura"]["base_pct"] / 100))):
                for xx in range(0, comp.W, 40):
                    cv2.line(g, (xx, yy), (xx + 20, yy), (0, 0, 255), 3)
            im = cv2.addWeighted(g, 0.85, im, 0.15, 0)
            lab = f"{rot[i] if i < len(rot) else ''}  {to:.1f}s (orig {ts:.1f}s)"
            cv2.rectangle(im, (0, comp.H - 70), (comp.W, comp.H), (0, 0, 0), -1)
            cv2.putText(im, lab, (20, comp.H - 22), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (255, 255, 255), 3, cv2.LINE_AA)
            tiles.append(cv2.resize(im, (540, 960), interpolation=cv2.INTER_AREA))
        sheet = np.hstack(tiles)
        dst = ROOT / "review" / f"{cfg['id']}_quadros.jpg"
        cv2.imwrite(str(dst), sheet, [cv2.IMWRITE_JPEG_QUALITY, 90])
        print("prévia:", dst)
        return

    audio = build_audio(cfg, pieces, cache)
    Enc = E["encode"]
    final = ROOT / "export" / f"{cfg['arquivo']}.mp4"
    vf = (f"subtitles='{ass}':fontsdir='{FONTS}',scale=out_color_matrix=bt709:out_range=tv,format=yuv420p")
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{comp.W}x{comp.H}",
         "-r", str(fps), "-i", "-", "-i", str(audio), "-vf", vf,
         "-c:v", "libx264", "-profile:v", "high", "-preset", Enc["preset"], "-crf", str(Enc["crf"]),
         "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
         "-color_range", "tv", "-c:a", "aac", "-ar", str(E["audio"]["taxa"]), "-b:a", f"{Enc['audio_kbps']}k",
         "-movflags", "+faststart", "-shortest", str(final)], stdin=subprocess.PIPE)
    n_done = 0
    n_total = sum(p["n"] for p in pieces)
    # decodifica cada segmento de forma contínua e seleciona os quadros dos pedaços
    for si in range(len(cfg["segmentos"])):
        ps = [p for p in pieces if p["seg"] == si]
        a0 = ps[0]["a"]
        last = ps[-1]
        n_seg = round((last["a"] + last["n"] / fps - a0) * fps) + 2
        keys = seg_keys(cfg, si)
        want = {}
        for p in ps:
            k0 = round((p["a"] - a0) * fps)
            for k in range(p["n"]):
                want[k0 + k] = p["a"] + k / fps
        hold = {}
        for c in cfg.get("congelar", []):
            hold[round((c["quadro"] - a0) * fps)] = None
        for k, fr in enumerate(decode_range(src, a0, n_seg, fps)):
            if k in hold:
                hold[k] = fr.copy()
            if k not in want:
                continue
            ts = want.pop(k)
            cq = congelado(cfg, ts)
            tela = fr
            if cq is not None and hold.get(round((cq - a0) * fps)) is not None:
                tela = hold[round((cq - a0) * fps)]
            img = comp.compose(tela, camera_at(keys, ts, E), ts, cam_frame=fr)
            enc.stdin.write(img.tobytes())
            n_done += 1
            if n_done % 150 == 0:
                print(f"  {n_done}/{n_total} quadros", flush=True)
        # se faltou quadro no fim (arredondamento), repete o último
        for _ in want:
            enc.stdin.write(img.tobytes())
            n_done += 1
    enc.stdin.close()
    enc.wait()
    # true peak medido no AAC final; se estourar, baixa o teto do limitador e remuxa só o áudio
    teto = 0.0
    for _ in range(4):
        lg = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(final), "-vn", "-af", "ebur128=peak=true",
                             "-f", "null", "-"], capture_output=True, text=True).stderr
        tp_fin = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", lg)[-1])
        if tp_fin <= E["audio"]["true_peak"]:
            break
        teto += tp_fin - E["audio"]["true_peak"] + 0.3
        print(f"  true peak {tp_fin:.1f} dBTP após AAC; teto do limitador -{teto:.1f} dB e remux")
        audio = build_audio(cfg, pieces, cache, teto)
        tmp = final.with_suffix(".tmp.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(final), "-i", str(audio), "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-c:a", "aac", "-ar", str(E["audio"]["taxa"]), "-b:a", f"{Enc['audio_kbps']}k",
                        "-movflags", "+faststart", "-shortest", str(tmp)], check=True)
        tmp.replace(final)
    print("final:", final)
    leve = ROOT / "export_leve" / f"{cfg['arquivo']}_leve.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(final), "-c:v", "libx264", "-preset", "medium",
                    "-b:v", f"{Enc['leve_kbps']}k", "-maxrate", f"{int(Enc['leve_kbps'] * 1.3)}k",
                    "-bufsize", f"{Enc['leve_kbps'] * 2}k", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
                    "-movflags", "+faststart", str(leve)], check=True)
    print("leve:", leve)


if __name__ == "__main__":
    main()
