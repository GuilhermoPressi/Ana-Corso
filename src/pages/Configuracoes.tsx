import { Settings } from "lucide-react"

import { ComingSoon } from "@/components/ComingSoon"

export default function Configuracoes() {
  return (
    <ComingSoon
      title="Configurações"
      description="Dados da clínica, equipe, permissões, integrações e preferências do sistema."
      icon={Settings}
      highlights={[
        "Perfil e identidade visual da clínica",
        "Equipe, cargos e permissões",
        "Integrações com WhatsApp e pagamentos",
        "Preferências de notificação",
      ]}
    />
  )
}
