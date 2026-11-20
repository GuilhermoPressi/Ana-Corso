"""Classifica cada 0,5s como camera ou tela. Uso: python mapear_cenas.py <video> <saida.json>"""
import sys, json, subprocess, numpy as np
video, out = sys.argv[1], sys.argv[2]
W,H=64,36
raw=subprocess.run(["ffmpeg","-v","error","-i",video,"-vf",f"fps=2,scale={W}:{H},format=gray","-f","rawvideo","-"],capture_output=True,check=True).stdout
fr=np.frombuffer(raw,np.uint8).reshape(-1,H,W).astype(np.float32)
# camera: janela clara na metade de cima + pessoa; tela: barra de menu fina no topo (linhas 0-1) e UI
top=fr[:,0:2,:].mean(axis=(1,2)); 
# feature: diferenca para a mediana dos quadros de camera conhecidos (luminosidade da janela)
win=fr[:,3:18,20:64].mean(axis=(1,2))
std_top=fr[:,0:1,:].std(axis=(1,2))
lab=[]
for i in range(len(fr)):
    lab.append("camera" if win[i]>150 and std_top[i]>25 else "tela")
json.dump({"fps_amostra":2,"label":lab,"win":win.tolist(),"top":top.tolist(),"stdtop":std_top.tolist()},open(out,"w"))
