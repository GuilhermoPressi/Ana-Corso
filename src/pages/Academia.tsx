import { GraduationCap } from "lucide-react"

import { ComingSoon } from "@/components/ComingSoon"

export default function Academia() {
  return (
    <ComingSoon
      title="Academia"
      description="Trilhas de formação clínica e de gestão. Depende do upload das aulas gravadas para entrar no ar."
      icon={GraduationCap}
      eta="Aguardando conteúdo"
      highlights={[
        "Trilhas por nível e especialidade",
        "Aulas com material de apoio para download",
        "Certificados de conclusão",
        "Progresso individual de cada pessoa da equipe",
      ]}
    />
  )
}
