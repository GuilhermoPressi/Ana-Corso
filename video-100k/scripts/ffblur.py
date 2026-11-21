"""Gera o trecho de filtro ffmpeg que aplica os borrões ativos de config/blur.json num corte [a,b] da fonte (coordenadas 1280x720).
Pixelização (bloco 14) + desfoque gaussiano + máscara de cantos arredondados. Retorna (inputs_extra, filtro, rotulo_saida)."""
import json, os, cv2, numpy as np
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def mascara(w,h,r):
    f=f"{B}/trabalho/masks/m_{w}x{h}_{r}.png"
    if not os.path.exists(f):
        os.makedirs(os.path.dirname(f),exist_ok=True); m=np.zeros((h,w),np.uint8)
        cv2.rectangle(m,(r,0),(w-r,h),255,-1); cv2.rectangle(m,(0,r),(w,h-r),255,-1)
        for cx,cy in [(r,r),(w-r-1,r),(r,h-r-1),(w-r-1,h-r-1)]: cv2.circle(m,(cx,cy),r,255,-1,cv2.LINE_AA)
        cv2.imwrite(f,m)
    return f
def filtro(fonte,a,b,entrada="[0:v]",idx0=1):
    cfg=json.load(open(f"{B}/config/blur.json")); k=cfg["bloco_px"]; r=cfg["raio_px"]
    bs=[x for x in cfg["borroes"] if x["ativo"] and x["fonte"]==fonte and x["in"]<b and x["out"]>a]
    ins=[];fl=[];cur=entrada
    for i,x in enumerate(bs):
        x0,y0,x1,y1=x["caixa"]; w,h=x1-x0,y1-y0
        ins+=["-loop","1","-i",mascara(w,h,r)]; mi=idx0+i
        en=f"between(t,{max(0,x['in']-a):.3f},{x['out']-a:.3f})"
        fl.append(f"{cur}split[bA{i}][bB{i}];[bB{i}]crop={w}:{h}:{x0}:{y0},scale={max(1,w//k)}:{max(1,h//k)}:flags=area,scale={w}:{h}:flags=neighbor,gblur=sigma={k*0.6:.1f},format=rgba[px{i}];[{mi}:v]format=gray,scale={w}:{h}[mk{i}];[px{i}][mk{i}]alphamerge[pm{i}];[bA{i}][pm{i}]overlay={x0}:{y0}:enable='{en}':shortest=1[bo{i}]")
        cur=f"[bo{i}]"
    return ins,";".join(fl),cur
