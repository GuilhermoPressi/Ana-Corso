import { BrainCircuit } from "lucide-react"

import { ComingSoon } from "@/components/ComingSoon"

export default function IaEspecialista() {
  return (
    <ComingSoon
      title="IA da Especialista"
      description="Assistente treinada no seu método. Depende da integração com o provedor de IA para ser liberada."
      icon={BrainCircuit}
      eta="Aguardando integração"
      highlights={[
        "Perguntas clínicas com o contexto da paciente carregado",
        "Organização de hipóteses e alternativas de conduta",
        "Resumo de consulta gerado em segundos",
        "Sugestões sempre revisáveis — nunca decisão automática",
      ]}
    />
  )
}
