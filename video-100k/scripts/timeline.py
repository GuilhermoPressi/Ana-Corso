"""Linha do tempo final a partir do config/edl.json: aplica os cortes e encurta pausas > pausa_max para pausa_alvo.
fonte_para_final(fonte, t) -> segundos no vídeo final. Também exporta trabalho/timeline.json (segmentos finais)."""
import json, os
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def _palavras(f):
    d=json.load(open(f"{B}/trabalho/transcricao_{f}.json")); return [w for s in d["segmentos"] for w in s["words"]]
def segmentos():
    e=json.load(open(f"{B}/config/edl.json")); W={f:_palavras(f) for f in ["01","02"]}
    out=[]; tf=0.0
    for k in e["manter"]:
        ws=[w for w in W[k["fonte"]] if k["in"]<=w["s"] and w["e"]<=k["out"]+0.3]
        cortes=[]  # pausas internas a encurtar: (ini,fim) do trecho removido
        for a,b in zip(ws,ws[1:]):
            g=b["s"]-a["e"]
            if g>e["pausa_max"]:
                m=(e["pausa_alvo"])/2; cortes.append((a["e"]+m,b["s"]-m))
        ini=k["in"]
        for c0,c1 in cortes+[(k["out"],None)]:
            out.append({"k":k["id"],"fonte":k["fonte"],"in":round(ini,3),"out":round(c0,3),"final_in":round(tf,3)}); tf+=c0-ini
            if c1 is None: break
            ini=c1
    return out
_S=None
def fonte_para_final(f,t):
    global _S
    _S=_S or segmentos()
    for s in _S:
        if s["fonte"]==f and s["in"]<=t<=s["out"]: return s["final_in"]+t-s["in"]
    # dentro de pausa removida/corte: devolve o início do próximo segmento
    nx=[s for s in _S if s["fonte"]==f and s["in"]>t]
    return nx[0]["final_in"] if nx else None
def mmss(x): return f"{int(x//60)}:{x%60:04.1f}"
if __name__=="__main__":
    S=segmentos(); json.dump(S,open(f"{B}/trabalho/timeline.json","w"),indent=0)
    print("segmentos:",len(S),"duração final: %s"%mmss(S[-1]["final_in"]+S[-1]["out"]-S[-1]["in"]))
