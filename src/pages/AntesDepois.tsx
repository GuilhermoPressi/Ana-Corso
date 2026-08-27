import { Images } from "lucide-react"

import { ComingSoon } from "@/components/ComingSoon"

export default function AntesDepois() {
  return (
    <ComingSoon
      title="Antes e Depois"
      description="A galeria comparativa já funciona dentro da ficha de cada paciente. Aqui virá a visão da clínica inteira."
      icon={Images}
      eta="Em breve"
      highlights={[
        "Comparador por ângulo já disponível na aba Antes e depois da ficha",
        "Galeria geral da clínica, filtrando por procedimento e período",
        "Guia de enquadramento para padronizar luz e distância",
        "Exportação com moldura da clínica para redes sociais",
      ]}
    />
  )
}
