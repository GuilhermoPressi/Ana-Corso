/**
 * Catálogo de intercorrências.
 *
 * O sistema não diagnostica: ele estrutura o registro para que a documentação
 * fique blindada — o que aconteceu, o que foi feito e como evoluiu.
 */
export type IncidentType = {
  id: string
  label: string
  description: string
  severity: "critica" | "alta" | "moderada"
  /** Condutas típicas, apresentadas como checklist do que foi adotado. */
  conducts: string[]
}

export const incidentTypes: IncidentType[] = [
  {
    id: "isquemia",
    label: "Isquemia / oclusão vascular",
    description: "Palidez, dor desproporcional ou reticulado violáceo após aplicação",
    severity: "critica",
    conducts: [
      "Interrupção imediata da aplicação",
      "Massagem vigorosa da área",
      "Compressa morna",
      "Hialuronidase conforme protocolo",
      "AAS conforme protocolo",
      "Registro fotográfico seriado",
      "Contato diário até resolução",
      "Encaminhamento para especialista",
    ],
  },
  {
    id: "ptose",
    label: "Ptose palpebral",
    description: "Queda de pálpebra após toxina, geralmente por difusão do produto",
    severity: "alta",
    conducts: [
      "Confirmação do diagnóstico em consulta",
      "Orientação sobre caráter temporário",
      "Colírio de apraclonidina conforme prescrição",
      "Registro fotográfico seriado",
      "Reavaliação semanal",
    ],
  },
  {
    id: "assimetria",
    label: "Assimetria",
    description: "Diferença entre os lados percebida após o efeito completo",
    severity: "moderada",
    conducts: [
      "Reavaliação após efeito completo",
      "Registro fotográfico comparativo",
      "Retoque de ajuste",
      "Alinhamento de expectativa com a paciente",
    ],
  },
  {
    id: "nodulo",
    label: "Nódulo",
    description: "Endurecimento palpável no local da aplicação",
    severity: "alta",
    conducts: [
      "Palpação e mapeamento do nódulo",
      "Massagem local orientada",
      "Hialuronidase conforme protocolo",
      "Corticoide intralesional conforme prescrição",
      "Registro fotográfico seriado",
      "Reavaliação quinzenal",
    ],
  },
  {
    id: "edema",
    label: "Edema persistente",
    description: "Inchaço além do esperado para o tempo de pós",
    severity: "moderada",
    conducts: [
      "Compressa fria orientada",
      "Elevação da cabeceira ao dormir",
      "Anti-inflamatório conforme prescrição",
      "Reavaliação em 48 h",
      "Investigação de alergia",
    ],
  },
  {
    id: "hematoma",
    label: "Hematoma extenso",
    description: "Equimose maior que o esperado para o procedimento",
    severity: "moderada",
    conducts: [
      "Compressa fria nas primeiras 24 h",
      "Compressa morna a partir de 48 h",
      "Orientação sobre tempo de resolução",
      "Registro fotográfico",
    ],
  },
  {
    id: "infeccao",
    label: "Infecção",
    description: "Calor, rubor, dor e secreção no local",
    severity: "critica",
    conducts: [
      "Cultura quando indicado",
      "Antibioticoterapia conforme prescrição",
      "Drenagem quando indicado",
      "Registro fotográfico seriado",
      "Reavaliação a cada 48 h",
      "Encaminhamento para especialista",
    ],
  },
  {
    id: "alergia",
    label: "Reação alérgica",
    description: "Prurido, urticária ou angioedema após o procedimento",
    severity: "critica",
    conducts: [
      "Interrupção imediata da aplicação",
      "Anti-histamínico conforme prescrição",
      "Corticoide conforme prescrição",
      "Observação em ambiente assistido",
      "Encaminhamento para emergência se progressão",
      "Registro do lote e do produto",
    ],
  },
]

export function incidentTypeById(id: string) {
  return incidentTypes.find((item) => item.id === id) ?? incidentTypes[0]
}
