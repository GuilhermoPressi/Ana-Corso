# Prompt 03 — Taxtello (showreel premium 15s, Remotion)
> USO NESTE PROJETO: contenção, uma ideia por cena, transições que nascem de um elemento da cena anterior,
> easing cubic-bezier(0.16, 1, 0.3, 1), nada inventado, revisar quadros renderizados. IGNORAR cores/fontes da Taxtello.

Princípios-chave do prompt original (resumo fiel, texto completo na conversa de origem):
- Não é explainer genérico de SaaS nem template. Filme de produto nível Apple × fintech premium × editorial × Stripe contido.
- Inspecionar o produto real antes de desenhar. Não inventar funcionalidade, tela ou métrica. Usar valores sintéticos seguros se preciso. Não expor dado pessoal.
- REGRAS: 1 plano = 1 ideia; cenas respiram; a UI é a heroína; pouco texto; sem corte seco sem motivo;
  transições guiadas por objeto (card vira o próximo card, linha do gráfico vira conector, número vira elemento da interface, câmera atravessa a interface);
  easing premium, nada linear; movimentos se sobrepõem (não começam/terminam no mesmo quadro); profundidade com parcimônia;
  nenhum efeito só porque é bonito; sem partículas, sem glassmorphism, sem blur excessivo, sem cards girando, sem zoom constante,
  sem 20 estilos, sem UI quicando, sem parágrafo de marketing.
- TRANSIÇÕES boas: forma compartilhada, número → valor em outra tela, borda de card → próxima superfície, máscara com formas reais.
  Ruins: crossfade, wipe aleatório, spin, glitch, whip-pan a cada 2s, slide-left genérico, zoom-blur.
- MOTION: peso, curvas ~cubic-bezier(0.16,1,0.3,1), chegadas levemente defasadas, antecipação, overshoot < 2%, assentamento. Nada de mola de desenho animado.
- LUZ/MATERIAL: vinheta contida, grão sutil só se ajudar; interface sempre nítida.
- TIPOGRAFIA: pouquíssimo texto, manchete em 1 linha, tipografia se move como objeto (não palavra por palavra).
- SOM: ~115–120 BPM; impacto grave suave nas revelações, cliques táteis contidos, tom resolvido no final. Sem boom de trailer, sem riser EDM, sem whoosh em tudo. Sem áudio com direitos autorais.
- IMPLEMENTAÇÃO: animação determinística por quadro/tempo, sem setTimeout; primitivas reutilizáveis; 60fps.
- FLUXO: storyboard → implementar → renderizar quadros representativos → INSPECIONAR visualmente → corrigir → render final → inspecionar quadros decodificados do MP4.
- BARRA DE QUALIDADE: rejeitar se parecer template SaaS, PowerPoint, gravação de site, demo genérica, anúncio cripto, promo de IA, 5 screenshots deslizando, texto demais. Melhor 3 momentos extraordinários que 10 medianos.
