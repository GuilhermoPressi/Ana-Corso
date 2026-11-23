"""Montagem completa a partir de config/edl.json, blur.json e motion.json.
Etapas (cada uma com cache em trabalho/montagem/):
  python montagem.py timeline   -> grade de quadros (30 fps) fonte->final
  python montagem.py video      -> segmentos 1080p (borrão + upscale + punch-in) e base.mp4
  python montagem.py voz        -> voz_raw.wav (cortes com fade 8 ms, sem drift)
  python montagem.py motion     -> PNGs RGBA de cada inserção, tempos remapeados para o final
  python montagem.py mix        -> mix.wav (voz tratada -14 LUFS, trilha com sidechain, efeitos)
  python montagem.py leve       -> export/<nome>_leve.mp4 (2500k) para revisão
  python montagem.py final      -> export/<nome>_final.mp4 (só com aprovação)
"""
import json, os, sys, subprocess, math, wave
import numpy as np
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0,f"{B}/scripts")
import ffblur
FPS=30; SR=48000; SPF=SR//FPS
W=f"{B}/trabalho/montagem"; os.makedirs(W,exist_ok=True)
NOME="100k_por_mes_low_ticket"
FONTE={"01":f"{B}/brutos/01_100KPORMESSEESTIVESSECOMECANDO.mov","02":f"{B}/brutos/02_100KPORMESSEESTIVESSECOMECANDO.mov"}
TELA_FINAL_S=15.0
def run(cmd,**k): return subprocess.run(cmd,check=True,**k)

# ---------- timeline (grade de quadros) ----------
def palavras(f):
    d=json.load(open(f"{B}/trabalho/transcricao_{f}.json")); return [w for s in d["segmentos"] for w in s["words"]]
_MOV={}
def tela_muda(f,a,b):
    """True se a tela (fora da webcam) muda de forma visível entre a e b."""
    if f not in _MOV:
        cache=f"{W}/mov_{f}.npy"
        if os.path.exists(cache): _MOV[f]=np.load(cache)
        else:
            raw=run(["ffmpeg","-v","error","-i",FONTE[f],"-vf","fps=4,crop=920:500:0:220,scale=92:50,format=gray","-f","rawvideo","-"],capture_output=True).stdout
            fr=np.frombuffer(raw,np.uint8).reshape(-1,50,92).astype(np.int16)
            d=np.concatenate([[0],np.abs(np.diff(fr,axis=0)).mean(axis=(1,2))]); np.save(cache,d); _MOV[f]=d
    d=_MOV[f]; i0,i1=int(a*4),int(b*4)+1
    return bool(len(d[i0:i1]) and d[i0:i1].max()>3)
def timeline():
    e=json.load(open(f"{B}/config/edl.json")); Wd={f:palavras(f) for f in FONTE}
    cen=json.load(open(f"{B}/trabalho/cenas.json"))
    tipo=lambda f,t: next((c["tipo"] for c in cen[f] if c["inicio"]<=t<c["fim"]),"camera")
    segs=[]; fpos=0
    for k in e["manter"]:
        ws=[w for w in Wd[k["fonte"]] if k["in"]<=w["s"] and w["e"]<=k["out"]+0.3]
        cuts=[]
        for a,b in zip(ws,ws[1:]):
            g=b["s"]-a["e"]
            if g>e["pausa_max"]:
                m=e["pausa_alvo"]/2; c0,c1=a["e"]+m,b["s"]-m
                if tipo(k["fonte"],(c0+c1)/2)=="tela" and tela_muda(k["fonte"],c0,c1):
                    continue   # tela em movimento: mantém a pausa para a ação não pular
                cuts.append((c0,c1))
        ini=k["in"]
        for c0,c1 in cuts+[(k["out"],None)]:
            i0,i1=round(ini*FPS),round(c0*FPS)
            if i1>i0:
                segs.append({"k":k["id"],"fonte":k["fonte"],"in_f":i0,"out_f":i1,"final_f":fpos,"tipo":tipo(k["fonte"],(i0+i1)/2/FPS),"cobrir":k.get("cobrir",[])}); fpos+=i1-i0
            if c1 is None: break
            ini=c1
    # punch-in: alterna 1.00/1.07 a cada corte seco entre trechos de câmera consecutivos da mesma tomada
    z=1.0
    for i,s in enumerate(segs):
        prev=segs[i-1] if i else None
        if s["tipo"]=="camera" and prev and prev["tipo"]=="camera" and prev["fonte"]==s["fonte"] and abs(prev["out_f"]-s["in_f"])>0:
            z=1.07 if z==1.0 else 1.0
        elif s["tipo"]!="camera": z=1.0
        s["zoom"]=z if s["tipo"]=="camera" else 1.0
    json.dump(segs,open(f"{W}/timeline.json","w"))
    tot=fpos/FPS; print("segmentos",len(segs),"duração %d:%04.1f"%(tot//60,tot%60)); return segs
def carregar(): return json.load(open(f"{W}/timeline.json"))
def f2final(segs,f,t):
    fr=t*FPS
    for s in segs:
        if s["fonte"]==f and s["in_f"]<=fr<=s["out_f"]: return (s["final_f"]+fr-s["in_f"])/FPS
    nx=[s for s in segs if s["fonte"]==f and s["in_f"]>fr]
    return nx[0]["final_f"]/FPS if nx else None
def duracao(segs): return (segs[-1]["final_f"]+segs[-1]["out_f"]-segs[-1]["in_f"])/FPS

# ---------- vídeo ----------
def chave_seg(s):
    import hashlib; return hashlib.md5(json.dumps([s["fonte"],s["in_f"],s["out_f"],s["zoom"],s["cobrir"],json.load(open(f"{B}/config/blur.json"))["borroes"]],sort_keys=True).encode()).hexdigest()[:12]
def render_seg(i,s):
    o=f"{W}/seg/{chave_seg(s)}.mp4"
    if os.path.exists(o): return o
    os.makedirs(f"{W}/seg",exist_ok=True)
    a=s["in_f"]/FPS; n=s["out_f"]-s["in_f"]; b=a+n/FPS
    ins=["-ss",f"{a:.4f}","-i",FONTE[s["fonte"]]]
    bins,bfl,cur=ffblur.filtro(s["fonte"],a,b,"[0:v]",1)
    ins+=bins; idx=1+len(bins)//4; fl=[bfl] if bfl else []
    for c in s["cobrir"]:
        if c["out"]<=a or c["in"]>=b: continue
        off=max(0,c["in"]-a); d=min(b,c["out"])-max(a,c["in"])
        if c.get("congelar"):
            png=f"{W}/cobrir_{c['com_in']}.png"
            if not os.path.exists(png): run(["ffmpeg","-v","error","-y","-ss",str(c["com_in"]),"-i",FONTE[c["com_fonte"]],"-frames:v","1",png])
            ins+=["-loop","1","-framerate",str(FPS),"-i",png]
        else:
            ins+=["-ss",str(c["com_in"]+max(0,a-c["in"])),"-i",FONTE[c["com_fonte"]]]
        fl.append(f"[{idx}:v]trim=duration={d:.4f},setpts=PTS-STARTPTS+{off:.4f}/TB[cv{idx}];{cur}[cv{idx}]overlay=0:0:eof_action=pass:enable='between(t,{off:.4f},{off+d:.4f})'[co{idx}]"); cur=f"[co{idx}]"; idx+=1
    z=s["zoom"]
    esc=f"scale={round(1920*z)}:{round(1080*z)}:flags=lanczos,crop=1920:1080:{round((1920*z-1920)*0.52)}:{round((1080*z-1080)*0.4)}" if z>1 else "scale=1920:1080:flags=lanczos"
    fl.append(f"{cur}fps={FPS},{esc},setsar=1,format=yuv420p[v]")
    run(["ffmpeg","-v","error","-y",*ins,"-filter_complex",";".join(fl),"-map","[v]","-frames:v",str(n),"-an","-c:v","libx264","-preset","veryfast","-crf","14","-g","30",o])
    return o
def video():
    segs=carregar()
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(2) as ex: list(ex.map(lambda p: render_seg(*p), enumerate(segs)))
    open(f"{W}/lista.txt","w").write("".join(f"file 'seg/{chave_seg(x)}.mp4'\n" for x in segs))
    run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{W}/lista.txt","-c","copy",f"{W}/base.mp4"])
    print("base ok")

# ---------- voz ----------
def voz():
    segs=carregar(); src={}
    for f in FONTE:
        raw=run(["ffmpeg","-v","error","-i",FONTE[f],"-vn","-f","f32le","-ac","2","-ar",str(SR),"-"],capture_output=True).stdout
        src[f]=np.frombuffer(raw,np.float32).reshape(-1,2)
    out=[]; fd=int(0.008*SR); ramp=np.linspace(0,1,fd)[:,None]
    for s in segs:
        x=src[s["fonte"]][s["in_f"]*SPF:s["out_f"]*SPF].copy()
        x[:fd]*=ramp; x[-fd:]*=ramp[::-1]
        for c in s["cobrir"]: pass  # cobertura é só de imagem; o áudio original continua
        out.append(x)
    y=np.concatenate(out)
    w=wave.open(f"{W}/voz_raw.wav","wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(y,-1,1)*32767).astype(np.int16).tobytes()); w.close()
    print("voz",len(y)/SR)

# ---------- motion ----------
SONS={"mapa":lambda p:[("sopro",0.0),("impacto",0.35)],
      "frase":lambda p:[("ponto",p["tempos"][0])]+([("tick",p["tempos"][-1]+0.2)] if p.get("chaveLinha") is not None else []),
      "destaque":lambda p:[("traco",p["passos"][0]["t"])]+[("tick",x["t"]) for x in p["passos"][1:]],
      "metrica":lambda p:[("ponto",0.0)]+[("tick",t) for t in p["tempos"]],
      "escada":lambda p:[("sopro",0.0)]+[("tick",t) for t in p["tempos"][:-1]]+[("impacto",p["tempos"][-1])],
      "antesdepois":lambda p:[("sopro",0.0),("tick",p["tAntes"]),("impacto",p["tDepois"])],
      "lowerthird":lambda p:[("ponto",0.0)],
      "final":lambda p:[("sopro",0.0),("resolucao",0.5)],
      "cartao":lambda p:[("ponto",0.0)]+[("tick",t) for t in p["tempos"][1:]],
      "titulo":lambda p:[("sopro",0.0),("impacto",p["tempos"][p["destaque"]])],
      "estrutura":lambda p:[("sopro",0.0),("tick",p["tempos"]["n1"]),("tick",p["tempos"]["n2"])]+[("tick",t) for t in p["tempos"]["tags"]]+[("impacto",p["tempos"]["criativos"])]}
def plano():
    segs=carregar(); d=json.load(open(f"{B}/config/motion.json"))["insercoes"]; out=[]
    for m in d:
        p=json.loads(json.dumps(m["props"]))
        if m["fonte"] is None: F=duracao(segs)
        else:
            F=f2final(segs,m["fonte"],m["T"]); rm=lambda x: round(f2final(segs,m["fonte"],m["T"]+x)-F,3)
            if "tempos" in p:
                if isinstance(p["tempos"],dict): p["tempos"]={k:([rm(x) for x in v] if isinstance(v,list) else rm(v)) for k,v in p["tempos"].items()}
                else: p["tempos"]=[rm(x) for x in p["tempos"]]
            for k in ("tAntes","tDepois"):
                if k in p: p[k]=rm(p[k])
            if "passos" in p and isinstance(p["passos"][0],dict):
                for x in p["passos"]: x["t"]=rm(x["t"])
            p["dur"]=max(rm(p["dur"]),1.5)
        p.pop("caixas",None)
        out.append({"id":m["id"],"comp":m["comp"],"F":round(F,3),"props":p,"sons":SONS[m["comp"]](p)})
    json.dump(out,open(f"{W}/motion_final.json","w"),ensure_ascii=False,indent=1); return out
def motion():
    P=plano()
    from concurrent.futures import ThreadPoolExecutor
    def r(m):
        d=f"{W}/mo/{m['id']}"; marca=f"{d}/.ok_"+str(abs(hash(json.dumps(m['props'],sort_keys=True))))
        if os.path.exists(marca): return
        run(["rm","-rf",d]); run(["node",f"{B}/motion/render.mjs",m["comp"],json.dumps(m["props"]),d],capture_output=True); open(marca,"w").close()
        print(m["id"],"ok",flush=True)
    with ThreadPoolExecutor(2) as ex: list(ex.map(r,P))

# ---------- mix ----------
def mix():
    segs=carregar(); P=json.load(open(f"{W}/motion_final.json")); T=duracao(segs)+TELA_FINAL_S
    # 1) voz: declip, passa-alta, de-ess leve, compressão suave, loudnorm 2 passos (-14 LUFS / -1.5 dBTP antes do limiter final)
    pre="adeclip=window=55:overlap=75,highpass=f=70,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=6500:t=q:w=2:g=-2,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2"
    m=run(["ffmpeg","-v","info","-y","-i",f"{W}/voz_raw.wav","-af",pre+",loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json","-f","null","-"],capture_output=True,text=True).stderr
    j=json.loads(m[m.rindex("{"):m.rindex("}")+1])
    ln=f"loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
    run(["ffmpeg","-v","error","-y","-i",f"{W}/voz_raw.wav","-af",pre+","+ln+f",apad=whole_dur={T}","-ar",str(SR),f"{W}/voz.wav"])
    # 2) efeitos: um som por impacto, posicionados no tempo final
    fx=np.zeros((int(T*SR)+SR,2),np.float32)
    def lewav(n):
        w=wave.open(f"{B}/assets/sfx/{n}.wav"); a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32767; return a
    for mo in P:
        for n,t in mo["sons"]:
            a=lewav(n)*0.5; i=int((mo["F"]+t)*SR); fx[i:i+len(a)]+=a[:,None][:len(fx)-i]
    w=wave.open(f"{W}/sfx.wav","wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(fx,-1,1)*32767).astype(np.int16).tobytes()); w.close()
    # 3) trilha baixa com sidechain pela voz, sobe um pouco na tela final
    run(["python3",f"{B}/scripts/trilha.py",str(T)])
    fim=duracao(segs)
    fc=(f"[1:a]volume=0.22,volume='if(gte(t,{fim:.2f}),2.2,1)':eval=frame[tr];[0:a]asplit[v1][v2];"
        f"[tr][v2]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400:makeup=1[duck];"
        f"[v1][duck][2:a]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.89:level=false[a]")
    run(["ffmpeg","-v","error","-y","-i",f"{W}/voz.wav","-i",f"{B}/assets/trilhas/trilha_pad.wav","-i",f"{W}/sfx.wav","-filter_complex",fc,"-map","[a]","-t",str(T),"-ar",str(SR),f"{W}/mix.wav"])
    r=run(["ffmpeg","-v","info","-i",f"{W}/mix.wav","-af","ebur128=peak=true","-f","null","-"],capture_output=True,text=True).stderr
    print([l.strip() for l in r.splitlines() if l.strip().startswith(("I:","Peak:"))][-2:])

# ---------- composição final ----------
def compor(saida,venc):
    segs=carregar(); P=json.load(open(f"{W}/motion_final.json")); T=duracao(segs)+TELA_FINAL_S
    ins=["-i",f"{W}/base.mp4","-i",f"{W}/mix.wav"]; fl=[f"[0:v]tpad=stop_mode=clone:stop_duration={TELA_FINAL_S}[b0]"]; cur="[b0]"
    for k,m in enumerate(P):
        ins+=["-itsoffset",f"{m['F']:.4f}","-framerate",str(FPS),"-i",f"{W}/mo/{m['id']}/%05d.png"]
        fl.append(f"{cur}[{k+2}:v]overlay=0:0:eof_action=pass:format=auto[o{k}]"); cur=f"[o{k}]"
    fl.append(f"{cur}format=yuv420p[v]")
    run(["ffmpeg","-v","error","-y",*ins,"-filter_complex",";".join(fl),"-map","[v]","-map","1:a","-t",f"{T:.3f}","-r",str(FPS),*venc,"-c:a","aac","-b:a","192k","-ar","48000","-movflags","+faststart",saida])
    print("ok",saida)
def leve():
    os.makedirs(f"{B}/export",exist_ok=True)
    compor(f"{B}/export/{NOME}_leve.mp4",["-c:v","libx264","-preset","medium","-b:v","2500k","-maxrate","3000k","-bufsize","5000k","-profile:v","high"])
def final():
    compor(f"{B}/export/{NOME}_final.mp4",["-c:v","libx264","-preset","slow","-crf","17","-profile:v","high","-pix_fmt","yuv420p"])

if __name__=="__main__":
    {"timeline":timeline,"video":video,"voz":voz,"motion":motion,"mix":mix,"leve":leve,"final":final,"plano":plano}[sys.argv[1]]()
