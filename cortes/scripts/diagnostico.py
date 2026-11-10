#!/usr/bin/env python3
"""Etapa 1 - diagnóstico técnico do vídeo bruto (somente leitura).

Uso: python3 scripts/diagnostico.py brutos/YT01_original.mp4
Saída: trabalho/probe.json + resumo no terminal.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main(src: str) -> None:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", src],
        check=True, capture_output=True, text=True,
    ).stdout
    info = json.loads(out)
    (ROOT / "trabalho" / "probe.json").write_text(json.dumps(info, indent=2))

    fmt = info["format"]
    dur = float(fmt["duration"])
    print(f"Arquivo : {src}")
    print(f"Duração : {int(dur // 60)}min {dur % 60:.1f}s ({dur:.2f}s)")
    print(f"Tamanho : {int(fmt['size']) / 1e6:.0f} MB | bitrate {int(fmt.get('bit_rate', 0)) / 1e3:.0f} kbps")
    for s in info["streams"]:
        if s["codec_type"] == "video":
            num, den = map(int, s["r_frame_rate"].split("/"))
            print(f"Vídeo   : {s['codec_name']} {s.get('profile', '')} {s['width']}x{s['height']} "
                  f"{num / den:.3f} fps (avg {s.get('avg_frame_rate')}) {s.get('pix_fmt')} "
                  f"{int(s.get('bit_rate', 0)) / 1e3:.0f} kbps")
            h = s["height"]
            # Saída vertical 1080x1920: a altura da tela recortada vira 1920 px.
            # Fator de ampliação = 1920 / altura do recorte na fonte.
            print(f"          zoom 1:1 (sem upscale) => recorte de {1080 * h // 1920 if h < 1920 else 1080}x"
                  f"{min(h, 1920)} na fonte")
        elif s["codec_type"] == "audio":
            print(f"Áudio   : {s['codec_name']} {s.get('sample_rate')} Hz {s.get('channels')} ch "
                  f"{int(s.get('bit_rate', 0)) / 1e3:.0f} kbps")


if __name__ == "__main__":
    main(sys.argv[1])
