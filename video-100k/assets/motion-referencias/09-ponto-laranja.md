# Prompt 09 — "ponto laranja" (elemento-assinatura)
> USO NESTE PROJETO: um único elemento da marca costura as cenas (ponto laranja → ponto VERDE #135613);
> animação calculada por seek(t), determinística, molas em forma fechada, sem timers. Ignorar a cor laranja.

<direction> A 2D motion design film in 16:9. Warm off-white canvas, near-black backgrounds, bold typography and one vivid accent. The dot connects every scene: it starts in the UI, becomes the dot over a letter, traces a spring graph, grows into a shape and returns on the end card. Sharp, controlled motion, small spring overshoots, no dead time.
Banned: stock footage, gradients, glows, particle bursts, random transitions and motion not connected to an element already on screen. </direction>
<build> 1. One HTML file, 1920x1080 @60fps. Compute every visual from time inside seek(t): no CSS transitions, timers or carried state.
2. Closed-form springs; draw the graph from the same spring that moves the dot.
3. Animate letters individually for word transformations; keep the dot attached until it jumps.
4. Circle, rounded square and pill are states of the same shape; preserve position/motion.
5–6. Orbiting words → halftone grid of dots that respond to the dot; grow past frame edges before end card.
7. Sync hits to measured beats; render one frame per beat before full export. </build>
<gotchas> Graph and dot must follow the same motion. Keep the accent consistent. Separate timing for outgoing/incoming text. When a shape fills the screen, scale past all four corners. Match first and last frames for clean loops. </gotchas>
