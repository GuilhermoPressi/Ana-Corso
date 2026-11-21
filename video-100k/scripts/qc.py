"""Controle de qualidade sobre o MP4 exportado (não sobre o preview).
Uso: python qc.py <arquivo.mp4>
  1) Quadros de cada borrão (entrada, meio, saída, +-1 quadro) e de cada motion (início, meio, fim) -> review/qc/*.png
  2) OCR a cada 1s no vídeo inteiro procurando e-mail, telefone, CPF/CNPJ, URL privada, nomes borrados
  3) Transcrição do áudio final procurando falas de bastidor / pedidos para esconder
  4) Quadros pretos e congelados, loudness
"""
import json, os, re, subprocess, sys
import numpy as np, cv2, pytesseract
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0,f"{B}/scripts")
import montagem as M
V=sys.argv[1]; O=f"{B}/review/qc"; os.makedirs(O,exist_ok=True)
segs=M.carregar(); P=json.load(open(f"{M.W}/motion_final.json"))
def quadro(t):
    raw=subprocess.run(["ffmpeg","-v","error","-ss",f"{max(0,t):.3f}","-i",V,"-frames:v","1","-f","rawvideo","-pix_fmt","bgr24","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).reshape(1080,1920,3).copy() if len(raw)==1920*1080*3 else None
rel={"borroes":[], "motions":[], "ocr":[], "fala":[], "tecnico":{}}
# 1a) borrões: para cada borrão ativo, tempos finais de cada trecho visível
cfg=json.load(open(f"{B}/config/blur.json"))
for b in [x for x in cfg["borroes"] if x["ativo"]]:
    ts=[]
    for s in segs:
        if s["fonte"]!=b["fonte"]: continue
        a,c=s["in_f"]/30,s["out_f"]/30
        if c<=b["in"] or a>=b["out"]: continue
        f0=s["final_f"]/30+max(0,b["in"]-a); f1=s["final_f"]/30+min(c,b["out"])-a
        ts.append((f0,f1))
    if not ts: continue
    alvo=[ts[0][0],ts[0][0]+1/30,(ts[0][0]+ts[-1][1])/2,ts[-1][1]-1/30]
    x0,y0,x1,y1=[v*1.5 for v in b["caixa"]]
    tiles=[]
    for t in alvo:
        q=quadro(t)
        if q is None: continue
        zx0,zy0=int(max(0,x0-60)),int(max(0,y0-40)); zx1,zy1=int(min(1920,x1+60)),int(min(1080,y1+40))
        z=q[zy0:zy1,zx0:zx1]; z=cv2.resize(z,(1200,int(z.shape[0]*1200/z.shape[1])))
        cv2.putText(z,f"{b['id']} t={t:.2f}",(8,24),0,.7,(0,255,255),2); tiles.append(z)
        txt=pytesseract.image_to_string(q[int(y0):int(y1),int(x0):int(x1)],lang="por").strip()
        rel["borroes"].append({"id":b["id"],"t":round(t,2),"ocr_dentro_da_caixa":txt})
    cv2.imwrite(f"{O}/borrao_{b['id']}.png",np.vstack(tiles))
# 1b) motions
for m in P:
    d=m["props"]["dur"]; tiles=[]
    for t in [m["F"]+0.05,m["F"]+d*0.5,m["F"]+d-0.2]:
        q=quadro(t)
        if q is not None: tiles.append(cv2.resize(q,(640,360)))
    cv2.imwrite(f"{O}/motion_{m['id']}.png",np.hstack(tiles)); rel["motions"].append(m["id"])
# 2) OCR a cada 1s
PAD={"email":r"[\w.+-]+@[\w-]+\.[a-z]{2,}","telefone":r"\(?\d{2}\)?\s?9\d{4}[-\s]?\d{4}","cpf_cnpj":r"\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}",
     "url_privada":r"(dashboards/|/file/d/|/folders/|lastlink\.com|token=|key=)","nome_borrado":r"(Destrave Corporal|Corpo de Y[oô]ga|Dashboard\s*-\s*Daniel)"}
dur=float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",V],capture_output=True,text=True).stdout)
proc=subprocess.Popen(["ffmpeg","-v","error","-i",V,"-vf","fps=1","-f","rawvideo","-pix_fmt","gray","-"],stdout=subprocess.PIPE)
t=0
while True:
    buf=proc.stdout.read(1920*1080)
    if len(buf)<1920*1080: break
    g=np.frombuffer(buf,np.uint8).reshape(1080,1920)
    txt=pytesseract.image_to_string(g,lang="por",config="--psm 11")
    for k,rx in PAD.items():
        for mm in re.finditer(rx,txt,re.I): rel["ocr"].append({"t":t,"tipo":k,"texto":mm.group(0)})
    t+=1
# 3) fala
from faster_whisper import WhisperModel
wav=f"{M.W}/qc_audio.wav"; subprocess.run(["ffmpeg","-v","error","-y","-i",V,"-ac","1","-ar","16000",wav],check=True)
mod=WhisperModel("medium",device="cpu",compute_type="int8",cpu_threads=4)
segs_w,_=mod.transcribe(wav,language="pt",condition_on_previous_text=False)
BAST=re.compile(r"(corta|de novo|deixa eu refazer|\bpera\b|grava(r|ndo)|encerramento|açaí|esqueci|não pode (aparecer|mostrar)|borra|esconde|n[ãa]o mostra|bagulho|caralho|merda|diarreia|Begri|lembra disso)",re.I)
for s in segs_w:
    if BAST.search(s.text): rel["fala"].append({"t":round(s.start,1),"texto":s.text.strip()})
# 4) técnico
r=subprocess.run(["ffmpeg","-i",V,"-vf","blackdetect=d=0.3:pix_th=0.08,freezedetect=n=0.001:d=4","-af","ebur128=peak=true","-f","null","-"],capture_output=True,text=True).stderr
rel["tecnico"]={"preto":re.findall(r"black_start:[\d.]+ black_end:[\d.]+",r),"congelado":re.findall(r"freeze_start: [\d.]+",r),
  "loudness":[l.strip() for l in r.splitlines() if l.strip().startswith(("I:","Peak:"))][-2:],"duracao":dur}
json.dump(rel,open(f"{O}/qc.json","w"),ensure_ascii=False,indent=1)
print("borroes:",len(rel["borroes"]),"| ocr achados:",len(rel["ocr"]),"| falas suspeitas:",len(rel["fala"]),"|",rel["tecnico"]["loudness"],"| pretos:",len(rel["tecnico"]["preto"]),"| congelados>4s:",len(rel["tecnico"]["congelado"]))
for o in rel["ocr"]: print("OCR",o)
for f in rel["fala"]: print("FALA",f)
