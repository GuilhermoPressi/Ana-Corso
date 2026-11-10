# Cortes verticais a partir de vídeo longo do YouTube

Pipeline para transformar um vídeo horizontal (gravação de tela + webcam em PiP) em cortes
verticais 1080x1920 prontos para Reels/TikTok/Shorts. Tudo é controlado por **um JSON por corte**
em `config/`; o código não precisa ser mexido para ajustar um corte.

## Regras inegociáveis (do dono do canal)
1. `brutos/` é somente leitura (o original fica `chmod 444` e com `trabalho/<ID>.sha256`).
2. Não inventar número, resultado ou promessa: texto na tela sai da fala ou da tela, e número tem que bater com a tela.
3. Não cortar frase de um jeito que mude o sentido. **Nunca cortar a palavra antes de ela terminar** (ver "Cortes de áudio").
4. Dado sensível na tela (e-mail, telefone, nome de cliente, CPF, saldo, token, senha, link privado) é borrado. Na dúvida, borra e mostra.
5. Falar com franqueza quando o material tem problema (texto ilegível, áudio ruim, trecho sem gancho).
6. Não renderizar o lote sem aprovação do piloto.
7. Contexto na tela: usar **apenas imagens do próprio vídeo** (nada inventado).

## Estrutura
```
brutos/       original (somente leitura, fora do git)
assets/fonts/ Anton-Regular.ttf (gancho e legenda)
trabalho/     transcrição, energia do áudio, detecções, cache por corte, modelos (fora do git)
config/       _estilo.json (global) + YT01-Cxx.json (um por corte)
review/       folhas de quadros-chave (fora do git: contêm dados da tela)
export/       finais em alta + manifest.csv + qc/
export_leve/  versões leves (2500 kbps) para revisar no celular
scripts/      pipeline
```

## Como rodar (próximo vídeo)
Ambiente: Python 3, ffmpeg 6+, `pip install faster-whisper "opencv-python-headless<5" pillow fonttools brotli gdown`
(o OpenCV 5 não lê o modelo YuNet). Modelos: faster-whisper `large-v3` (Hugging Face) e
`trabalho/models/face_detection_yunet_2023mar.onnx` (Hugging Face `opencv/face_detection_yunet`).
No ambiente de nuvem `ana-corso` os hosts do Drive e do Hugging Face já estão liberados.

1. **Baixar** o vídeo para `brutos/YT02.mp4` (Drive: o link precisa estar "Qualquer pessoa com o link";
   arquivo > 100 MB pede o `confirm=t&uuid=` do aviso de vírus) e proteger: `chmod 444 brutos/YT02.mp4`.
2. **Diagnóstico**: `python3 scripts/diagnostico.py brutos/YT02.mp4`
3. **Transcrição** (CPU 4 núcleos: ~1,5x a duração do vídeo):
   `python3 scripts/transcrever.py brutos/YT02.mp4 large-v3` e depois `python3 scripts/revisar_transcricao.py`
   (ajustar `TROCAS` e `ALERTAS` no script para o vocabulário/números do vídeo).
4. **Energia do áudio** (obrigatório para os cortes): `python3 scripts/energia.py brutos/YT02.mp4`
   -> `trabalho/energia_10ms.npy`. Atenção: `trabalho/` hoje guarda um vídeo por vez (transcrição, energia,
   webcam); para outro vídeo, mova os arquivos do anterior ou rode numa cópia da pasta.
5. **Webcam**: medir a caixa do PiP (`scripts/grade.py` num quadro) e validar o vídeo todo com
   `python3 scripts/detectar_webcam.py brutos/YT02.mp4 x y w h`. Atualizar `webcam.fonte_caixa` e `pip_mascara` no `_estilo.json`.
6. **Garimpo**: candidatos em `trabalho/candidatos_brutos.json` -> `python3 scripts/candidatos.py`.
7. **Planejar a tela de cada corte**: `scripts/folha_tela.py` (4 quadros com grade a cada 400 px) e
   `scripts/grade.py` (zoom com grade fina) para achar coordenadas 4K das colunas/linhas citadas.
8. **Prévia**: `python3 scripts/render.py config/YT02-C01.json --previa [--tempos 1,5,9]` ou em lote:
   `python3 scripts/previa_lote.py config/YT02-*.json` -> `review/lote_*.jpg`. Mostrar ao dono antes do render.
9. **Render + QC**: `scripts/lote.sh C01 C02 ...` (render de cada corte + `scripts/qc.py` de todos).
   Reprovou no QC, não vai para entrega.

## Parâmetros aprovados (piloto YT01, novembro/2026)
- Saída 1080x1920, 30 fps, H.264 High CRF 17 preset slow, yuv420p, bt709, +faststart; AAC 48 kHz 192 kbps.
  Leve: 2500 kbps. Velocidade da fala: **1,0x** (sem aceleração).
- **Layout**: tela do PC preenchendo o fundo, recortada na ROI com câmera suave (ease in-out 0,4–0,6 s);
  ROI encaixada na faixa y 300–1060 da saída; zoom até 1,67x (s_min 0,6) com nitidez leve abaixo de s 0,9.
  Quando a ROI encosta na borda da tela, o resto vira fundo escuro com degradê.
- **Webcam**: quadrado 430 px no canto inferior direito (base em y 1536 = linha dos 80%), recortado
  470x470 do PiP original, cantos arredondados (raio 30), borda branca 55% e sombra. O PiP original é
  apagado da tela antes do recorte (`pip_mascara`). A webcam é **sempre ao vivo** (nunca congela).
- **@ na tela: desativado** (`arroba.ativo = false`).
- **Gancho**: Anton 118 px no topo (y 300), 2,8 s, palavra-chave entre `[colchetes]` em amarelo #FFD60A, entrada com pop.
- **Legenda**: Anton 82 px, 1–3 palavras (máx. 16 caracteres), quebra em pontuação ou pausa > 0,28 s,
  números e `destaques` em amarelo, base em y 1072 (acima do quadrado). Nunca junta palavras de segmentos diferentes.
- **Áudio**: -14 LUFS por ganho exato + limitador (true peak <= -1 dBTP medido no AAC final; se estourar,
  o render baixa o teto e remuxa só o áudio). Fade 15 ms no início e 60 ms no fim.

### Cortes de áudio (ajuste mais importante do piloto)
O whisper marca o fim da palavra ~0,25 s antes do som acabar. Por isso **os cortes usam o envelope de
energia** (`trabalho/energia_10ms.npy`): entre duas palavras, o corte vai no silêncio real mais longo
(energia < piso + 8 dB por >= 60 ms), procurado numa janela de ±0,15 s em volta das marcas do whisper;
fica 0,10 s de folga depois da voz e 0,06 s antes. Só pausas reais > 0,6 s são encurtadas.
Quando a fala é emendada (sem silêncio), corta no ponto de menor energia e registra um aviso.
O QC reprova se algum corte cair em voz (fora dessas emendas naturais).

### Contexto na tela (inserções)
Quando a fala cita algo que aparece em **outro momento do vídeo** (lista de criativos, painel UTMify,
"97R$" no nome da campanha, orçamento "R$ 250,00 Diário"…), use `insercoes` no JSON: a TELA vem de
`tela_t` (modo `parado` = um quadro, `video` = acompanha o tempo), enquanto **áudio e webcam seguem
no tempo real**. Câmera da inserção com `t` relativo ao início dela. Cuidado para a imagem não sugerir
algo que a fala não diz (ex.: no C01, "ele vai morrer em uma semana" volta para a tabela em vez de ficar no AD82).

### Congelar a tela
`congelar` troca a tela por um quadro limpo (ex.: tooltip tapando o número citado), só a tela; a webcam
segue ao vivo. Usar só para tirar obstrução, sempre o mesmo conteúdo de poucos décimos antes.

## Formato do JSON de um corte (`config/YT01-C05.json` é o exemplo mais completo)
- `segmentos`: lista em ordem de saída; `de` = início da 1ª palavra, `ate` = **início** da última palavra
  (ela entra inteira). Gancho reordenado = segmento extra no começo (`"pad_antes": 0.0` se colado na palavra anterior),
  e anotar em `_gancho_reordenado`.
- `camera`: `[{t (s do original), roi [x,y,w,h] em px 4K, ease}]`; segmento pode ter `camera` própria.
- `insercoes`, `congelar`, `borrar` (caixas em px 4K, opcional `de`/`ate` no tempo da tela).
- `gancho_texto`, `gancho_falado`, `destaques`, `legenda_post`, `cta`, `nota`, `tipo`, `arquivo`.
- `previa`/`previa_rotulos`: tempos de saída para a folha de quadros.

## Sensíveis já mapeados no YT01
- Barra de favoritos (nomes de clientes/mentorias): borrada sempre (`borrar_padrao`).
- Painel de edição do anúncio (465–471 s): nome "Ana" no texto principal borrado.
- Conta de anúncios, URL e miniaturas dos criativos já vinham borradas no original.

## Lições do YT01
- O painel do Gerenciador atualiza ao vivo: valores mudam alguns centavos entre quadros (R$ 91,25/91,51);
  use o número falado arredondado no texto.
- Tooltips ("Conversões") aparecem quando o cursor para em cima do número: conferir o quadro do punch-in.
- Fala com número divergente da tela (YT01: "13,26" falado x R$ 3,26 na tela): usar a tela e evitar a frase como gancho.
