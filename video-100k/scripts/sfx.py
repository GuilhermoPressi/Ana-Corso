"""Gera a paleta de efeitos sonoros do kit (síntese própria, domínio público/CC0). 48 kHz mono, pico -6 dBFS.
Uso: python sfx.py -> assets/sfx/*.wav"""
import numpy as np, wave, os
SR=48000; B=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); O=f"{B}/assets/sfx"; os.makedirs(O,exist_ok=True)
rng=np.random.default_rng(7)
def env(n,a,d): t=np.arange(n)/SR; return np.minimum(1,t/a)*np.exp(-t/d)
def save(nome,x,pico_db=-6):
    x=x/np.max(np.abs(x))*10**(pico_db/20); f=np.concatenate([np.zeros(int(.005*SR)),x,np.zeros(int(.05*SR))])
    w=wave.open(f"{O}/{nome}.wav","wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((f*32767).astype(np.int16).tobytes()); w.close()
def lp(x,fc):  # passa-baixa 1 polo
    a=np.exp(-2*np.pi*fc/SR); y=np.zeros_like(x); s=0
    for i,v in enumerate(x): s=(1-a)*v+a*s; y[i]=s
    return y
t=lambda d: np.arange(int(d*SR))/SR
# ponto: "pop" curto e macio (nascimento do ponto)
tt=t(.09); f=lerp=np.linspace(900,620,len(tt)); save("ponto",np.sin(2*np.pi*np.cumsum(f)/SR)*env(len(tt),.002,.025),-9)
# tick: clique tátil (itens de lista, contagem)
tt=t(.03); save("tick",(np.sin(2*np.pi*2400*tt)*.6+lp(rng.standard_normal(len(tt)),3000)*.4)*env(len(tt),.0005,.006),-12)
# impacto: grave suave (revelação de tela cheia / número final)
tt=t(.45); f=np.linspace(95,48,len(tt)); x=np.sin(2*np.pi*np.cumsum(f)/SR)*env(len(tt),.004,.12)+lp(rng.standard_normal(len(tt)),400)*env(len(tt),.002,.03)*.5; save("impacto",x,-6)
# sopro: movimento de máscara (abrir/fechar tela cheia), ruído filtrado com envelope em sino
tt=t(.5); n=lp(lp(rng.standard_normal(len(tt)),1800),1800); e=np.sin(np.pi*np.linspace(0,1,len(tt)))**2; save("sopro",n*e,-14)
# traço: desenho do destaque (ruído fino ascendente)
tt=t(.8); n=lp(rng.standard_normal(len(tt)),5000)-lp(rng.standard_normal(len(tt)),600); save("traco",n*np.sin(np.pi*np.linspace(0,1,len(tt)))**1.5,-18)
# resolução: acorde final (tela final), sinos suaves em quinta
tt=t(1.6); x=sum(np.sin(2*np.pi*fr*tt)*g for fr,g in [(392,1),(587.3,.7),(784,.35),(1174.7,.12)])*env(len(tt),.01,.55); save("resolucao",x,-10)
print(sorted(os.listdir(O)))
