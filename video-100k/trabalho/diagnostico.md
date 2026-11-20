# Etapa 1: Diagnóstico

## Arquivos (somente leitura em /brutos, chmod a-w)
| Parte | Arquivo | Duração | Vídeo | Áudio |
|---|---|---|---|---|
| 01 | 01_100KPORMESSEESTIVESSECOMECANDO.mov (138 MB) | 2:59.3 (179,33s) | H.264 High, 1280×720, 30 fps, yuv420p, bt709, ~6 Mbps | AAC LC 48 kHz estéreo 160 kbps |
| 02 | 02_100KPORMESSEESTIVESSECOMECANDO.mov (1,23 GB) | 26:38.2 (1598,2s) | idem | idem |

Total bruto: 29:37. A parte 2 continua a parte 1.

**Resolução:** o bruto é 720p. A entrega em 1920×1080 exige upscale de 1,5× (lanczos + nitidez leve). 4K não se justifica. Os motions são renderizados nativamente em 1080p e não perdem qualidade. A tela gravada em 720p vai ficar um pouco mais macia no zoom.

**Áudio:**
- Loudness integrado de -12,2 / -12,1 LUFS (LRA ~10 LU) e pico de +0,3 / +0,9 dBFS.
- Há clipping real (topo achatado) em quase toda a fala: 186 blocos de 0,5s na parte 1 e 1552 na parte 2. O ganho do microfone estava alto demais.
- Detalhe em `trabalho/audio_clipping.json`.

**Quadros pretos:** nenhum.
**Câmera congelada:** nenhuma. Os "freeze" detectados estão todos em trechos de tela parada, o que é normal.

## Câmera × tela (amostra a cada 0,5s, ±0,5s; `trabalho/cenas.json`)
| Parte | Início | Fim | Tipo | Conteúdo |
|---|---|---|---|---|
| 01 | 0,0 | ~50,0 | tela | Dashboard UTMify ("Dashboard – Daniel") |
| 01 | ~50,0 | ~52,9 | tela | janela do OBS (troca de cena) |
| 01 | ~53,0 | 179,3 | câmera | — |
| 02 | 0,0 | ~394,0 | câmera | — |
| 02 | ~394,0 | ~395,4 | tela | janela do OBS (troca de cena) |
| 02 | ~395,4 | ~1143,0 | tela | Drive (modelo de página), página low.grupogpressi.com.br, Lastlink |
| 02 | ~1143,0 | ~1144,4 | tela | janela do OBS |
| 02 | ~1144,4 | ~1231,0 | câmera | — |
| 02 | ~1231,0 | ~1233,0 | tela | janela do OBS |
| 02 | ~1233,0 | ~1332,0 | tela | Drive: criativos em imagem |
| 02 | ~1332,0 | ~1334,0 | tela | janela do OBS |
| 02 | ~1334,0 | 1598,2 | câmera | — |

**Webcam sobreposta nos trechos de tela:** sempre no canto superior direito, em x 937–1280 e y 267–461 (343×194 px na base 1280×720), sem mudar de posição em nenhum trecho.

## Transcrição
- faster-whisper **medium**, pt, `word_timestamps=True`, CPU int8.
  - Arquivos: `trabalho/transcricao_01.json`, `trabalho/transcricao_02.json`.
- Os trechos ambíguos foram retranscritos com VAD: 01 8–25s, 02 185–200, 02 256–385, 02 1179–1256 e 02 1550–1580.
- Revisão de nomes e termos em `trabalho/transcricao_revisada.md`, com os cortes marcados.

## OCR
- Tesseract 5 (por), quadro ampliado 1,5×, psm 11, a cada 0,5s nos trechos de tela.
  - Arquivos: `trabalho/ocr_01.jsonl` (106 amostras) e `trabalho/ocr_02.jsonl` (1706 amostras).
- Formato: `{t, ref, palavras:[x,y,w,h,texto,conf]}` em coordenadas 1280×720.
- Quando o quadro é quase igual ao anterior, `palavras=null` e `ref` aponta para o OCR reaproveitado.
- **Limitação:** em texto pequeno, o Tesseract quebra e-mails (o "@" some). A varredura da Etapa 3 vai combinar o OCR com a inspeção visual dos quadros.

## Ferramentas instaladas
faster-whisper 1.x (modelo medium), tesseract-ocr + tesseract-ocr-por, pytesseract, opencv-python-headless, scipy. O ffmpeg 6 já estava presente.
