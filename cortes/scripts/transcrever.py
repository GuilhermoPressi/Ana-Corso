#!/usr/bin/env python3
"""Etapa 1 - transcrição com faster-whisper, timestamps por palavra.

Uso: python3 scripts/transcrever.py brutos/YT01_original.mp4 [modelo]
Saída: trabalho/transcricao.json (segmentos + palavras) e trabalho/transcricao.txt
Cache: se o JSON já existir para o mesmo modelo, não refaz.
"""
import json
import subprocess
import sys
import time
import wave
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "trabalho"

# Vocabulário do nicho para guiar a grafia de termos técnicos.
PROMPT = (
    "Gerenciador de Anúncios, Meta Ads, Facebook Ads, low ticket, infoproduto, ROI, ROAS, CPA, CPM, CTR, "
    "checkout, initiate checkout, página de vendas, criativo, campanha, conjunto de anúncios, público, "
    "pixel, UTMify, Hotmart, Kiwify, faturamento, lucro líquido, R$ 105 mil, R$ 44 mil, R$ 61 mil."
)


def main(src: str, model_name: str = "large-v3") -> None:
    out_json = WORK / "transcricao.json"
    if out_json.exists() and json.loads(out_json.read_text()).get("model") == model_name:
        print("cache: transcrição já existe, pulando")
        return

    audio = WORK / "audio" / f"{Path(src).stem}_16k.wav"
    audio.parent.mkdir(parents=True, exist_ok=True)
    if not audio.exists():
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-vn", "-ac", "1", "-ar", "16000", str(audio)],
                       check=True)

    model = WhisperModel(model_name, device="cpu", compute_type="int8",
                         download_root=str(WORK / "models" / "hf"), cpu_threads=4)
    t0 = time.time()
    # Lê o WAV 16 kHz mono direto em numpy (evita incompatibilidade do PyAV usado pelo faster-whisper).
    with wave.open(str(audio), "rb") as wf:
        pcm = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32768.0
    segments, info = model.transcribe(
        pcm, language="pt", word_timestamps=True, vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 300}, beam_size=5,
        initial_prompt=PROMPT, condition_on_previous_text=True,
    )
    data = {"model": model_name, "language": info.language, "duration": info.duration, "segments": []}
    lines = []
    for seg in segments:
        words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)}
                 for w in (seg.words or [])]
        data["segments"].append({"id": seg.id, "s": round(seg.start, 3), "e": round(seg.end, 3),
                                 "text": seg.text.strip(), "words": words})
        m, s = divmod(seg.start, 60)
        lines.append(f"[{int(m):02d}:{s:05.2f}] {seg.text.strip()}")
        print(lines[-1], flush=True)
    out_json.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    (WORK / "transcricao.txt").write_text("\n".join(lines))
    print(f"ok em {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main(sys.argv[1], *(sys.argv[2:3]))
