"""OCR de TODOS os quadros (30 fps) na coluna do formulário da Meta, nos trechos com rolagem, + deslocamento vertical
quadro a quadro (correlação de fase) para o borrão acompanhar a rolagem.
Saída: trabalho/quadros_<a>_<b>.json  -> {"fps":30,"ini_f":..,"hits":[[...caixas...] por quadro],"desl":[px por quadro]}
Uso: python3 scripts/ocr_quadros.py a b"""
import json, os, re, subprocess, sys, numpy as np, cv2, pytesseract
from multiprocessing import Pool
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V=os.environ.get("VIDEO",f"{B}/brutos/02_EUIMPLORO_VENDAEMDOLAR.mov"); SUF=os.environ.get("SUF","")
X0,Y0,X1,Y1=400,196,940,716          # coluna do formulário (720p), abaixo do cabeçalho fixo
ESC=2.0
RX=re.compile(r"dani|suas|yoga|^CORPO$|\d{10,}",re.I)   # filtro largo aqui; o filtro fino fica em borrar_dinamico.py (RX_NOME)
ROT={"Facebook","Instagram","Threads","Anunciante"}
def ocr(crop):
    big=cv2.resize(crop,None,fx=ESC,fy=ESC,interpolation=cv2.INTER_CUBIC)
    d=pytesseract.image_to_data(big,lang="por",config="--psm 11",output_type=pytesseract.Output.DICT)
    hs=[]
    for i,t in enumerate(d["text"]):
        t=t.strip()
        if not t or float(d["conf"][i])<20: continue
        x=d["left"][i]/ESC+X0; y=d["top"][i]/ESC+Y0; w=d["width"][i]/ESC; h=d["height"][i]/ESC
        if RX.search(t) and not (t.upper()=="CORPO" and not t.isupper()):
            hs.append([x-28,y-7,x+w+10,y+h+7,t])
    return hs
def trabalho(args):
    i,b=args; img=np.frombuffer(b,np.uint8).reshape(Y1-Y0,X1-X0,3); return i,ocr(img)
if __name__=="__main__":
    a,b=float(sys.argv[1]),float(sys.argv[2]); f0=round(a*30); n=round((b-a)*30)
    pr=subprocess.Popen(["ffmpeg","-v","error","-ss",f"{f0/30:.4f}","-i",V,"-frames:v",str(n),"-vf",f"crop={X1-X0}:{Y1-Y0}:{X0}:{Y0}","-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
    fr=[]; sz=(X1-X0)*(Y1-Y0)*3
    while True:
        x=pr.stdout.read(sz)
        if len(x)<sz: break
        fr.append(x)
    g=[cv2.cvtColor(np.frombuffer(x,np.uint8).reshape(Y1-Y0,X1-X0,3),cv2.COLOR_BGR2GRAY).astype(np.float32) for x in fr]
    # deslocamento vertical acumulado (conteúdo sobe -> desl diminui)
    desl=[0.0]; ref=[0]
    for i in range(1,len(g)):
        (dx,dy),r=cv2.phaseCorrelate(g[i-1][:430],g[i][:430]); dy=dy if r>0.15 and abs(dx)<3 else 0.0   # só a área que rola (rodapé fixo fora)
        desl.append(desl[-1]+dy)
    # só refaz OCR quando o quadro muda
    alvo=[];
    for i in range(len(g)):
        if i==0 or np.abs(g[i]-g[ref[-1]]).mean()>0.6: alvo.append(i); ref.append(i)
        else: ref.append(ref[-1])
    ref=ref[1:]
    os.environ["OMP_THREAD_LIMIT"]="1"
    with Pool(4) as p: res=dict(p.imap_unordered(trabalho,[(i,fr[i]) for i in alvo],chunksize=4))
    hits=[res[ref[i]] if ref[i]!=i else res[i] for i in range(len(g))]
    json.dump({"fps":30,"ini_f":f0,"hits":hits,"desl":desl,"ocr_feitos":len(alvo)},open(f"{B}/trabalho/{SUF or 'quadros'}_{a:g}_{b:g}.json","w"))
    print(f"{a}-{b}: {len(g)} quadros, {len(alvo)} com OCR, {sum(1 for h in hits if h)} com nome")
