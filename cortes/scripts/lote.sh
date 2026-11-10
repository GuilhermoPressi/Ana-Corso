#!/usr/bin/env bash
# Renderiza uma lista de cortes e roda o QC de todos. Uso: scripts/lote.sh C02 C04 ...
cd "$(dirname "$0")/.."
for c in "$@"; do
  echo "== YT01-$c"; python3 scripts/render.py config/YT01-$c.json 2>&1 | grep -vE "quadros$"
done
python3 scripts/qc.py config/YT01-*.json
