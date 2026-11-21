"""Trilha de fundo sintetizada (CC0, sem amostras): pad suave Am–F–C–G a 115 BPM + pulso leve, loop de 16 compassos.
Uso: python trilha.py <segundos> -> assets/trilhas/trilha_pad.wav (48 kHz estéreo, pico -12 dBFS)"""
import numpy as np, wave, sys, os
SR=48000; dur=float(sys.argv[1]) if len(sys.argv)>1 else 120
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); O=f"{B}/assets/trilhas"; os.makedirs(O,exist_ok=True)
bpm=115; beat=60/bpm; bar=4*beat
acordes=[[57,60,64,69],[53,57,60,65],[48,55,60,64],[55,59,62,67]]  # Am F C G (MIDI)
hz=lambda n:440*2**((n-69)/12)
loop_bars=8; L=int(loop_bars*bar*SR); t=np.arange(L)/SR
x=np.zeros((L,2),np.float32); rng=np.random.default_rng(3)
for i in range(loop_bars):
    ch=acordes[i%4]; a=int(i*bar*SR); b=int((i+1)*bar*SR)+int(.6*SR); b=min(b,L); tt=np.arange(b-a)/SR
    env=np.minimum(1,tt/0.9)*np.minimum(1,np.maximum(0,(bar+.6-tt)/0.6))
    for k,n in enumerate(ch):
        f=hz(n); det=[0.997,1.003]
        for c in range(2):
            ph=rng.uniform(0,6.28)
            v=np.sin(2*np.pi*f*det[c]*tt+ph)+0.25*np.sin(2*np.pi*2*f*det[c]*tt+ph)
            x[a:b,c]+=v*env*(0.16 if k else 0.22)
    # baixo na tônica
    f=hz(ch[0]-12); x[a:b,:]+=(np.sin(2*np.pi*f*tt)*env*0.25)[:,None]
# pulso de colcheias (bloom de volume) — dá movimento sem bateria
pul=0.82+0.18*np.cos(2*np.pi*t/(beat/2))**2
x*=pul[:,None]
# chocalho muito leve nos contratempos
for j in range(int(loop_bars*8)):
    s=int((j+.5)*beat/2*SR)
    if s+2400<L and j%2==1:
        n=rng.standard_normal(2400)*np.exp(-np.arange(2400)/300); n=np.diff(np.concatenate([[0],n]))
        x[s:s+2400,:]+=(n*0.05)[:,None]
# suaviza (passa-baixa simples) e normaliza
from functools import reduce
k=np.exp(-2*np.pi*3500/SR); y=np.zeros_like(x)
for i in range(1,L): y[i]=(1-k)*x[i]+k*y[i-1]
y/=np.abs(y).max(); y*=10**(-12/20)
n=int(dur*SR); rep=np.tile(y,(n//L+1,1))[:n]
fade=int(3*SR); rep[:fade]*=np.linspace(0,1,fade)[:,None]; rep[-fade:]*=np.linspace(1,0,fade)[:,None]
w=wave.open(f"{O}/trilha_pad.wav","wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((rep*32767).astype(np.int16).tobytes()); w.close()
print("ok",dur)
