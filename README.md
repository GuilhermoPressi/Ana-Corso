# Ana Corso

SaaS de gestão para clínicas de estética. Front-end em React + TypeScript, com design premium
voltado ao público de profissionais da estética: paleta rosa elegante, fundos claros e componentes
com bordas suaves.

## Stack

| Camada | Escolha |
| --- | --- |
| Build | Vite 8 + React 19 + TypeScript |
| Estilo | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Componentes | shadcn/ui (estilo *new-york*) sobre Radix UI |
| Rotas | React Router 7 |
| Ícones | Lucide React |
| Gráficos | Recharts 3 |
| Estado global | Zustand 5 |
| Drag and drop | @hello-pangea/dnd 18 |
| 3D | three + @react-three/fiber + @react-three/drei |

O calendário da Agenda é construído com Tailwind e os componentes do shadcn/ui, sem biblioteca de
calendário: `react-big-calendar` traz CSS próprio que brigaria com o design system.

> Tailwind v4 não usa `tailwind.config.js`. Todo o tema (cores, raio, sombras, fontes) vive em
> [`src/index.css`](src/index.css), dentro dos blocos `:root`, `.dark` e `@theme inline`.

## Comandos

```bash
npm run dev      # ambiente de desenvolvimento em http://localhost:5173
npm run build    # typecheck + build de produção
npm run preview  # serve o build gerado
npm run lint     # oxlint
```

## Design system

Definido em `src/index.css`:

- **Primária** `hsl(335 78% 65%)` · **fundo** `hsl(340 45% 99%)` · **raio base** `0.85rem`
- Tipografia **Inter** (corpo) e **Outfit** (títulos, via classe `font-display`)
- Sombras `--shadow-soft` e `--shadow-glass`, além do utilitário `.glass-panel`
- 5 cores de gráfico (`--chart-1` a `--chart-5`) derivadas do rosa da marca
- Tokens próprios de sidebar e modo escuro completo já mapeado

## Estrutura

```
src/
├─ components/
│  ├─ clinical/    FaceMap (mapa facial), FaceGhost (silhueta), Consulta Rápida
│  ├─ layout/      DashboardLayout, SidebarNav, Header, PageHeader, Logo
│  ├─ dashboard/   MetricCard, RevenueChart, TodayAgenda, AlertsCard, TopProcedures, GoalCard
│  ├─ planning/    FieldControl (renderiza os campos da avaliação guiada)
│  ├─ ui/          componentes shadcn/ui
│  └─ ComingSoon.tsx
├─ data/           dados mockados (dashboard, patients, leads, facialPlanning)
├─ stores/         usePatientStore e useFinanceStore (Zustand)
├─ lib/            navigation, utils, clinic (data "hoje"), number, pricing
└─ pages/          uma página por rota
```

Todas as rotas são carregadas com `React.lazy` em `src/App.tsx`, então cada tela vira um chunk
próprio e a primeira carga não paga o custo do Recharts fora do dashboard.

## Telas implementadas

- **Minha Clínica** (`/`) — 6 métricas do mês, gráfico de faturamento/lucro/meta com recorte de
  6 ou 12 meses, agenda de hoje em abas (consultas, retornos, leads), meta do mês, alertas
  priorizados e ranking de procedimentos.
- **Pacientes** (`/pacientes`) — tabela com busca, filtro por status e por procedimento, ordenação
  e cards-atalho por status.
- **Ficha da Paciente** (`/pacientes/:patientId`) — cabeçalho com indicadores, destaque do próximo
  retorno e abas de visão geral, procedimentos, linha do tempo, retornos, fotos e produtos.
- **Planejamento Facial** (`/planejamento-facial`) — avaliação guiada em 4 passos: paciente, linha
  de trabalho (toxina, preenchimento, bioestimulador), regiões e campos estruturados por região,
  com resumo do raciocínio em tempo real.

- **Calculadoras Clínicas** (`/calculadoras`) — custo por unidade (com rendimento do frasco e perda por
  sobra) e reconstituição (concentração, UI por 0,1 ml, traços de seringa de insulina e comparativo de
  diluições de 1 a 5 ml).
- **Precificação Inteligente** (`/precificacao`) — cria procedimentos com custo real, preço mínimo e preço
  recomendado, abre o preço praticado em custo/taxa/imposto/lucro e guarda tudo numa tabela de preços.
- **CRM de Pacientes e Leads** (`/crm`) — funil kanban de 5 colunas com arrastar e soltar, valor somado de
  propostas abertas, taxa de conversão e conversão de lead em ficha de paciente.
- **Financeiro** (`/financeiro`) — entradas, custos e lucro do mês, com a visão de **lucratividade por
  procedimento** (margem de contribuição em reais e em %), composição dos custos e o extrato de lançamentos.
- **Estoque** (`/estoque`) — saldo por lote e validade, alertas de mínimo e de vencimento, reposição,
  cadastro de produtos e o extrato de movimentações com a paciente que consumiu cada item.
- **Agenda Inteligente** (`/agenda`) — calendário mensal próprio (sem biblioteca externa), painel do dia
  selecionado e destaque para os compromissos criados pela automação.
- **Recuperador de Pacientes** (`/recuperador`) — quatro segmentos calculados sobre a base (toxina vencendo,
  sem atendimento, retorno pendente e orçamento parado), com o potencial em reais de cada lista e campanha
  de mensagens personalizadas.
- **Criador de Protocolos e Combos** (`/protocolos`) — monta pacotes com cronograma por dia e compara o
  preço avulso com o preço fechado, mostrando a economia da paciente.
- **Mapa do Procedimento** (`/mapa-do-procedimento`) — em duas visões. A **2D** é uma face em SVG com regiões
  clicáveis; a **3D (beta)** é uma malha que gira, onde o clique marca o ponto direto na superfície. Cada
  ponto registra produto, quantidade, profundidade, técnica e observação, e os mapas anteriores da paciente
  ficam ao lado.
- **Consulta Rápida** (`/consulta-rapida` e ⌘K em qualquer tela) — referência de bolso com busca sem acento:
  anatomia, tabela de diluição, zonas de risco vascular, contraindicações e conduta.
- **Pós-procedimento** (`/pos-procedimento`) — régua de contato calculada a partir do que foi feito em cada
  paciente, em quatro colunas: atrasados, hoje, próximos 7 dias e concluídos.
- **Central de Intercorrências** (`/intercorrencias`) — registro com data, produto, lote, relato, checklist
  de condutas e linha do tempo da evolução. O registro parte da ficha da paciente.
- **Marketing** (`/marketing`) — gerador de conteúdo (gancho, roteiro por formato e legenda com hashtags) e
  banco de ideias filtrável por categoria.
- **Biblioteca de Documentos** (`/documentos`) — cinco modelos com os dados da clínica preenchidos e prévia
  pronta para imprimir ou salvar em PDF.

O **Gerador de Plano** vive dentro do Planejamento Facial: o botão "Gerar proposta" renderiza um documento
premium com as etapas, o raciocínio traduzido para a linguagem da paciente e o investimento. Dá para anexar
um protocolo da clínica, imprimir/salvar em PDF e enviar — o envio registra a proposta e cria o lead no CRM.

> O Planejamento Facial **não sugere dose, volume ou unidade** — ele organiza a avaliação para que a
> decisão técnica continue sendo da profissional. O mesmo vale para as Calculadoras: elas fazem a
> matemática, não a prescrição. Isso está explícito nas duas interfaces.

## Estado global

Quatro stores Zustand concentram o "banco de dados" da demonstração:

- **`usePatientStore`** — pacientes, leads do CRM e as ações `addPatient`, `registerProcedure`, `moveLead`,
  `convertLead` e `addScheduledLead`.
- **`useFinanceStore`** — ledger de receitas e despesas, meta do mês, série histórica e os procedimentos
  precificados.
- **`useInventoryStore`** — produtos por lote e validade, movimentações e a ação `consume`, que devolve o
  custo do que saiu.
- **`useScheduleStore`** — eventos da agenda, incluindo os gerados automaticamente.
- **`useCatalogStore`** — protocolos/combos da clínica e as propostas geradas para as pacientes.
- **`useProcedureMapStore`** — mapas de aplicação por paciente, com os pontos marcados na face.
- **`usePostCareStore`** — registro dos contatos de pós-procedimento já realizados.
- **`useIncidentStore`** — intercorrências, condutas adotadas e a evolução de cada caso.
- **`useClinicStore`** — dados da clínica que alimentam documentos, propostas e conteúdo.

### O ciclo interligado

Registrar um procedimento na ficha da paciente é o ponto em que os módulos se encontram. O orquestrador
está em [`src/hooks/useRegisterProcedure.ts`](src/hooks/useRegisterProcedure.ts) e faz, em ordem:

1. **Estoque** — dá baixa na quantidade consumida e devolve o custo direto do que saiu.
2. **Ficha** — grava o procedimento, a linha do tempo, o retorno programado e recalcula sessões, total
   investido e ticket médio.
3. **Financeiro** — lança a receita já com o custo direto, alimentando a margem de contribuição.
4. **Agenda** — cria o retorno clínico na data da regra do procedimento.
5. **CRM** — programa o recontato comercial para quando o efeito tende a ceder.

As regras de acompanhamento ficam em [`src/data/followUp.ts`](src/data/followUp.ts) — toxina gera retorno
em 14 dias e recontato em 120; bioestimulador gera retorno em 30 e a próxima sessão em 60, e assim por
diante. O diálogo de registro mostra essas datas **antes** de confirmar, para a profissional saber
exatamente o que vai acontecer.

### Mensageria: um clique, uma aba

Por decisão do cliente **não existe mensageria interna** — nem caixa de entrada, nem disparo, nem API. O
sistema só encurta o caminho até a conversa que a clínica já tem.

[`src/lib/whatsapp.ts`](src/lib/whatsapp.ts) monta o link `wa.me` normalizando o telefone (dígitos + DDI 55)
e tem os rascunhos por contexto. `contextualMessage()` escolhe o rascunho sozinho, conforme o momento da
paciente — pós-procedimento se atendeu nos últimos 7 dias, retorno se está atrasado, aniversário no mês do
nascimento, reativação se está inativa. Nada disso aparece na interface: o `WhatsAppButton` é um botão só,
que abre a conversa em nova aba com o texto já preenchido, pronto para revisar e enviar no WhatsApp.

### Estado derivado que o usuário pode editar

Padrão que vale para qualquer campo pré-preenchido e editável do sistema. Sincronizar por `useEffect` gera
render em cascata (e o oxlint acusa `set-state-in-effect`). A alternativa guarda apenas a **edição manual** e
a descarta quando a origem muda, ajustando o estado durante o render:

```tsx
const [edited, setEdited] = useState<string | null>(null)
const [lastKey, setLastKey] = useState(key)
if (key !== lastKey) {
  setLastKey(key)
  setEdited(null)
}
const value = edited ?? derivedValue
```

### O mapa 3D

O modelo oficial da cena é **`public/face.glb`**, carregado com `useGLTF`. Ele é medido e reescalado
automaticamente para uma altura fixa, então funciona qualquer que seja a unidade do exportador — um
modelo em centímetros e outro em metros caem na mesma moldura sem ajuste manual. O material original é
substituído pelo tom de pele do design system.

Se o arquivo não estiver publicado, a cena cai num **volume de reserva** (a esfera deformada em
[`headGeometry.ts`](src/components/clinical/headGeometry.ts)) e a interface diz exatamente o que fazer.
Isso existe porque `useGLTF` suspende e depois **lança fora do ciclo de render** quando o arquivo falta —
nenhum error boundary alcança essa exceção. Por isso a disponibilidade é verificada antes, em
[`useModelAvailability.ts`](src/components/clinical/useModelAvailability.ts): não basta o status HTTP,
porque tanto o dev server quanto o artefato respondem `index.html` para caminhos desconhecidos. A checagem
olha o content-type e a assinatura `glTF` dos primeiros bytes.

Se o rosto aparecer de costas ou deitado, `MODEL_ROTATION` em `FaceMap3D.tsx` corrige a orientação — a
marcação acompanha, porque a direção do clique é calculada depois das transformações.

O clique usa o raycasting do R3F (`event.point`) e descobre a região por proximidade às âncoras 3D de
[`faceRegions.ts`](src/data/faceRegions.ts). A comparação é feita entre **direções normalizadas** dentro da
caixa delimitadora do modelo, não entre posições absolutas: a cabeça é alongada em y e achatada em z, então
a distância bruta favoreceria as regiões dos eixos mais compridos — e normalizar pela caixa faz a mesma
conta valer para qualquer malha. Como a inferência é aproximada, a região sugerida pode ser corrigida num
select ao lado do formulário.

Dois cuidados de interação que valem registro:

- **Girar não marca.** O gesto de rotação começa e termina sobre a malha; guardamos a posição do
  `pointerdown` e só tratamos como clique quando o ponteiro andou menos de 5px.
- **A cena carrega sob demanda.** `FaceMap3D` entra por `React.lazy`, então os 900 KB do three.js só são
  baixados quando alguém abre a aba 3D. A visão 2D segue como padrão.

### A régua de pós-procedimento é derivada, não armazenada

Nenhuma tarefa de pós é criada no banco. A tela percorre os procedimentos dos últimos 45 dias, aplica a
régua de [`src/data/postCare.ts`](src/data/postCare.ts) — toxina tem D+1, D+7 e D+14; preenchimento tem
D+1, D+3, D+7 e D+30 — e calcula as datas. A `usePostCareStore` guarda só o que **já foi feito**.

O efeito prático: mudar a régua reorganiza a fila de todo mundo na hora, sem migração de dados. E como o
que se persiste é o contato realizado, não a pendência, não existe tarefa órfã quando um procedimento é
corrigido.

### Custo direto x compra de produto

São coisas diferentes e o financeiro trata assim: `productPurchases` é a saída de caixa da compra;
`directCost` é o que foi efetivamente **consumido** nos atendimentos. A margem de contribuição usa o
consumo; o lucro do mês usa o caixa. O custo fixo é calculado a partir das despesas que não são compra de
produto — nunca por subtração do consumo, que pode divergir da compra dentro do mesmo mês.

O dashboard **deriva** faturamento, lucro, margem, ticket médio e distribuição por procedimento a partir do
ledger, em vez de guardar agregados soltos. Como o mock não enumera as 57 sessões do mês, existe uma
`baseline` explícita para a parte não itemizada — e as somas fecham: baseline (R$ 74.750 / 52 sessões) mais
o ledger (R$ 9.600 / 5 sessões) dão os R$ 84.350 / 57 do mês. Cadastrar uma paciente ou lançar uma receita
atualiza os números na hora.

## Módulos em construção

Quatro rotas seguem com a tela `ComingSoon`, e o texto de cada uma explica de que ela depende:

- **Antes e Depois** e **Gerador de Plano** — as funcionalidades já existem dentro da ficha da paciente e do
  Planejamento Facial. A rota reserva o lugar da visão consolidada da clínica.
- **Academia** — depende do upload das aulas gravadas.
- **IA da Especialista** — depende da integração com o provedor de IA.

Mais **Configurações**, que segue como espaço reservado.

A **Central de WhatsApp** foi removida do menu: por decisão de escopo, a mensageria é um botão dentro das
telas, não um módulo.

## Dados

Todo o conteúdo vem de mocks tipados em `src/data/`, carregados como estado inicial das stores. Não há
chamadas de rede nem persistência: recarregar a página volta ao estado semeado. Para plugar uma API ou o
Supabase, troque o seed das stores pela camada de fetch mantendo os mesmos tipos e as mesmas ações.

## Nota de configuração

`vite.config.ts` fixa `resolve.dedupe` e `optimizeDeps.include` para React, React DOM, o
`react-reconciler` e o three.

Duas bibliotecas já tropeçaram nisso: o `@hello-pangea/dnd` (CRM) e o `@react-three/fiber` (mapa 3D). Ambas
renderizam por caminhos próprios e, quando o Vite as otimiza numa passada separada da aplicação, uma segunda
cópia do React entra em cena e o componente quebra com "Invalid hook call". Forçar tudo na mesma passada
resolve — o sintoma é fácil de confirmar: se os módulos em `node_modules/.vite/deps` não compartilharem o
mesmo `?v=hash`, existe mais de um React carregado.
