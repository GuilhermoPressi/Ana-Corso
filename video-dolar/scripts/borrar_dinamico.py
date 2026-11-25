"""Borra o bruto quadro a quadro (fixos + caixas que acompanham a rolagem a partir do OCR) e gera trabalho/fonte_borrada.mp4.
Mesma aparência do vídeo 100k: pixelização 14px + desfoque, cantos de 8px.
Uso: python3 scripts/borrar_dinamico.py [--amostra t1,t2,...]   (amostra: salva PNGs antes/depois em review/borroes/)"""
import json, os, re, subprocess, sys, numpy as np, cv2
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V=f"{B}/brutos/02_EUIMPLORO_VENDAEMDOLAR.mov"; OUT=f"{B}/trabalho/fonte_borrada.mp4"
W,H,FPS,K,R=1280,720,30,14,8
cfg=json.load(open(f"{B}/config/blur.json"))
RX=re.compile(cfg["regex_dinamico"],re.I); RX_ROT=re.compile(r"^(\*?Anunciante$|Página$|Perfil$|URL$)")
def carrega(f):
    return [json.loads(l) for l in open(f)] if os.path.exists(f) else []
s1=carrega(f"{B}/trabalho/ocr_02.jsonl"); s4=carrega(f"{B}/trabalho/ocr4_a.jsonl")+carrega(f"{B}/trabalho/ocr4_b.jsonl")
faixas4=[(95,122),(244,380)]
def hits(a):
    hs=[]
    for x,y,w,h,t,c in a["palavras"]:
        if RX.search(t): hs.append((x-30,y-10,x+w+14,y+h+10))
    # campos de identidade: borra o valor abaixo do rótulo mesmo que o OCR não leia o nome
    for x,y,w,h,t,c in a["palavras"]:
        if RX_ROT.match(t) and 400<x<800: hs.append((x-12,y+h+2,x+360,y+h+52))
    return hs
amostras=[(a["t"],hits(a)) for a in s4]+[(a["t"],hits(a)) for a in s1 if not any(p<=a["t"]<=q for p,q in faixas4)]
amostras=[a for a in amostras if a[1]]
def dinamicos(t):
    em4=any(p<=t<=q for p,q in faixas4); jan=0.3 if em4 else 0.6
    return [b for s,hs in amostras if abs(s-t)<=jan for b in hs]
def janela(seg,t): return any(a-1.0<=t<=b+1.0 for a,b in seg)
def caixas(t):
    bx=[]
    for f in cfg["fixos"]:
        if f.get("sempre") or janela(f.get("janelas",[]),t): bx.append(tuple(f["caixa"]))
    return bx+dinamicos(t)
_m={}
def mask(w,h):
    if (w,h) not in _m:
        m=np.zeros((h,w),np.uint8); r=min(R,w//2,h//2)
        cv2.rectangle(m,(r,0),(w-r,h),255,-1); cv2.rectangle(m,(0,r),(w,h-r),255,-1)
        for cx,cy in [(r,r),(w-r-1,r),(r,h-r-1),(w-r-1,h-r-1)]: cv2.circle(m,(cx,cy),r,255,-1,cv2.LINE_AA)
        _m[(w,h)]=(m.astype(np.float32)/255)[...,None]
    return _m[(w,h)]
def borra(img,bx):
    for x0,y0,x1,y1 in bx:
        x0,y0=max(0,int(x0)),max(0,int(y0)); x1,y1=min(W,int(x1)),min(H,int(y1))
        w,h=x1-x0,y1-y0
        if w<4 or h<4: continue
        roi=img[y0:y1,x0:x1]
        p=cv2.resize(cv2.resize(roi,(max(1,w//K),max(1,h//K)),interpolation=cv2.INTER_AREA),(w,h),interpolation=cv2.INTER_NEAREST)
        p=cv2.GaussianBlur(p,(0,0),K*0.6)
        m=mask(w,h); img[y0:y1,x0:x1]=(p*m+roi*(1-m)).astype(np.uint8)
    return img
if "--amostra" in sys.argv:
    os.makedirs(f"{B}/review/borroes",exist_ok=True)
    for t in map(float,sys.argv[sys.argv.index("--amostra")+1].split(",")):
        raw=subprocess.run(["ffmpeg","-v","error","-ss",f"{t:.3f}","-i",V,"-frames:v","1","-f","rawvideo","-pix_fmt","bgr24","-"],capture_output=True).stdout
        a=np.frombuffer(raw,np.uint8).reshape(H,W,3).copy(); d=borra(a.copy(),caixas(t))
        cv2.imwrite(f"{B}/review/borroes/depois_{t:07.2f}.png",d)
    sys.exit()
dec=subprocess.Popen(["ffmpeg","-v","error","-i",V,"-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
enc=subprocess.Popen(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","bgr24","-s",f"{W}x{H}","-r","30","-i","-","-i",V,"-map","0:v","-map","1:a","-c:v","libx264","-preset","fast","-crf","12","-pix_fmt","yuv420p","-c:a","copy",OUT+".tmp.mp4"],stdin=subprocess.PIPE)
i=0
while True:
    b=dec.stdout.read(W*H*3)
    if len(b)<W*H*3: break
    t=i/FPS; img=np.frombuffer(b,np.uint8).reshape(H,W,3).copy()
    enc.stdin.write(borra(img,caixas(t)).tobytes()); i+=1
    if i%1500==0: print(f"{t:.0f}s",flush=True)
enc.stdin.close(); enc.wait(); os.replace(OUT+".tmp.mp4",OUT); print("quadros",i)
