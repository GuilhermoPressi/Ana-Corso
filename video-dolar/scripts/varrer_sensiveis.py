"""Varre OCR (trabalho/ocr_XX.jsonl) por padrões sensíveis. Agrupa por (tipo, texto) com primeira/última aparição e bbox.
Uso: python varrer_sensiveis.py 01 02 -> trabalho/suspeitos.json"""
import sys, json, re
P={
 "email": re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"),
 "telefone": re.compile(r"(\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}"),
 "cpf_cnpj": re.compile(r"\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}"),
 "valor_rs": re.compile(r"R\$\s?[\d.]+,\d{2}|^[\d]{1,3}(\.\d{3})+,\d{2}$"),
 "url_privada": re.compile(r"(dashboards/|/folders/|/file/d/|checkout|pay\.|token|key=|apikey)",re.I),
 "id_longo": re.compile(r"[a-f0-9]{16,}",re.I),
}
out=[]
for p in sys.argv[1:]:
    amostras=[json.loads(l) for l in open(f"trabalho/ocr_{p}.jsonl")]
    bym={a["t"]:a for a in amostras}
    for a in amostras:
        pal=a["palavras"] if a["palavras"] is not None else bym.get(a["ref"],{}).get("palavras") or []
        # junta palavras da mesma linha (y próximo) para pegar "R$ 259.522,39"
        linhas={}
        for x,y,w,h,txt,c in pal: linhas.setdefault(round(y/8),[]).append((x,y,w,h,txt))
        for k,ws in linhas.items():
            ws.sort()
            # janela deslizante de 1-3 palavras
            for i in range(len(ws)):
                for j in range(i,min(i+3,len(ws))):
                    s=" ".join(w[4] for w in ws[i:j+1])
                    for tipo,rx in P.items():
                        m=rx.search(s)
                        if m and (j==i or tipo=="valor_rs"):
                            x0=min(w[0] for w in ws[i:j+1]); y0=min(w[1] for w in ws[i:j+1])
                            x1=max(w[0]+w[2] for w in ws[i:j+1]); y1=max(w[1]+w[3] for w in ws[i:j+1])
                            out.append({"parte":p,"t":a["t"],"tipo":tipo,"texto":m.group(0),"bbox":[x0,y0,x1,y1]})
# agrupa
g={}
for o in out:
    k=(o["parte"],o["tipo"],o["texto"])
    if k not in g: g[k]={"parte":o["parte"],"tipo":o["tipo"],"texto":o["texto"],"primeiro":o["t"],"ultimo":o["t"],"n":0,"bbox":o["bbox"]}
    e=g[k]; e["primeiro"]=min(e["primeiro"],o["t"]); e["ultimo"]=max(e["ultimo"],o["t"]); e["n"]+=1
    b=e["bbox"]; e["bbox"]=[min(b[0],o["bbox"][0]),min(b[1],o["bbox"][1]),max(b[2],o["bbox"][2]),max(b[3],o["bbox"][3])]
res=sorted(g.values(),key=lambda e:(e["parte"],e["primeiro"]))
json.dump(res,open("trabalho/suspeitos.json","w"),ensure_ascii=False,indent=1)
for e in res: print(f'{e["parte"]} {e["primeiro"]:7.1f}-{e["ultimo"]:7.1f} n={e["n"]:3} {e["tipo"]:11} {e["texto"][:60]!r} {e["bbox"]}')
