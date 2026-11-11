"""Transcreve trabalho/wav/*.wav com faster-whisper (pt, word_timestamps) -> trabalho/transcricoes.json"""
import json,glob,os,wave,sys
import numpy as np
from faster_whisper import WhisperModel
P=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_path=f'{P}/trabalho/transcricoes.json'
out=json.load(open(out_path)) if os.path.exists(out_path) else {}
m=WhisperModel(sys.argv[1] if len(sys.argv)>1 else 'small',device='cpu',compute_type='int8',cpu_threads=4)
for w in sorted(glob.glob(f'{P}/trabalho/wav/*.wav')):
    k=os.path.basename(w)[:-4]
    if k in out: continue
    with wave.open(w) as f: a=np.frombuffer(f.readframes(f.getnframes()),np.int16).astype(np.float32)/32768
    segs,info=m.transcribe(a,language='pt',vad_filter=True,word_timestamps=True)
    out[k]=[{'s':round(s.start,2),'e':round(s.end,2),'t':s.text.strip(),'w':[(round(x.start,2),round(x.end,2),x.word) for x in s.words]} for s in segs]
    json.dump(out,open(out_path,'w'),ensure_ascii=False); print('ok',k,len(out[k]),flush=True)
print('ALL DONE',flush=True)
