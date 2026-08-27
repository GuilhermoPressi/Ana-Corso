/**
 * Modelos de documentos da clínica.
 *
 * O texto usa variáveis no formato {{chave}}, preenchidas com os dados da
 * clínica (useClinicStore) e da paciente selecionada.
 */
export type DocumentSection = {
  heading?: string
  paragraphs?: string[]
  bullets?: string[]
  /** Campos em branco para a paciente preencher à mão. */
  fields?: { label: string; lines?: number }[]
  /** Linhas de assinatura ao final. */
  signatures?: string[]
}

export type DocumentTemplate = {
  id: string
  title: string
  category: "Anamnese" | "Consentimento" | "Evolução" | "Contrato"
  description: string
  /** Aviso mostrado na interface, fora do documento. */
  notice?: string
  sections: DocumentSection[]
}

export const documentTemplates: DocumentTemplate[] = [
  {
    id: "anamnese",
    title: "Ficha de anamnese",
    category: "Anamnese",
    description: "Histórico de saúde e hábitos, preenchido antes do primeiro procedimento.",
    sections: [
      {
        heading: "Identificação",
        fields: [
          { label: "Nome completo" },
          { label: "Data de nascimento" },
          { label: "Telefone" },
          { label: "Profissão" },
        ],
      },
      {
        heading: "Histórico de saúde",
        bullets: [
          "Faz uso contínuo de alguma medicação? Qual?",
          "Possui alergia a medicamentos, anestésicos ou cosméticos?",
          "Tem alguma doença autoimune ou neuromuscular?",
          "Está gestante ou amamentando?",
          "Tem histórico de herpes labial?",
          "Faz uso de anticoagulante ou anti-inflamatório?",
          "Realizou procedimento estético nos últimos 6 meses? Qual?",
        ],
      },
      {
        heading: "Hábitos e cuidados",
        bullets: [
          "Usa protetor solar diariamente?",
          "Fuma ou consome álcool com frequência?",
          "Qual a sua rotina de cuidados com a pele?",
          "Qual a sua principal queixa hoje?",
          "Qual resultado você espera alcançar?",
        ],
      },
      {
        heading: "Declaração",
        paragraphs: [
          "Declaro que as informações acima são verdadeiras e que informei à profissional todas as condições de saúde relevantes. Comprometo-me a comunicar qualquer alteração no meu estado de saúde antes de novos procedimentos.",
        ],
        signatures: ["Assinatura da paciente", "{{profissional}} · {{registro}}"],
      },
    ],
  },
  {
    id: "termo-toxina",
    title: "Termo de consentimento · Toxina botulínica",
    category: "Consentimento",
    description: "Consentimento informado para aplicação de toxina botulínica.",
    notice: "Revise com o seu conselho profissional antes de adotar como padrão da clínica.",
    sections: [
      {
        paragraphs: [
          "Eu, {{paciente}}, declaro que fui devidamente informada por {{profissional}} ({{registro}}), na {{clinica}}, sobre o procedimento de aplicação de toxina botulínica.",
        ],
      },
      {
        heading: "Sobre o procedimento",
        paragraphs: [
          "A toxina botulínica age reduzindo temporariamente a contração dos músculos tratados, suavizando as linhas de expressão. O efeito é temporário e a duração varia conforme o organismo, a região tratada e o produto utilizado.",
        ],
      },
      {
        heading: "Riscos e possíveis reações",
        bullets: [
          "Dor, vermelhidão, edema ou hematoma no local da aplicação",
          "Cefaleia nas primeiras horas",
          "Assimetria temporária, podendo exigir retoque",
          "Queda temporária de pálpebra ou de sobrancelha",
          "Reação alérgica, em casos raros",
          "Resultado abaixo do esperado, exigindo complementação",
        ],
      },
      {
        heading: "Orientações pós-procedimento",
        bullets: [
          "Não deitar nem abaixar a cabeça nas 4 horas seguintes",
          "Não massagear a região tratada",
          "Evitar exercício físico intenso, sauna e calor local por 24 horas",
          "Comunicar imediatamente qualquer alteração visual ou dor intensa",
        ],
      },
      {
        heading: "Declaração de consentimento",
        paragraphs: [
          "Declaro que tive a oportunidade de esclarecer todas as minhas dúvidas, que compreendi as informações acima e que autorizo a realização do procedimento. Estou ciente de que a medicina estética não é uma ciência exata e que não há garantia de resultado específico.",
        ],
        signatures: ["{{paciente}}", "{{profissional}} · {{registro}}"],
      },
    ],
  },
  {
    id: "termo-preenchimento",
    title: "Termo de consentimento · Preenchimento",
    category: "Consentimento",
    description: "Consentimento informado para preenchimento com ácido hialurônico.",
    notice: "Revise com o seu conselho profissional antes de adotar como padrão da clínica.",
    sections: [
      {
        paragraphs: [
          "Eu, {{paciente}}, declaro que fui devidamente informada por {{profissional}} ({{registro}}), na {{clinica}}, sobre o procedimento de preenchimento com ácido hialurônico.",
        ],
      },
      {
        heading: "Sobre o procedimento",
        paragraphs: [
          "O preenchimento com ácido hialurônico repõe volume e melhora o contorno facial. O produto é reabsorvível e a duração varia conforme o organismo, a área tratada e o produto utilizado.",
        ],
      },
      {
        heading: "Riscos e possíveis reações",
        bullets: [
          "Edema, hematoma e sensibilidade local nos primeiros dias",
          "Assimetria, podendo exigir ajuste",
          "Formação de nódulo palpável",
          "Infecção no local da aplicação",
          "Reação alérgica, em casos raros",
          "Oclusão vascular, complicação rara e grave, com risco de necrose e de comprometimento visual",
        ],
      },
      {
        heading: "Sinais de alerta",
        paragraphs: [
          "Comprometo-me a comunicar imediatamente a clínica caso apresente dor intensa e desproporcional, palidez ou manchas na pele, alteração da visão ou qualquer sintoma que me preocupe.",
        ],
      },
      {
        heading: "Declaração de consentimento",
        paragraphs: [
          "Declaro que tive a oportunidade de esclarecer todas as minhas dúvidas, que compreendi as informações acima, incluindo os riscos raros e graves, e que autorizo a realização do procedimento.",
        ],
        signatures: ["{{paciente}}", "{{profissional}} · {{registro}}"],
      },
    ],
  },
  {
    id: "evolucao",
    title: "Ficha de evolução",
    category: "Evolução",
    description: "Registro do atendimento, com produto, lote e conduta.",
    sections: [
      {
        heading: "Dados do atendimento",
        fields: [
          { label: "Paciente" },
          { label: "Data" },
          { label: "Procedimento realizado" },
          { label: "Produto e lote" },
          { label: "Quantidade aplicada" },
          { label: "Regiões tratadas" },
        ],
      },
      {
        heading: "Avaliação e conduta",
        fields: [{ label: "Avaliação prévia", lines: 3 }, { label: "Técnica utilizada", lines: 2 }],
      },
      {
        heading: "Intercorrências",
        fields: [{ label: "Houve intercorrência? Descrever", lines: 3 }],
      },
      {
        heading: "Orientações e retorno",
        fields: [{ label: "Orientações dadas", lines: 3 }, { label: "Retorno agendado para" }],
        signatures: ["{{profissional}} · {{registro}}"],
      },
    ],
  },
  {
    id: "contrato",
    title: "Contrato de prestação de serviços",
    category: "Contrato",
    description: "Contrato para protocolos e pacotes com mais de uma sessão.",
    notice: "Modelo genérico. Submeta à revisão jurídica antes de usar com pacientes.",
    sections: [
      {
        paragraphs: [
          "Pelo presente instrumento, de um lado {{clinica}}, representada por {{profissional}} ({{registro}}), com endereço em {{endereco}}, {{cidade}}, doravante denominada CONTRATADA, e de outro lado {{paciente}}, doravante denominada CONTRATANTE, têm entre si justo e contratado o seguinte:",
        ],
      },
      {
        heading: "Cláusula 1ª · Do objeto",
        fields: [{ label: "Protocolo contratado e sessões incluídas", lines: 3 }],
      },
      {
        heading: "Cláusula 2ª · Do investimento",
        fields: [{ label: "Valor total e forma de pagamento", lines: 2 }],
      },
      {
        heading: "Cláusula 3ª · Das obrigações da CONTRATANTE",
        bullets: [
          "Comparecer às sessões nas datas agendadas",
          "Seguir as orientações de pré e pós-procedimento",
          "Informar alterações no estado de saúde",
          "Comunicar cancelamento com no mínimo 24 horas de antecedência",
        ],
      },
      {
        heading: "Cláusula 4ª · Das obrigações da CONTRATADA",
        bullets: [
          "Realizar os procedimentos conforme técnica e produtos acordados",
          "Manter registro clínico de cada sessão",
          "Prestar acompanhamento pós-procedimento",
          "Manter sigilo sobre os dados e imagens da CONTRATANTE",
        ],
      },
      {
        heading: "Cláusula 5ª · Do resultado",
        paragraphs: [
          "As partes reconhecem que a obrigação assumida é de meio e não de resultado, uma vez que a resposta a procedimentos estéticos varia conforme características individuais da CONTRATANTE.",
        ],
        signatures: ["{{paciente}}", "{{profissional}} · {{registro}}", "Testemunha"],
      },
    ],
  },
]

export type DocumentVariables = Record<string, string>

/** Troca {{chave}} pelos dados da clínica e da paciente. */
export function fillTemplate(text: string, variables: DocumentVariables) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => variables[key] ?? match)
}
