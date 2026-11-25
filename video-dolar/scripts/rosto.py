"""Detecta o rosto (frontal + perfil, Haar) a cada 0,5s nos trechos de câmera. Coordenadas em 1920x1080.
Saída: trabalho/rosto_<parte>.json  [{t, caixa:[x0,y0,x1,y1] ou null}]"""
import cv2, json, subprocess, numpy as np, sys
p=sys.argv[1]; cen=json.load(open("trabalho/cenas.json"))[p]
fr=cv2.CascadeClassifier(cv2.data.haarcascades+"haarcascade_frontalface_default.xml")
pf=cv2.CascadeClassifier(cv2.data.haarcascades+"haarcascade_profileface.xml")
W,H=640,360; out=[]
for c in cen:
    if c["tipo"]!="camera": continue
    raw=subprocess.run(["ffmpeg","-v","error","-ss",str(c["inicio"]),"-i",f"brutos/{p}_100KPORMESSEESTIVESSECOMECANDO.mov","-t",str(c["fim"]-c["inicio"]),"-vf",f"fps=2,scale={W}:{H},format=gray","-f","rawvideo","-"],capture_output=True).stdout
    fs=np.frombuffer(raw,np.uint8).reshape(-1,H,W)
    for i,g in enumerate(fs):
        cand=[]
        for det,flip in [(fr,False),(pf,False),(pf,True)]:
            im=cv2.flip(g,1) if flip else g
            for (x,y,w,h) in det.detectMultiScale(im,1.1,5,minSize=(50,50)):
                if flip: x=W-x-w
                cand.append((w*h,x,y,w,h))
        b=None
        if cand:
            _,x,y,w,h=max(cand); s=1920/W; b=[int(x*s),int(y*s),int((x+w)*s),int((y+h)*s)]
        out.append({"t":round(c["inicio"]+i/2,2),"caixa":b})
json.dump(out,open(f"trabalho/rosto_{p}.json","w"))
ok=[o for o in out if o["caixa"]]
xs=np.array([o["caixa"] for o in ok])
print(p,len(out),"detectados",len(ok),"x0 p5/p50 %d/%d  x1 p50/p95 %d/%d  y0 p50 %d y1 p95 %d"%(np.percentile(xs[:,0],5),np.median(xs[:,0]),np.median(xs[:,2]),np.percentile(xs[:,2],95),np.median(xs[:,1]),np.percentile(xs[:,3],95)))
