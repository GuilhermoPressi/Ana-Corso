"""Montagem dos vídeos avulsos de CTA (03) e inserção (04). Uso: python3 scripts/cta.py <03|04> [previa|final]
Config em config/cta.json: trechos mantidos (tempo-fonte), elementos (tempo-fonte). Aprovado em review/erros_cta_insercao.md."""
import json, os, subprocess, sys, hashlib, shutil
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS=30; SR=48000; SFX_GANHO=0.25
def run(c,**k): return subprocess.run(c,check=True,**k)
P=sys.argv[1]; MODO=sys.argv[2] if len(sys.argv)>2 else "previa"
cfg=json.load(open(f"{B}/config/cta.json"))[P]
FONTE=f"{B}/brutos/{cfg['bruto']}"; W=f"{B}/trabalho/cta_{P}"; os.makedirs(W,exist_ok=True)
tr=json.load(open(f"{B}/trabalho/transcricao_{P}.json"))
ws=[w for s in tr["segmentos"] for w in s["words"] if w["e"]-w["s"]<1.5]
frases=[s["start"] for s in tr["segmentos"]]

# 1) peças: trechos mantidos -> encurta pausas > 0,6s para 0,35s -> quebra peças longas no início de frase (punch-in)
pecas=[]
for a,b in cfg["manter"]:
    cortes=[a]
    dentro=[w for w in ws if w["s"]>=a and w["e"]<=b]
    for w1,w2 in zip(dentro,dentro[1:]):
        if w2["s"]-w1["e"]>0.6: cortes+=[w1["e"]+0.15, w2["s"]-0.2]
    cortes.append(b)
    for i in range(0,len(cortes),2): pecas.append([cortes[i],cortes[i+1],"corte"])
final=[]
for a,b,_ in pecas:
    marcas=[a]
    for f in frases:
        if a+5<f<b-3 and f-marcas[-1]>6: marcas.append(f-0.05)
    marcas.append(b)
    for i,(x,y) in enumerate(zip(marcas,marcas[1:])): final.append({"a":x,"b":y})
z=1.0; t=0
for s in final:
    s["in_f"]=round(s["a"]*FPS); s["out_f"]=round(s["b"]*FPS); s["final_f"]=t; t+=s["out_f"]-s["in_f"]
    z=1.07 if z==1.0 else 1.0; s["zoom"]=z
TOTAL=t/FPS
def mapa(ts):
    f=ts*FPS
    for s in final:
        if f<s["in_f"]: return s["final_f"]/FPS
        if f<s["out_f"]: return (s["final_f"]+f-s["in_f"])/FPS
    return TOTAL
json.dump(final,open(f"{W}/timeline.json","w"),indent=1)
print(f"{len(final)} peças, {TOTAL:.2f}s")

# 2) vídeo e voz por peça (frame-exato)
def peca(i,s):
    k=hashlib.md5(json.dumps([cfg["bruto"],s["in_f"],s["out_f"],s["zoom"]]).encode()).hexdigest()[:10]
    v=f"{W}/p{i:03d}_{k}.mp4"; a=f"{W}/p{i:03d}_{k}.wav"
    if not os.path.exists(v):
        zz=s["zoom"]; esc=f"scale={round(1920*zz)}:{round(1080*zz)}:flags=lanczos,crop=1920:1080:{round((1920*zz-1920)/2)}:{round((1080*zz-1080)*0.35)}" if zz>1 else "scale=1920:1080:flags=lanczos"
        run(["ffmpeg","-v","error","-y","-i",FONTE,"-vf",f"trim=start_frame={s['in_f']}:end_frame={s['out_f']},setpts=PTS-STARTPTS,{esc},format=yuv420p","-an","-c:v","libx264","-preset","fast","-crf","12","-r","30",v+".tmp.mp4"]); os.rename(v+".tmp.mp4",v)
        n=s["out_f"]-s["in_f"]
        run(["ffmpeg","-v","error","-y","-i",FONTE,"-af",f"atrim=start_sample={s['in_f']*1600}:end_sample={s['out_f']*1600},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st={n/FPS-0.008:.4f}:d=0.008","-ac","2","-ar","48000",a])
    return v,a
arqs=[peca(i,s) for i,s in enumerate(final)]
open(f"{W}/v.txt","w").write("".join(f"file '{v}'\n" for v,_ in arqs))
open(f"{W}/a.txt","w").write("".join(f"file '{a}'\n" for _,a in arqs))
run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{W}/v.txt","-c","copy",f"{W}/base.mp4"])
run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{W}/a.txt","-c","copy",f"{W}/voz_raw.wav"])

# 3) voz: mesma cadeia do vídeo principal, loudnorm 2 passos
def ln2(src,dst,pre,tp):
    m=run(["ffmpeg","-v","info","-y","-i",src,"-af",(pre+"," if pre else "")+f"loudnorm=I=-14:TP={tp}:LRA=11:print_format=json","-f","null","-"],capture_output=True,text=True).stderr
    j=json.loads(m[m.rindex("{"):m.rindex("}")+1])
    run(["ffmpeg","-v","error","-y","-i",src,"-af",(pre+"," if pre else "")+f"loudnorm=I=-14:TP={tp}:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000","-ar","48000",dst])
ln2(f"{W}/voz_raw.wav",f"{W}/voz.wav","adeclip=window=55:overlap=75,highpass=f=70,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=6500:t=q:w=2:g=-2,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2",-1.5)

# 4) elementos: tempo-fonte -> tempo final; render PNG com alfa
els=[]
for e in cfg["elementos"]:
    F=mapa(e["ini"]); fim=mapa(e["fim"]) if "fim" in e else TOTAL
    props=dict(e.get("props",{})); props["dur"]=round(fim-F,3)
    if "cliques" in e: props["cliques"]={k:round(mapa(v)-F,3) for k,v in e["cliques"].items()}
    k=hashlib.md5((json.dumps([e["comp"],props])+open(f"{B}/motion/kit/kit.html").read()).encode()).hexdigest()[:10]
    d=f"{W}/mo_{e['id']}_{k}"
    if not os.path.exists(d+"/ok"):
        shutil.rmtree(d,ignore_errors=True); run(["node",f"{B}/motion/render.mjs",e["comp"],json.dumps(props),d],stdout=subprocess.DEVNULL); open(d+"/ok","w")
    sons=[(F+v,"tick") for v in props.get("cliques",{}).values()] or [(F,"ponto")]
    els.append({"id":e["id"],"F":F,"dir":d,"sons":sons}); print(e["id"],f"{F:.2f}s",props["dur"],"s")

# 5) mix: voz + efeitos a 25%, master -14 LUFS / -2 dBTP
ins=["-i",f"{W}/voz.wav"]; fl=[]; n=1
for e in els:
    for ts,som in e["sons"]:
        ins+=["-i",f"{B}/assets/sfx/{som}.wav"]; fl.append(f"[{n}]adelay={int(ts*1000)}|{int(ts*1000)},volume={SFX_GANHO}[s{n}]"); n+=1
mixin="".join(f"[s{i}]" for i in range(1,n))
fl.append(f"[0]{mixin}amix=inputs={n}:normalize=0:duration=first[m]")
run(["ffmpeg","-v","error","-y",*ins,"-filter_complex",";".join(fl),"-map","[m]","-ar","48000",f"{W}/mix_raw.wav"])
ln2(f"{W}/mix_raw.wav",f"{W}/mix.wav","",-2)

# 6) composição
nome=cfg["nome"]; saida=f"{B}/export/{nome}_{'final' if MODO=='final' else 'previa'}.mp4"
ins=["-i",f"{W}/base.mp4"]; fl=[]; ult="0:v"
for i,e in enumerate(els,1):
    ins+=["-itsoffset",f"{e['F']:.4f}","-framerate","30","-i",f"{e['dir']}/%05d.png"]
    fl.append(f"[{ult}][{i}:v]overlay=eof_action=pass:format=auto[o{i}]"); ult=f"o{i}"
ins+=["-i",f"{W}/mix.wav"]
venc=["-c:v","libx264","-preset","slow","-crf","17","-profile:v","high","-pix_fmt","yuv420p"] if MODO=="final" else ["-c:v","libx264","-preset","medium","-b:v","2500k","-pix_fmt","yuv420p"]
run(["ffmpeg","-v","error","-y",*ins,"-filter_complex",";".join(fl),"-map",f"[{ult}]","-map",f"{len(els)+1}:a",*venc,"-r","30","-c:a","aac","-b:a","192k","-ar","48000","-movflags","+faststart","-t",f"{TOTAL:.4f}",saida])
print("ok",saida)
