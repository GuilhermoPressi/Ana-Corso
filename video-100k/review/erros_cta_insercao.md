# CTA de encerramento e inserção: erros e plano de elementos

Brutos (somente leitura):
- `brutos/03_CTA_ENCERRAMENTO.mov`: 1:51, 720p, 30 fps. No Drive se chama “INSERCAO FINAL DE VÍDEO”.
- `brutos/04_INSERCAO_MEIO.mov`: 1:47, 720p, 30 fps. No Drive se chama “INSERCAO MEIO DE VIDEO”.

Os dois são só câmera, sem tela, sem dado sensível e sem borrão.

Referência: `assets/referencia_video/cta_referencia.mp4`. Ela tem zoom alternado, botão do YouTube animado, selo do Instagram e “Link na descrição”.

## 03 · CTA de encerramento

| # | Tempo no bruto | O que é | Ação |
|---|---|---|---|
| E1 | 89,1–95,1 | 1ª tentativa: “Então se tu quiser saber mais também, segundo o link da descrição, a gente tá falando sobre isso, clica ali.” Logo depois você repete melhor. | **Cortar.** Fica a 2ª: “Então se quiser saber mais, primeiro link na descrição, clica ali, você aplica…” |
| E2 | 103,3–fim | Depois de “…te passar os próximos passos.” vem uma fala de bastidor, baixa e pouco audível (“então eu passo para a aplicação…”). | **Cortar.** O vídeo termina em “próximos passos.” |
| E3 | 28,9 / 65,0 | Pausas de 0,9s no meio da frase. | Encurtar para 0,35s. |

Duração estimada: **≈1:42**.

## 04 · Inserção de meio de vídeo

| # | Tempo no bruto | O que é | Ação |
|---|---|---|---|
| E4 | 5,4–9,9 | “se tu,” seguido de 4s de silêncio, e você recomeça “se tu já vende…”. | **Cortar.** Fica “…recado rápido, se tu já vende no digital…” |
| E5 | 44,0–65,6 | Depois de “…ensinar outras pessoas a sua profissão,” vem a fala de bastidor “eu vou fazer o pit para mentoria, não falo da implementação” e 12s de silêncio e murmúrio. | **Cortar.** Fica “…a sua profissão, eu tenho um programa de mentoria que é específico para te ajudar.” |
| E6 | 25,1 | Pausa de 2,1s antes de “Ou, se tu é uma pessoa bem consolidada…”. | Encurtar para 0,35s. |
| E7 | 104,3–fim | Sobra depois de “…aqui abaixo.” | **Cortar.** |

Duração estimada: **≈1:20**.

## Elementos

Visual misto, como você escolheu: botão do YouTube e Instagram como na referência; “Link na descrição” no kit escuro. Sem outros motions.

| Vídeo | Na fala | Elemento |
|---|---|---|
| 03 | “Se inscreve” (5,0s) até “like” (6,2s) | Botão do YouTube embaixo à esquerda: o cursor clica 👍 e depois **INSCREVER-SE**, que vira INSCRITO, e o sino |
| 03 | “Se inscreve no canal… curte” (18,7–22s) | O mesmo botão de novo, mais curto |
| 03 | “meu Instagram, arroba Guilhermo Pressi” (23,8s) | Selo do Instagram com a logo colorida e **@guilhermopressi**, embaixo à direita, até “me seguir lá também” |
| 03 | “primeiro link na descrição” (96,8s) | Cartão escuro **“Link na descrição”** com o ponto verde e uma seta para baixo, até o fim |
| 04 | “clica no primeiro link da descrição” (90,5s) | Cartão escuro **“Link na descrição”** |
| 04 | “fica aqui no link, aqui abaixo” (103,5s) | O mesmo cartão volta até o fim |

- **Câmera:** zoom alternado entre 1,00 e 1,07 nos cortes e a cada ideia, como na referência, sem cobrir o rosto.
- **Áudio:** a mesma cadeia da voz do vídeo 100k, -14 LUFS, sem música, com efeitos a 25%.

## Entrega

Dois arquivos avulsos em `export/`, os dois em 1080p, H.264 CRF 17, AAC 192k:
- `cta_encerramento_final.mp4`
- `insercao_meio_final.mp4`

Se algum passar de 400 MB, faço uma cópia menor para enviar no chat.
