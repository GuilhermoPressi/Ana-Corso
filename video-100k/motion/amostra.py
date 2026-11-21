"""Monta a amostra sincronizada sobre o vídeo real -> review/amostra-motion.mp4"""
import json, subprocess, os, sys
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0,f"{B}/scripts")
import ffblur
FONTE={"01":f"{B}/brutos/01_100KPORMESSEESTIVESSECOMECANDO.mov","02":f"{B}/brutos/02_100KPORMESSEESTIVESSECOMECANDO.mov"}
cfg=json.load(open(f"{B}/motion/amostra.json")); tmp=f"{B}/trabalho/amostra"; os.makedirs(tmp,exist_ok=True)
so=[m for m in sys.argv[1:]] or None
segs=[]
for m in cfg:
    o=f"{tmp}/{m['id']}.mp4"; segs.append(o)
    if so and m["id"] not in so and os.path.exists(o): continue
    d=f"{tmp}/{m['id']}_png"
    subprocess.run(["rm","-rf",d]); subprocess.run(["node",f"{B}/motion/render.mjs",m["comp"],json.dumps(m["props"]),d],check=True,capture_output=True)
    a,b=m["clip"]; off=m["T"]-a
    ins=["-ss",str(a),"-t",str(b-a),"-i",FONTE[m["fonte"]]]
    bins,bfl,cur=ffblur.filtro(m["fonte"],a,b,"[0:v]",1)
    ins+=bins; k=1+len(bins)//4
    ins+=["-itsoffset",f"{off:.3f}","-framerate","30","-i",f"{d}/%05d.png"]; ov=k; k+=1
    fl=(bfl+";" if bfl else "")+f"{cur}scale=1920:1080:flags=lanczos,setsar=1[base];[{ov}:v]format=rgba[ovl];[base][ovl]overlay=0:0:eof_action=pass,format=yuv420p[v]"
    am=["[0:a]volume=1.0[a0]"]; lab=["[a0]"]
    for j,(nome,t) in enumerate(m["sons"]):
        ins+=["-i",f"{B}/assets/sfx/{nome}.wav"]; ms=int((off+t)*1000)
        am.append(f"[{k}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.5,adelay={ms}|{ms}[s{j}]"); lab.append(f"[s{j}]"); k+=1
    fl+=";"+";".join(am)+f";{''.join(lab)}amix=inputs={len(lab)}:normalize=0:duration=first,alimiter=limit=0.89[a]"
    subprocess.run(["ffmpeg","-v","error","-y",*ins,"-filter_complex",fl,"-map","[v]","-map","[a]","-t",str(b-a),"-r","30","-c:v","libx264","-crf","19","-preset","fast","-c:a","aac","-b:a","192k","-ar","48000",o],check=True)
    print(m["id"],"ok",flush=True)
open(f"{tmp}/lista.txt","w").write("".join(f"file '{x}'\n" for x in segs))
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{tmp}/lista.txt","-c","copy","-movflags","+faststart",f"{B}/review/amostra-motion.mp4"],check=True)
print("ok")
