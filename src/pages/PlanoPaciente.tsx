import { FileHeart } from "lucide-react"

import { ComingSoon } from "@/components/ComingSoon"

export default function PlanoPaciente() {
  return (
    <ComingSoon
      title="Gerador de Plano para a Paciente"
      description="O gerador de proposta já vive dentro do Planejamento Facial — o botão Gerar proposta monta o documento."
      icon={FileHeart}
      eta="Em breve"
      highlights={[
        "Proposta premium já disponível no Planejamento Facial",
        "Histórico de propostas enviadas por paciente",
        "Acompanhamento de quem abriu e quem respondeu",
        "Assinatura digital de aceite do plano",
      ]}
    />
  )
}
