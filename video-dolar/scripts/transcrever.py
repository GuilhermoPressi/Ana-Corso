"""Transcreve um bruto com faster-whisper (pt, word timestamps). Uso: python transcrever.py <video> <saida.json> [modelo]"""
import sys, json, subprocess, os, time
import numpy as np
from faster_whisper import WhisperModel
video, out = sys.argv[1], sys.argv[2]
modelo = sys.argv[3] if len(sys.argv) > 3 else "medium"
wav = out.replace(".json", ".wav")
if not os.path.exists(wav):
    subprocess.run(["ffmpeg","-v","error","-y","-i",video,"-vn","-ac","1","-ar","16000",wav], check=True)
m = WhisperModel(modelo, device="cpu", compute_type="int8", cpu_threads=4)
t0=time.time()
audio = np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",wav,"-f","s16le","-ac","1","-ar","16000","-"],capture_output=True,check=True).stdout,np.int16).astype(np.float32)/32768.0
segs, info = m.transcribe(audio, language="pt", word_timestamps=True, beam_size=5,
    vad_filter=False, condition_on_previous_text=False,
    initial_prompt="Low ticket, faturamento, R$ 100 mil por mês, tráfego pago, Meta Ads, checkout, funil, oferta, order bump, upsell, Kiwify, Hotmart, criativo, ROAS, CPA.")
res=[]
for s in segs:
    res.append({"start":s.start,"end":s.end,"text":s.text.strip(),"avg_logprob":s.avg_logprob,"no_speech_prob":s.no_speech_prob,
        "words":[{"w":w.word,"s":w.start,"e":w.end,"p":w.probability} for w in s.words]})
    print(f"[{s.start:7.2f}-{s.end:7.2f}] {s.text.strip()}", flush=True)
json.dump({"video":video,"modelo":modelo,"duracao":info.duration,"segmentos":res}, open(out,"w"), ensure_ascii=False, indent=1)
print("OK", time.time()-t0)
