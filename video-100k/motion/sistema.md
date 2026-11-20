# Sistema de motion: Grupo GPressi (v1, aguardando aprovação)

Fonte única de verdade: `motion/kit/kit.html`. Os tokens e curvas abaixo estão no código: mudou aqui, muda lá.

## Paleta (só estas cores)
| Token | Hex | Uso |
|---|---|---|
| verde | `#135613` | **o ponto**, rótulos (label), contorno do passo concluído. Acento, nunca fundo grande |
| prof | `#254425` | superfície de ênfase: o cartão "depois" da comparação |
| off | `#F4F4F4` | **superfície padrão**: cartões, telas cheias, etiquetas |
| cinza | `#D4D4D4` | linhas, divisores, trilho da lista, borda do cartão "antes" |
| preto | `#161513` | texto, escurecimento do destaque, espaços da tela final |

Proibido: neon, roxo, dourado, laranja, gradientes, brilho (glow), partículas, glassmorphism.
Sombra só nos cartões sobre o vídeo, para separar da imagem: `0 24px 64px rgba(22,21,19,.28)`.

## Tipografia: só Montserrat (variável 100–900, OFL, `assets/fontes/`)
Números sempre com `tnum` (algarismos tabulares, não "dançam" na contagem).
| Estilo | Peso / tamanho (1080p) | Uso |
|---|---|---|
| display | 800 / 132px, tracking -2% | título do capítulo |
| h1 | 800 / 72–88px | título de tela cheia |
| num | 800 / 100px | métrica |
| h2 | 700 / 56px (48px dentro de cartões) | título de painel, texto da comparação |
| body | 500–700 / 40px | itens de lista, subtítulos |
| label | 700 / 26px, CAIXA ALTA, tracking 14% | rótulos (verde ou preto 72%) |
| nome | 800 / 44px + 600 / 26px | lower third |

## Curvas (3)
| Nome | Curva | Onde |
|---|---|---|
| `saida_premium` | `cubic-bezier(0.16, 1, 0.3, 1)` | toda entrada de texto e cartão, contagem de número |
| `transforma` | `cubic-bezier(0.65, 0, 0.35, 1)` | o ponto viajando, máscara abrindo/fechando, traço do destaque |
| `sai` | `cubic-bezier(0.7, 0, 0.84, 0)` | saídas (opacidade) |
| mola do ponto | forma fechada, ω=18, ζ=0,8 (overshoot ≈1,5%) | só o nascimento do ponto |

## Durações padrão
- Entrada de texto: **0,6s**, sobe 18px e ganha opacidade. **Stagger de 0,1s** entre elementos. Nada começa e termina no mesmo quadro.
- Máscara (abrir/fechar superfície): **0,5s** (`transforma`).
- Saída: **0,35s** (`sai`). Em tela cheia, a superfície recolhe de volta para o ponto em 0,45s.
- Permanência mínima legível: sobreposição 2,5s, tela cheia 2,0s depois de montada.
- Vídeo a **30 qps** (fps de origem). Tudo é calculado por `seek(t)`, sem timers e sem estado entre quadros.

## Elemento-assinatura: **o ponto verde**
Um círculo `#135613` (22–30px) que costura todas as inserções:
1. **Nasce** com a mola onde a inserção vai acontecer.
2. **Abre** a superfície: a máscara circular cresce a partir do ponto. Essa é a única transição de entrada.
3. **Vira o marcador** do que importa: o ponto final do título do capítulo, o marcador da métrica ativa, a bolinha que desce o trilho da lista, a ponta do conector antes→depois, a ponta da caneta que desenha o destaque e o ponto do lower third.
4. **Fecha**: a superfície recolhe de volta para o ponto, que some com `sai`.

## Transições permitidas
- Máscara circular nascendo e morrendo no ponto (entrada e saída de tudo).
- O ponto viajando entre elementos (conector, trilho, traço).
- Corte seco **só** entre o vídeo e uma tela cheia já montada, quando o ritmo pedir.
- **Proibido:** crossfade, wipe, slide genérico, spin, glitch, zoom-blur, whip-pan, quique.

## Componentes (`window.monta(nome, props)` + `window.seek(t)`)
| # | Nome | Tipo | Props |
|---|---|---|---|
| 1 | `capitulo` | tela cheia | `num`, `titulo`, `sub?`, `dur` |
| 2 | `metrica` | sobreposição (alfa) | `itens:[{label,prefixo,valor,sufixo,casas?}]`, `x,y,w`, `dur` |
| 3 | `passos` | sobreposição (alfa) | `titulo`, `passos[]`, `gap` (s entre itens), `x,y,w`, `dur` |
| 4 | `antesdepois` | tela cheia | `titulo`, `antes{label,texto,rodape}`, `depois{…}`, `dur` |
| 5 | `destaque` | sobreposição (alfa) | `caixa:[x,y,w,h]` (1080p), `etiqueta`, `etiquetaX/Y`, `tema: escuro/claro`, `dur` |
| 6 | `lowerthird` | sobreposição (alfa) | `nome`, `sub`, `x,y`, `dur` |
| 7 | `final` | tela cheia (≤20s) | `titulo`, `sub`, `dur`. Dois espaços 640×340 para os elementos de tela final do YouTube |

Regras de composição:
- Em câmera, as sobreposições ficam no **terço esquerdo** (x 120–900), porque o rosto fica à direita.
- Em tela, nunca cobrem a área que está sendo mostrada. O `destaque` escurece o entorno (42%) em vez de tapar.

Render: `node motion/render.mjs <comp> '<props>' <pasta> [--t a,b]` gera PNG RGBA a 30 qps. Para a montagem, a sequência PNG é convertida em ProRes 4444.

## Paleta sonora (`assets/sfx/`, sintetizada, CC0, ver FONTES.md)
| Som | Quando |
|---|---|
| `ponto` | o ponto nasce |
| `sopro` | máscara de tela cheia abrindo ou fechando (bem baixo) |
| `tick` | cada passo da lista; cada métrica que assenta |
| `impacto` | número final da métrica principal; título do capítulo assentando |
| `traco` | desenho do destaque |
| `resolucao` | tela final |

Mixagem: efeitos de -24 a -18 LUFS momentâneo, sempre abaixo da voz. Um som por impacto, nunca empilhar mais de dois.

## Referências usadas (de `assets/motion-referencias/`)
- **Taxtello (03):** uma ideia por cena, transição que nasce de elemento da cena anterior, easing premium, nada inventado, revisão de quadros renderizados.
- **Ponto laranja (09):** elemento único que costura tudo (aqui, o ponto verde), `seek(t)` determinístico, mola em forma fechada.
- **HyperFrames (06):** nenhum resultado inventado; um som por impacto; estado inicial definido em t=0.
- **Não usados:** quadro branco (11) e stop-motion (07), porque são de outro estilo, e os prompts genéricos 01, 02, 04 e 10.
- **taste-skill (08):** instalada e lida. É voltada para sites; aproveitei só os princípios de texto curto, sistema único, margens iguais e nada de legenda sob visual.

## Pendências
- Sem logo nos assets. A tela final usa o nome em tipografia. Se houver um logo oficial (SVG/PNG), ele entra no lugar.
- Subtítulo do lower third: "Grupo GPressi". Confirmar se é assim que você quer ser apresentado.
