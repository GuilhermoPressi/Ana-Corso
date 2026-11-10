#!/usr/bin/env python3
"""Etapa 2 - ajusta candidatos a limites de palavra e imprime texto/duração.
Uso: python3 scripts/candidatos.py  (lê a lista CAND abaixo, grava trabalho/candidatos.json)"""
import json
from pathlib import Path
W = Path(__file__).resolve().parent.parent / "trabalho"
d = json.loads((W / "transcricao_revisada.json").read_text())
words = [w for s in d["segments"] for w in s["words"]]

def snap(a, b):
    i = min(range(len(words)), key=lambda k: abs(words[k]["s"] - a))
    # último palavra que termina antes de b (nunca invade a frase seguinte)
    j = max(k for k in range(len(words)) if words[k]["e"] <= b + 0.05)
    return words[i]["s"], words[j]["e"], " ".join(w["w"] for w in words[i:j + 1])

CAND = json.loads((W / "candidatos_brutos.json").read_text())
out = []
for c in CAND:
    s, e, txt = snap(c["a"], c["b"])
    c.update({"inicio": round(s, 2), "fim": round(e, 2), "duracao": round(e - s, 1), "texto": txt})
    out.append(c)
    print(f"{c['id']} {s:7.2f}-{e:7.2f} ({e-s:4.1f}s) {txt[:110]} ... {txt[-70:]}")
(W / "candidatos.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
