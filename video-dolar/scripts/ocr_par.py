"""OCR paralelo a 1 fps (4 processos). Saída: trabalho/ocr_02.jsonl com t e palavras [x,y,w,h,txt,conf] em coords 1280x720."""
import json, subprocess, sys, os, numpy as np, cv2, pytesseract
from multiprocessing import Pool
V=sys.argv[1]; OUT=sys.argv[2]; FPS=float(sys.argv[3]) if len(sys.argv)>3 else 1
def ocr(args):
    t,b=args
    img=np.frombuffer(b,np.uint8).reshape(720,1280,3)
    big=cv2.resize(img,None,fx=1.5,fy=1.5,interpolation=cv2.INTER_CUBIC)
    d=pytesseract.image_to_data(big,lang="por",config="--psm 11",output_type=pytesseract.Output.DICT)
    p=[[round(d["left"][i]/1.5),round(d["top"][i]/1.5),round(d["width"][i]/1.5),round(d["height"][i]/1.5),d["text"][i],float(d["conf"][i])] for i in range(len(d["text"])) if d["text"][i].strip() and float(d["conf"][i])>30]
    return {"t":t,"palavras":p}
def frames():
    pr=subprocess.Popen(["ffmpeg","-v","error","-i",V,"-vf",f"fps={FPS}","-f","rawvideo","-pix_fmt","bgr24","-"],stdout=subprocess.PIPE)
    i=0; prev=None
    while True:
        b=pr.stdout.read(1280*720*3)
        if len(b)<1280*720*3: break
        yield (round(i/FPS,2),b); i+=1
if __name__=="__main__":
    os.environ["OMP_THREAD_LIMIT"]="1"
    with Pool(4) as pool, open(OUT,"w") as f:
        for r in pool.imap(ocr,frames(),chunksize=2): f.write(json.dumps(r,ensure_ascii=False)+"\n"); f.flush()
