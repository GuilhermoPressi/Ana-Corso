# Relatório de edição — “R$ 100 mil por mês com low ticket”

Versão de revisão: `export/100k_por_mes_low_ticket_leve.mp4` (1920×1080, 30 fps, 2500k, AAC 192k). **O final em CRF 17 ainda não foi renderizado e aguarda a sua aprovação.**

## Revisão 1 (21/11)
- Mapa: a caixa cresce com o texto, então nenhuma escrita sai mais da caixa.
- Tráfego: entrou o componente **estrutura** (árvore Campanha → Conjunto com Advantage+, Totalmente aberto e Sem segmentação → Criativo 1…5, cada nó na palavra), no lugar da métrica 1·1·5, mais duas frases: “Produto, oferta, páginas e criativos” e “Toda semana: tráfego pago para low ticket”.
- O convite para o vídeo de criar produto com o Claude saiu do fim e entrou logo depois da explicação de produto (1:41–1:55). O vídeo agora termina em “…mesmo começando do zero”, e o encerramento entra depois.

## Números
- Bruto: 29:37 (2 partes) → **final 20:23 + 15s de tela final = 20:38**.
- 16 trechos mantidos (`config/edl.json`) e 88 segmentos depois de enxugar as pausas.
- Pausas acima de 0,6s viraram ~0,35s, com cortes no limite de palavra e fade de 8ms. Em tela, a pausa ficou inteira quando a imagem estava em movimento (rolagem ou carregamento), para a ação não pular.
- Punch-in alternado de 1,00 para 1,07 nos cortes secos de câmera (21 segmentos).

## Cortes feitos
Todos os itens aprovados em `review/erros.md`: bastidor, regravações (fica a última tomada; ponte do tráfego = “Agora entrando na parte do tráfego pago”), frases abandonadas, conversas fora do vídeo, janelas do OBS (D6 resolvido com L-cut de câmera) e a aba vazia em P2 6:45 (quadro congelado).

## Borrões aplicados (`config/blur.json`)
| ID | O quê | Final |
|---|---|---|
| BL01 | URL do dashboard UTMify com ID privado | 0:00.0 → 0:23.2 |
| BL02a | título 'Dashboard - Daniel' | 0:00.0 → 0:23.2 |
| BL02b | menu lateral 'Daniel' | 0:00.0 → 0:23.2 |
| BL03 | nomes de produtos ('Pacote Destrave Corporal', 'Corpo de Yôga'); quantidades ficam visíveis | 0:00.0 → 0:23.2 |
| BL04 | barra de endereço: link privado do arquivo no Drive (alterna com a página pública) | 5:59.5 → 15:48.0 |
| BL05 | barra de endereço: link privado da pasta no Drive | 16:21.3 → 17:32.6 |

## Motions usados (`config/motion.json`, kit v2 escuro)
| # | Final | Componente | Texto |
|---|---|---|---|
| MO01 | 0:00.4 | frase | “Os primeiros / R$ 100 mil por mês” (sublinhado na 2ª linha) |
| MO02 | 0:16.7 | destaque | “R$ 259 mil de faturamento” → “R$ 107 mil investidos” → “R$ 152 mil de lucro” |
| MO03 | 0:23.8 | lowerthird | “Guilhermo Pressi” |
| MO04 | 0:28.4 | mapa | Mapa do vídeo, etapa 1 acesa: “Produto” (título: “Do zero aos R$ 100 mil por mês”) |
| MO05 | 0:38.2 | frase | “Algo que a gente / consiga tocar” (sublinhado em “consiga tocar”) |
| MO06 | 1:46.2 | mapa | Mapa do vídeo, etapa 2 acesa: “Oferta” (título: “Do zero aos R$ 100 mil por mês”) |
| MO07 | 2:10.0 | frase | “Não vá pra / grandes mercados” |
| MO08 | 3:34.2 | escada | “Comece simples” + degraus “R$ 100/dia → R$ 200/dia → R$ 400/dia → R$ 1.000/dia → R$ 100 mil/mês”, cada um no valor falado |
| MO09 | 4:35.4 | antesdepois | “Nichar a oferta” · Oferta ampla: “Dieta para emagrecer 8 kg até o final do mês” / “Será que é pra mim?” → Oferta nichada: “…para quem toma Mounjaro” / “É pra mim.” |
| MO10 | 5:08.3 | metrica | “15 mil” · “Compradores do curso de teclado” |
| MO11 | 5:46.9 | mapa | Mapa do vídeo, etapa 3 acesa: “Página de vendas” (título: “Do zero aos R$ 100 mil por mês”) |
| MO12 | 6:45.2 | destaque | “1 · A promessa” → “2 · O mecanismo” |
| MO13 | 7:18.9 | destaque | “3 · Quebra de objeção” |
| MO14 | 10:03.8 | destaque | “4 · Prévia em vídeo” |
| MO15 | 11:22.8 | destaque | “5 · Pra quem é” |
| MO17 | 13:24.5 | destaque | “6 · Bônus” |
| MO18 | 13:35.8 | destaque | “7 · Preço” |
| MO19 | 14:10.4 | destaque | “8 · Garantia” |
| MO20 | 14:29.7 | destaque | “9 · Motivos (2 opções)” |
| MO21 | 15:08.0 | destaque | “10 · Dúvidas frequentes” |
| MO22 | 15:59.1 | mapa | Mapa do vídeo, etapa 4 acesa: “Criativos” (título: “Do zero aos R$ 100 mil por mês”) |
| MO23 | 16:06.4 | metrica | “5” Criativos por campanha · “3” Em vídeo · “2” Em imagem |
| MO24 | 16:29.8 | destaque | “Nota do celular” |
| MO25 | 16:53.0 | destaque | “Print do WhatsApp” |
| MO26 | 16:58.4 | destaque | “Caixinha de perguntas” |
| MO28 | 18:43.4 | mapa | Mapa do vídeo, etapa 5 acesa: “Tráfego pago” (título: “Do zero aos R$ 100 mil por mês”) |
| MO29 | 18:49.8 | metrica | Estrutura “1 · 1 · 5”: “1” Campanha · “1” Conjunto · Advantage+ · “5” Criativos |
| MO30 | 19:44.9 | mapa | Mapa do vídeo, etapa 5 acesa: “Tráfego pago” (título: “Resumindo”) |
| MO31 | 20:23.6 | final | “Assista também” / “Tráfego pago para low ticket, toda semana” + 2 espaços para os vídeos do YouTube |

## Áudio
- Voz: declip (os 7.428 picos achatados do bruto foram reconstruídos), passa-alta de 70 Hz, EQ leve, compressor e loudnorm em 2 passos.
- (Revisão 3: trilha **removida** a pedido do autor; efeitos baixados 6 dB; voz conferida idêntica antes/depois.) Trilha **sintetizada CC0** (`assets/trilhas/FONTES.md`) bem baixa, abaixada pela voz com sidechain. Efeitos sintetizados CC0, um por impacto.
- Mix final: **-14.0 LUFS**, true peak **-1.0 dBFS**.

## Controle de qualidade (no MP4 exportado)
- Quadros extraídos de cada borrão (1º quadro, +1 quadro, meio e último) e de cada motion em `review/qc/`. Conferi visualmente e não vazou nenhum dado.
- OCR a cada 1s no vídeo inteiro: **0 ocorrências** de e-mail, telefone, CPF/CNPJ, URL privada ou nomes borrados.
- Transcrição do áudio final: nenhuma fala de bastidor nem pedido para esconder algo. 3 alertas eram falsos positivos (“corta pra uma apresentação”, “gravar 5 criativos”, “cortando embaixo de mim”).
- Nenhum quadro preto. O único trecho parado acima de 4s é a tela final, estática de propósito. A voz tem a mesma duração da base (1223,633s), então não há drift de sincronia.

## Comprometimentos que restaram
1. **Resolução:** o bruto é 720p. Fiz upscale de 1,5× (lanczos). Os motions são nativos em 1080p, mas a gravação de tela fica um pouco macia.
2. **Clipping do microfone:** o declip melhora bastante, mas distorção forte de gravação não volta 100%. Para os próximos vídeos, baixar o ganho do mic até o pico ficar perto de -6 dBFS.
3. **Destaques removidos:** MO16 (“O que vai dominar”) e MO27 (“Antes e depois”) saíram, porque a tela rola ou troca de aba durante a fala e não há janela estável. As etiquetas das dobras foram renumeradas de 1 a 10.
4. **Dobra 9:** no lugar do modelo “Motivos”, o destaque marca a seção real da sua página (“2 opções”), que é a que você está mostrando.
5. **Zoom em tela:** não usei zoom nos trechos de tela. Os contornos com escurecimento fazem o papel de guiar o olho, sem tremer e sem desalinhar os borrões.
6. **Encerramento:** ainda não existe. A tela final entra logo depois de “…termino de ver esse vídeo aqui primeiro.” Quando o encerramento chegar, ele entra antes da tela final.
7. **Trilha:** é sintética e simples. Pode ser trocada por qualquer trilha licenciada sem refazer o resto.
