/** Rótulos dos perfis de acesso da equipe. */
export const ROLE_LABEL: Record<string, string> = {
  OWNER: "Dona da clínica",
  ADMIN: "Administrador",
  PROFESSIONAL: "Profissional",
  RECEPTIONIST: "Recepção",
  SALES: "Comercial (infoprodutos)",
}

/** Telas liberadas para o perfil Comercial (atendimento de vendas). */
const SALES_PATHS = ["/conversas", "/crm"]

export function isRestrictedRole(role: string | null | undefined) {
  return role === "SALES"
}

export function canAccessPath(role: string | null | undefined, pathname: string) {
  if (!isRestrictedRole(role)) return true
  return SALES_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Tela inicial de cada perfil. */
export function homePathFor(role: string | null | undefined) {
  return isRestrictedRole(role) ? "/conversas" : "/"
}

/** Nomes das telas para o perfil Comercial, que atende só infoprodutos. */
const SALES_TITLES: Record<string, { title: string; short: string }> = {
  "/crm": { title: "CRM de Infoprodutos", short: "CRM Infoprodutos" },
}

export function navLabelFor<T extends { url: string; title: string; short?: string }>(
  role: string | null | undefined,
  item: T,
): T {
  const override = isRestrictedRole(role) ? SALES_TITLES[item.url] : undefined
  return override ? { ...item, ...override } : item
}
