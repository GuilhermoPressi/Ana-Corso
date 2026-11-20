# Etapa 3: Dados que não podem aparecer. ✅ APROVADO em 20/11/2026

Decisões: **BL03 ativo só nos nomes dos produtos** (as quantidades ficam visíveis) · BL02 "Daniel" mantido borrado por precaução · **S1: faturamento visível** · borrões fixos nas barras de endereço ok · demais suspeitos mantidos.

Tempos em **P1/P2 mm:ss.s** do bruto. A minutagem no vídeo final sai na montagem.
Configuração em `config/blur.json`. As folhas antes/depois estão em `review/borroes/<ID>.png`, com início, meio e fim de cada borrão e um zoom da região já borrada.

## 1. Gatilhos falados
Busquei na transcrição inteira por "não pode aparecer/mostrar", "borra", "esconde", "tapa", "cobre", "não mostra", "privado" e variações. **Não há nenhum pedido seu para esconder algo.**
O único trecho parecido é "na real eu não vou mostrar exemplo nenhum" (P2 10:30), e ele já foi cortado como erro B4.

## 2. Já resolvido pelos cortes aprovados (nenhum quadro disso fica no vídeo)
| Tempo | O que era | Por que já saiu |
|---|---|---|
| P2 17:56–18:16 | **Lastlink › Vendas: e-mails e telefones de 3 clientes** e a comissão de 30 dias | corte C5 |
| P2 6:46.5–6:52 | Histórico do Chrome com **URLs privadas da Lastlink** (comunidade de mentoria e IDs de gerenciamento) | corte B5 |
| P2 6:50 | Aba da Lastlink (creator/community) | corte B5 |
| P2 20:39–20:53 | Pasta do Drive com nomes de arquivos internos ("Tráfego Pago com Claude", "PROMPT — ROTEIRO…", "GERADOR DE FUNIL…") | corte C6 |
| P2 6:45.0–6:45.3 | Aba nova vazia do Chrome | coberta com o último quadro do Drive (K07) |

## 3. Borrões propostos (ATIVOS)
Estilo dos borrões:
- **Técnica:** pixelização em bloco de 14px + desfoque gaussiano, com cantos arredondados (raio 8px) e margem de 12px ou mais.
- **Resultado:** o texto fica ilegível, mesmo ampliado 2×.
- **Entrada e saída:** todos cobrem o plano inteiro, então entram a 100% no primeiro quadro do corte. Nunca há fade de opacidade sobre um dado visível.
- **Zoom:** quando houver zoom na montagem, o borrão é aplicado antes do zoom e vai junto com a imagem.

| ID | Entra → sai | O que é | Motivo | Folha |
|---|---|---|---|---|
| **BL01** | P1 0:23.9 → 0:48.9 | Barra de endereço: `app.utmify.com.br/dashboards/<ID>/…` | suspeito: link privado do dashboard | `BL01.png` |
| **BL02a** | P1 0:23.9 → 0:48.9 | Título **"Dashboard - Daniel"** | suspeito: possível nome de cliente/sócio ⚠ | `BL02a.png` |
| **BL02b** | P1 0:23.9 → 0:48.9 | Menu lateral **"Daniel"** | idem ⚠ | `BL02b.png` |
| **BL04** | P2 6:35.4 → 19:02.3 (todo o trecho de tela) | Barra de endereço. Alterna várias vezes por minuto entre `drive.google.com/file/d/<ID>` (arquivo privado) e `low.grupogpressi.com.br/gltp-texto-97-v2`. | suspeito: link privado. **Fica fixo o trecho todo:** um borrão que liga e desliga a cada troca de aba ficaria piscando. | `BL04.png` |
| **BL05** | P2 20:58.8 → 22:12.5 | Barra de endereço: `drive.google.com/drive/folders/<ID>` | suspeito: link privado | `BL05.png` |

## 4. Suspeitos para você decidir (hoje SEM borrão)
A folha com esses quadros está em `review/borroes/suspeitos_sem_borrao.png`.

| # | Tempo | O que é | Minha recomendação |
|---|---|---|---|
| S1 | P1 0:23.9 → 0:48.9 | **Faturamento da conta:** líquido/bruto R$ 259.522,39, gastos R$ 107.117,43, pendentes R$ 27.547,43, reembolsos R$ 5.756,00, ROAS 2,42, margem 58,7%, "Prêmios R$ 1.9M / R$ 5M" | **Manter.** Você fala esses números ("259 mil de faturamento, 107 mil investidos, 152 mil de lucro") e eles são a prova do gancho. Borrar tiraria a credibilidade da abertura. |
| S2 = BL03 | P1 0:23.9 → 0:48.9 | **Produtos e vendas:** "Pacote Destrave Corporal 2302 (97%)", "Corpo de Yôga 45 (1,9%)" | **Depende do Daniel.** Se o projeto é de um cliente ou sócio, borrar (a simulação está em `BL03.png`). Se é seu, manter. |
| S3 | P2 6:55 → 19:02 (página) | Valores da própria página de vendas: mockup com "Lucro R$ 72.410,22", "Gastos R$ 35.542,62", "Faturamento R$ 108.052,74" e notificações "Venda aprovada / Upsell aprovado – comissão R$ 47/67" | **Manter.** É o conteúdo público da sua página. |
| S4 | P2 10:43 e 14:05 | Carrossel **"Veja resultados dos nossos alunos"**: prints de dashboard com valores (ex.: Lucro R$ 18.216,97, Faturamento R$ 190.701,09), **sem nome de aluno** | **Manter.** Está na página pública e não identifica ninguém. Se algum aluno não autorizou, me avise e eu borro. |
| S5 | P2 21:41 → 21:46 | Caixa de comentário do Drive aberta sem querer, com **seu nome** "Guilhermo Pressi" | **Manter**, porque o nome é seu. Na montagem o zoom no criativo deixa a caixa quase toda fora do quadro. |
| S6 | P1 e P2, a gravação toda | Abas do Chrome ("Hotmart", "Instagram", "Se Eu Quise…", Gmail etc.), relógio do macOS "Qui. 19 de nov.", foto "G" do perfil, "833 GB de 5 TB" no Drive | **Manter.** Não identifica terceiros nem expõe acesso. |
| S7 | P2 18:22–18:32 (FAQ) | Palavras "senha" e "PIX" | **Manter.** São perguntas da sua FAQ ("Como terei acesso…", "formas de pagamento"), não dados. |
| S8 | P2 21:07–22:11 | Criativos com "Cliente nova", "R$ 45" e conversa de WhatsApp | **Manter.** São criativos de exemplo, fictícios. |
| S9 | P2 12:23.5 | Tooltip de aba: "Modelo Pagina de Vendas Direta.png – Google Drive / drive.google.com" | **Manter.** Mostra só o nome do arquivo e o domínio. |

## 5. O que preciso de você
1. **Daniel:** o projeto "Dashboard - Daniel" é de um cliente ou sócio? Se sim, mantenho BL02 e ativo BL03. Se é seu, tiro BL02 e BL03 fica desligado.
2. **S1:** pode **manter os números de faturamento** visíveis na abertura? É o que recomendo.
3. **Ok para os borrões fixos nas barras de endereço** (BL01, BL04, BL05)?

Na Etapa 7, o controle de qualidade roda o OCR de novo no MP4 final e extrai quadros de todos esses trechos, inclusive transições e zooms.
