"""Aplica config/blur.json a quadros/trechos. Funções reutilizadas na montagem final.
  python borrar.py folhas   -> review/borroes/<id>.png (antes|depois, início/meio/fim + zoom)
"""
import json, sys, subprocess, numpy as np, cv2, os
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg=json.load(open(f"{BASE}/config/blur.json"))
FONTE={"01":f"{BASE}/brutos/01_100KPORMESSEESTIVESSECOMECANDO.mov","02":f"{BASE}/brutos/02_100KPORMESSEESTIVESSECOMECANDO.mov"}
def quadro(fonte,t):
    raw=subprocess.run(["ffmpeg","-v","error","-ss",f"{t:.3f}","-i",FONTE[fonte],"-frames:v","1","-f","rawvideo","-pix_fmt","bgr24","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).reshape(720,1280,3).copy()
def mascara(w,h,r):
    m=np.zeros((h,w),np.uint8); cv2.rectangle(m,(r,0),(w-r,h),255,-1); cv2.rectangle(m,(0,r),(w,h-r),255,-1)
    for cx,cy in [(r,r),(w-r-1,r),(r,h-r-1),(w-r-1,h-r-1)]: cv2.circle(m,(cx,cy),r,255,-1,cv2.LINE_AA)
    return m.astype(np.float32)/255
def aplica(img,b,alpha=1.0):
    x0,y0,x1,y1=b["caixa"]; reg=img[y0:y1,x0:x1]; h,w=reg.shape[:2]; k=cfg["bloco_px"]
    px=cv2.resize(cv2.resize(reg,(max(1,w//k),max(1,h//k)),interpolation=cv2.INTER_AREA),(w,h),interpolation=cv2.INTER_NEAREST)
    px=cv2.GaussianBlur(px,(0,0),k*0.6)
    m=mascara(w,h,cfg["raio_px"])[...,None]*alpha
    img[y0:y1,x0:x1]=(px*m+reg*(1-m)).astype(np.uint8); return img
def ativos(fonte,t): return [b for b in cfg["borroes"] if b["ativo"] and b["fonte"]==fonte and b["in"]<=t<=b["out"]]
def folhas():
    os.makedirs(f"{BASE}/review/borroes",exist_ok=True)
    for b in cfg["borroes"]:
        ts=[b["in"]+0.02,(b["in"]+b["out"])/2,b["out"]-0.05]
        linhas=[]
        for t in ts:
            a=quadro(b["fonte"],t); d=a.copy()
            for bb in ativos(b["fonte"],t)+([] if b["ativo"] else [b]): d=aplica(d,bb)
            x0,y0,x1,y1=b["caixa"]; cv2.rectangle(a,(x0,y0),(x1,y1),(0,0,255),2)
            row=np.hstack([cv2.resize(a,(640,360)),cv2.resize(d,(640,360))])
            # zoom 2x da região (depois)
            zx0,zy0=max(0,x0-40),max(0,y0-30); zx1,zy1=min(1280,x1+40),min(720,y1+30)
            z=d[zy0:zy1,zx0:zx1]; s=1280/z.shape[1]; z=cv2.resize(z,(1280,min(220,int(z.shape[0]*s))))
            lab=np.zeros((28,1280,3),np.uint8)
            cv2.putText(lab,f"{b['id']}  fonte {b['fonte']}  t={t:.2f}s   ANTES (vermelho = area)  |  DEPOIS" + ("" if b["ativo"] else "  [SIMULACAO - inativo]"),(8,20),cv2.FONT_HERSHEY_SIMPLEX,0.55,(255,255,255),1)
            linhas+= [lab,row,z]
        cv2.imwrite(f"{BASE}/review/borroes/{b['id']}.png",np.vstack(linhas))
        print(b["id"],"ok")
if __name__=="__main__" and sys.argv[1]=="folhas": folhas()
