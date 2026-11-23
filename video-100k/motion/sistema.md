# Sistema de motion: Grupo GPressi (v2, tema escuro, aprovado)

Fonte única de verdade: `motion/kit/kit.html`. Os tokens e curvas abaixo estão no código.
A v2 segue o seu retorno e o vídeo de referência:
- fundo escuro e texto branco;
- telas cheias curtas que entram no lugar da câmera enquanto a voz continua;
- texto sobre o vídeo só na área livre ao lado do corpo;
- tudo entra no tempo exato da palavra.

## Paleta (só estas cores)
| Token | Hex | Uso |
|---|---|---|
| preto | `#161513` | **fundo padrão** das telas cheias e dos cartões sobre o vídeo (88–92%) |
| prof | `#254425` | "respiro" de luz no fundo (radial suave, 75%) e superfície do item ativo |
| off | `#F4F4F4` | **todo o texto**, anel do ponto, contorno do destaque |
| cinza | `#D4D4D4` | rótulos, itens inativos, linhas e a grade sutil (3,5%) |
| verde | `#135613` | **o ponto** e os números acesos, sublinhado da palavra-chave, etapa concluída |

Proibido: neon, roxo, dourado, laranja, gradiente chamativo, glow, partículas.
O único gradiente permitido é o respiro radial verde-profundo, quase imperceptível.

## Tipografia: só Montserrat (variável, OFL, `assets/fontes/`). Números com `tnum`.
| Estilo | Peso / tamanho (1080p) | Uso |
|---|---|---|
| h1 | 800 / 80px | título de tela cheia ("Comece simples", "Nichar a oferta") |
| frase | 800 / 66–76px + sombra suave | texto cinético sobre o vídeo |
| num | 800 / 80–96px | métrica |
| h2 | 700 / 52px (46px em cartões) | título do mapa, textos de comparação |
| degrau | 800 / 46px | rótulos da escada |
| label | 700 / 24px, CAIXA ALTA, tracking 14% | rótulos |

## Curvas (3) e mola
| Nome | Curva | Onde |
|---|---|---|
| `saida_premium` | `cubic-bezier(0.16, 1, 0.3, 1)` | entrada de texto, degraus subindo, contagem |
| `transforma` | `cubic-bezier(0.65, 0, 0.35, 1)` | máscara de tela cheia, ponto viajando, contorno deslizando |
| `sai` | `cubic-bezier(0.7, 0, 0.84, 0)` | saídas |
| mola do ponto | forma fechada, ω=18, ζ=0,8 (overshoot ≈1,5%) | nascimento do ponto |

## Durações
- Entrada: **0,6s**, sobe 18–22px, com 0,1s de diferença entre elementos.
- Máscara de tela cheia: **0,45s** para abrir e **0,4s** para recolher no ponto.
- Saída: **0,35s**.
- 30 fps (fps de origem). Tudo é calculado por `seek(t)`, sem timers.

## Sincronia com a fala (regra)
- Cada elemento recebe o **tempo da palavra** (`tempos`, a partir do `word_timestamps` do Whisper).
- O elemento entra na palavra, nunca depois do fim da frase. Exemplos: o degrau "R$ 200/dia" sobe quando você diz "duzentos", e o contorno do dashboard desliza quando você diz "107 mil".
- Os tempos são guardados em tempo-fonte e remapeados pelo EDL, então continuam certos depois de cortes e pausas encurtadas.

## Rosto livre (regra)
- Detecção a cada 0,5s (`trabalho/rosto_*.json`). O rosto fica em x≈740–1280 em 95% do tempo.
- As sobreposições em câmera ficam **só em x ≤ 680**, de preferência embaixo, sobre os quadros e livros escuros, onde o texto branco tem contraste.
- Antes de renderizar cada inserção, o script confere a caixa do rosto naquele intervalo e afasta ou reduz o elemento se precisar.
- Se não couber, a inserção vira tela cheia curta, como no vídeo de referência.

## Elemento-assinatura: **o ponto verde com anel claro**
Ele nasce com a mola onde a inserção acontece e abre a tela cheia pela máscara circular. Depois vira:
- o **número aceso** da etapa no mapa;
- a ponta que desenha e conduz o contorno no dashboard;
- a ponta do sublinhado da frase;
- o marcador da métrica ativa;
- a bolinha que **sobe a escada**;
- a ponta do conector antes→depois;
- o ponto do lower third;
- o ponto final do título na tela final.

Na saída, a tela recolhe de volta nele.

## Transições permitidas
- Máscara circular nascendo e morrendo no ponto.
- O ponto viajando entre elementos.
- O contorno deslizando de um alvo para o próximo.
- **Proibido:** crossfade, wipe, slide genérico, spin, glitch, zoom-blur e quique.

## Componentes
| # | Nome | Tipo | Uso |
|---|---|---|---|
| 1 | `mapa` | tela cheia 3–3,5s | **cartão de capítulo**: mapa do vídeo (Produto → Oferta → Página de vendas → Criativos → Tráfego pago) com a etapa atual acesa. Volta a cada capítulo |
| 2 | `frase` | sobre o vídeo (alfa) | frase curta dita por você, palavra a palavra, com a linha-chave sublinhada |
| 3 | `metrica` | sobre o vídeo (alfa) | números que contam no tempo da fala |
| 4 | `escada` | tela cheia | **lista de passos que se monta** em forma de degraus, cada um no tempo da fala |
| 5 | `antesdepois` | tela cheia | comparação |
| 6 | `destaque` | sobre gravação de tela (alfa) | contorno desenhado que desliza entre alvos, com etiqueta e o entorno escurecido 45% |
| 7 | `lowerthird` | sobre o vídeo (alfa) | nome |
| 10 | `cartao` | sobre o vídeo (alfa) | frase em cartão escuro com ponto, linha a linha no tempo da fala (substitui `frase`) |
| 11 | `titulo` | tela cheia ~2,7s | frase forte centralizada, linha-chave num cartão ativo |
| 9 | `estrutura` | tela cheia | árvore Campanha → Conjunto (com etiquetas) → N criativos; cada nó entra na palavra |
| 8 | `final` | tela cheia (≤20s) | tela final com 2 espaços para os elementos do YouTube |

Render: `node motion/render.mjs <comp> '<props>' <pasta>` gera PNG RGBA. A amostra e a montagem usam `motion/amostra.py`, com borrões no ffmpeg (`scripts/ffblur.py`), upscale para 1080p, overlay e sons.

## Paleta sonora (`assets/sfx/`, sintetizada, CC0, ver FONTES.md)
| Som | Quando |
|---|---|
| `sopro` | tela cheia abrindo |
| `impacto` | o momento-chave (último degrau, oferta nichada, capítulo) |
| `tick` | cada degrau, item ou alvo novo |
| `traco` | contorno sendo desenhado |
| `ponto` | o ponto nasce numa sobreposição |
| `resolucao` | tela final |

Volume a 50% sob a voz, com limiter. Um som por impacto.

## Referências usadas
- **Vídeo de exemplo do autor:** telas cheias escuras e curtas, mapa de etapas que volta com a etapa acesa, texto sobre o vídeo fora do rosto, sincronia com a fala.
- **Taxtello (03):** contenção, transição que nasce de elemento anterior, easing premium, revisão dos quadros renderizados.
- **Ponto laranja (09):** elemento único que costura tudo, `seek(t)` determinístico.
- **HyperFrames (06):** nada inventado e um som por impacto.
- **Não usados:** 01, 02, 04, 07, 10 e 11.
- **taste-skill (08):** só os princípios gerais.

## Pendências
- Logo oficial (SVG/PNG) para a tela final.
- Subtítulo do lower third: confirmar "Grupo GPressi".
