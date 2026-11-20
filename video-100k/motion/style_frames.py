"""Renderiza os style frames do kit e monta review/style-frames.png"""
import json, subprocess, os, cv2, numpy as np
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg=json.load(open(f"{B}/motion/kit/style_frames.json"))
out=f"{B}/review/style"; os.makedirs(out,exist_ok=True)
tiles=[]
for s in cfg:
    d=f"{out}/{s['id']}"
    r=subprocess.run(["node",f"{B}/motion/render.mjs",s["comp"],json.dumps(s["props"]),d,"--t",",".join(map(str,s["t"]))],capture_output=True,text=True)
    if r.returncode: print(r.stderr); raise SystemExit
    for t in s["t"]:
        fg=cv2.imread(f"{d}/{s['comp']}_{t:.2f}.png",cv2.IMREAD_UNCHANGED)
        bg=cv2.imread(f"{B}/motion/kit/{s['fundo']}") if s["fundo"] else cv2.imread(f"{B}/motion/kit/bg_camera.png")
        a=fg[...,3:4]/255.0 if fg.shape[2]==4 else np.ones(fg.shape[:2]+(1,)); comp=(fg[...,:3]*a+bg*(1-a)).astype(np.uint8)
        cv2.imwrite(f"{d}/composto_{t:.2f}.png",comp)
        lab=np.full((44,1920,3),(19,21,22),np.uint8)
        cv2.putText(lab,f"{s['id']}   t={t:.2f}s",(16,32),cv2.FONT_HERSHEY_SIMPLEX,1.0,(244,244,244),2)
        tiles.append(np.vstack([lab,comp]))
rows=[np.hstack([cv2.resize(tiles[i],(960,562)),cv2.resize(tiles[i+1],(960,562))]) for i in range(0,len(tiles),2)]
cv2.imwrite(f"{B}/review/style-frames.png",np.vstack(rows))
print("ok",len(tiles))
