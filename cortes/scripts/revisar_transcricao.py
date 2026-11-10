#!/usr/bin/env python3
"""Etapa 1 - revisão de termos na transcrição (não altera números falados).

Gera trabalho/transcricao_revisada.json + .txt e trabalho/revisao.md com as trocas feitas.
Números divergentes da tela ficam listados em ALERTAS para conferência manual.
"""
import json
import re
from pathlib import Path

WORK = Path(__file__).resolve().parent.parent / "trabalho"

# termo errado (regex, por palavra) -> grafia correta
TROCAS = [
    (r"\bROE\b", "ROI"),
    (r"\bManichat\b", "ManyChat"),
    (r"\bNA\b", "N/A"),
    (r"\bna praia\b", "na prática"),
    (r"\badvantage demais\b", "Advantage+"),
    (r"\badvantage\b", "Advantage+"),
    (r"\bED82\b", "AD82"),
    (r"\bAD 82\b", "AD82"),
    (r"\bCriativo Campeão\b", "criativo campeão"),
    (r"\bguilhermopress\b", "@guilhermopressi"),
    (r"\bcheck-out\b", "checkout"),
    (r"\bmeta\b(?! de custo)", "Meta"),
]

ALERTAS = [
    (167.0, "fala '13,26' de custo por visualização de página; a tela mostra R$ 3,26 (campanha AD25-33). "
            "Na tela usar R$ 3,26; evitar esse trecho de fala como gancho."),
    (23.5, "faturamento é do mês até o dia 22/09 (parcial), não do mês fechado. Texto na tela deve dizer isso."),
    (30.0, "dashboard varia ao vivo: R$ 105.645,87 em 0s e R$ 105.644,48 em ~52s. Usar 'R$ 105 mil'."),
]


def fix(text):
    for pat, rep in TROCAS:
        text = re.sub(pat, rep, text)
    return text


def main():
    d = json.loads((WORK / "transcricao.json").read_text())
    log = {}
    lines = []
    for seg in d["segments"]:
        new = fix(seg["text"])
        if new != seg["text"]:
            log[seg["s"]] = (seg["text"], new)
        seg["text"] = new
        for w in seg["words"]:
            w["w"] = fix(w["w"])
        m, s = divmod(seg["s"], 60)
        lines.append(f"[{int(m):02d}:{s:05.2f}] {new}")
    d["revisado"] = True
    (WORK / "transcricao_revisada.json").write_text(json.dumps(d, ensure_ascii=False, indent=1))
    (WORK / "transcricao_revisada.txt").write_text("\n".join(lines))
    md = ["# Revisão da transcrição", "", "## Alertas (número fala x tela)", ""]
    md += [f"- {t:.0f}s: {a}" for t, a in ALERTAS if a]
    md += ["", f"## Trocas de termo ({len(log)} segmentos)", ""]
    md += [f"- {t:.1f}s: `{a}` -> `{b}`" for t, (a, b) in log.items()]
    (WORK / "revisao.md").write_text("\n".join(md) + "\n")
    print(f"{len(log)} segmentos revisados")


if __name__ == "__main__":
    main()
