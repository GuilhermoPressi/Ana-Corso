"""Prévia do kit: cada componente animado sobre um fundo real, com os sons do kit -> review/kit-preview.mp4"""
import json, subprocess, os
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg={s["id"]:s for s in json.load(open(f"{B}/motion/kit/style_frames.json"))}
sons={"1_capitulo":[("ponto",0),("sopro",.18),("impacto",.6)],
      "2_metrica":[("ponto",0),("tick",.45),("tick",1.0),("tick",1.55),("impacto",2.45)],
      "3_passos":[("ponto",0)]+[("tick",.6+i*1.0) for i in range(5)],
      "4_antesdepois":[("ponto",0),("sopro",.15),("tick",1.6),("impacto",2.3)],
      "5_destaque":[("ponto",0),("traco",.2),("tick",1.15)],
      "6_lowerthird":[("ponto",0)],
      "7_final":[("ponto",0),("sopro",.18),("resolucao",.5)]}
segs=[]
tmp=f"{B}/trabalho/kitprev"; os.makedirs(tmp,exist_ok=True)
for sid,s in cfg.items():
    d=f"{tmp}/{sid}"
    if not os.path.exists(f"{d}/00000.png"):
        subprocess.run(["node",f"{B}/motion/render.mjs",s["comp"],json.dumps(s["props"]),d],check=True,capture_output=True)
    n=len([f for f in os.listdir(d) if f.endswith(".png")]); dur=n/30+0.6
    fundo=f"{B}/motion/kit/{s['fundo'] or 'bg_camera.png'}"
    ins=["-loop","1","-framerate","30","-t",f"{dur}","-i",fundo,"-framerate","30","-i",f"{d}/%05d.png"]
    fl="[0][1]overlay=0:0:eof_action=pass,format=yuv420p[v]"; am=[]
    for k,(nome,t) in enumerate(sons[sid]):
        ins+=["-i",f"{B}/assets/sfx/{nome}.wav"]; fl+=f";[{k+2}]adelay={int(t*1000)}|{int(t*1000)},aformat=channel_layouts=stereo:sample_rates=48000[a{k}]"; am.append(f"[a{k}]")
    fl+=f";{''.join(am)}amix=inputs={len(am)}:normalize=0:duration=longest,apad=whole_dur={dur},atrim=0:{dur}[a]"
    o=f"{tmp}/{sid}.mp4"
    subprocess.run(["ffmpeg","-v","error","-y",*ins,"-filter_complex",fl,"-map","[v]","-map","[a]","-frames:v",str(int(dur*30)),"-c:v","libx264","-crf","20","-preset","fast","-c:a","aac","-b:a","160k","-ar","48000",o],check=True)
    segs.append(o)
open(f"{tmp}/lista.txt","w").write("".join(f"file '{x}'\n" for x in segs))
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{tmp}/lista.txt","-c","copy","-movflags","+faststart",f"{B}/review/kit-preview.mp4"],check=True)
print("ok")
