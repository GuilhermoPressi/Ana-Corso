# Edição de vídeo — Grupo GPressi (pipeline reutilizável)

Projeto: `video-100k/`. Brutos ficam em `brutos/` (somente leitura, `chmod a-w`, fora do git).

## Etapas e comandos
```
python3 scripts/transcrever.py brutos/<arq>.mov trabalho/transcricao_<P>.json medium   # faster-whisper, pt, word timestamps
python3 scripts/mapear_cenas.py brutos/<arq>.mov trabalho/cenas_raw_<P>.json          # depois segmentar -> trabalho/cenas.json
OMP_THREAD_LIMIT=1 python3 scripts/ocr_tela.py <P>                                   # OCR a cada 0,5s nos trechos de tela
python3 scripts/varrer_sensiveis.py 01 02                                            # suspeitos -> trabalho/suspeitos.json
python3 scripts/rosto.py <P>                                                         # área livre para sobreposições (OpenCV 4.10)
python3 scripts/borrar.py folhas                                                     # folhas antes/depois dos borrões
python3 motion/style_frames.py                                                       # review/style-frames.png
python3 scripts/montagem.py timeline|video|voz|motion|mix|leve|final                 # montagem com cache
python3 scripts/qc.py export/<arquivo>.mp4                                           # controle de qualidade
```
Configuração: `config/edl.json` (trechos mantidos e coberturas), `config/blur.json` (borrões em coordenadas 1280×720 do bruto) e `config/motion.json` (inserções em tempo-fonte; tempos internos = palavra da fala). Ajuste pedido → mude o JSON e rode só as etapas afetadas (a montagem tem cache em `trabalho/montagem/`; apague `seg/NNN.mp4` ou `mo/<ID>` para forçar).

## Regras de trabalho
- Pare nos pontos de aprovação: erros, borrões, style frames e plano de motion. Final só com o ok.
- Borrão = pixelização de 14px + desfoque, cantos de 8px, margem ≥12px. Entra no 1º quadro do corte.
- Em tela: pausa só é encurtada se a imagem estiver parada.

## Kit de motion aprovado (v2, tema escuro) — `motion/kit/kit.html`, detalhes em `motion/sistema.md`
- Paleta: preto #161513 (fundo), verde profundo #254425 (respiro e item ativo), off-white #F4F4F4 (texto), cinza #D4D4D4 (rótulos e linhas), verde #135613 (o ponto). Nada de neon, roxo, dourado ou laranja.
- Fonte: só Montserrat (`assets/fontes/`). Curvas: cubic-bezier(0.16,1,0.3,1) / (0.65,0,0.35,1) / (0.7,0,0.84,0). Entrada 0,6s, saída 0,35s, stagger 0,1s. 30 fps, `seek(t)` determinístico.
- Assinatura: **ponto verde com anel claro**, que nasce com mola, abre a tela por máscara circular, marca o elemento ativo e recolhe tudo na saída.
- Componentes: `mapa` (capítulo), `titulo` (frase forte em tela cheia curta ~2,7s), `cartao` (frase em cartão escuro no canto; substitui a `frase` solta com sublinhado, que o autor achou com “cara de IA”), `metrica`, `escada`, `antesdepois`, `destaque` (contorno que desliza entre alvos), `lowerthird` (só o nome, sem subtítulo), `estrutura` (árvore de campanha), `final` (sem logo). Caixas do `mapa` crescem com o texto (nunca altura fixa).
- Regras do autor: fundo escuro e texto branco; **nunca sobre o rosto** (câmera: só x ≤ 680, conferido com `trabalho/rosto_*.json`); tudo **sincronizado com a palavra**; poucos motions, só onde explicam; **sem legenda e sem logo**.
- Sons (`assets/sfx/`, sintetizados CC0): sopro, impacto, tick, traço, ponto, resolução. Sem música de fundo (pedido do autor); efeitos a 25% (`SFX_GANHO`), voz intocada. A trilha sintetizada continua disponível (`TRILHA=True` em montagem.py).
- Áudio final: -14 LUFS, true peak -1 dBTP. Export final: H.264 High CRF 17 preset slow +faststart, AAC 48k 192k. Versão leve: 2500k.

## Vídeos avulsos de CTA e inserção (`scripts/cta.py`, `config/cta.json`)
- `python3 scripts/cta.py <03|04> previa|final`. `manter` = trechos em tempo-fonte. Pausas >0,6s viram 0,35s. Zoom 1,00/1,07 alterna em cada corte e em cada frase nova (peças >6s).
- Elementos em tempo-fonte: `youtube` (pílula branca; o cursor clica inscrever/like/sino em `cliques`), `instagram` (selo com @guilhermopressi), `cartao` "Link na descrição ↓" (kit escuro). Visual misto, aprovado pelo autor, igual à referência `assets/referencia_video/cta_referencia.mp4`.
- Entregues: `export/cta_encerramento_final.mp4` (1:36) e `export/insercao_meio_final.mp4` (1:19).
