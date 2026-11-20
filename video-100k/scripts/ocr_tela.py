"""OCR a cada 0,5s nos trechos de tela. Quadros quase iguais ao anterior reaproveitam o OCR.
Uso: python ocr_tela.py <parte 01|02>  -> trabalho/ocr_<parte>.jsonl (uma linha por amostra: t, ref, palavras[x,y,w,h,texto,conf])"""
import sys, json, subprocess, numpy as np, cv2, pytesseract, os
p=sys.argv[1]; video=f"brutos/{p}_100KPORMESSEESTIVESSECOMECANDO.mov"
cenas=json.load(open("trabalho/cenas.json"))[p]
out=f"trabalho/ocr_{p}.jsonl"; feitos=set()
if os.path.exists(out):
    for l in open(out): feitos.add(json.loads(l)["t"])
f=open(out,"a"); W,H=1280,720
for c in cenas:
    if c["tipo"]!="tela": continue
    proc=subprocess.Popen(["ffmpeg","-v","error","-ss",str(c["inicio"]),"-i",video,"-t",str(c["fim"]-c["inicio"]),"-vf","fps=2","-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
    i=0; prev=None; prevres=None; reft=None
    while True:
        b=proc.stdout.read(W*H*3)
        if len(b)<W*H*3: break
        t=round(c["inicio"]+i/2,2); i+=1
        if t in feitos: continue
        img=np.frombuffer(b,np.uint8).reshape(H,W,3).copy()
        small=cv2.resize(cv2.cvtColor(img,cv2.COLOR_BGR2GRAY),(320,180)).astype(np.int16)
        if prev is not None and np.abs(small-prev).mean()<1.0:
            f.write(json.dumps({"t":t,"ref":reft,"palavras":None})+"\n"); continue
        prev=small; reft=t
        big=cv2.resize(img,None,fx=1.5,fy=1.5,interpolation=cv2.INTER_CUBIC)
        d=pytesseract.image_to_data(big,lang="por",config="--psm 11",output_type=pytesseract.Output.DICT)
        pal=[[round(d["left"][k]/1.5),round(d["top"][k]/1.5),round(d["width"][k]/1.5),round(d["height"][k]/1.5),d["text"][k],float(d["conf"][k])]
             for k in range(len(d["text"])) if d["text"][k].strip() and float(d["conf"][k])>30]
        f.write(json.dumps({"t":t,"ref":t,"palavras":pal},ensure_ascii=False)+"\n"); f.flush()
