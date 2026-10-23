export type Permission =
  | "PATIENT_READ"
  | "PATIENT_WRITE"
  | "SCHEDULE_READ"
  | "SCHEDULE_WRITE"
  | "CRM_READ"
  | "CRM_WRITE"
  | "CLINICAL_READ"
  | "CLINICAL_WRITE"
  | "FINANCE_READ"
  | "FINANCE_WRITE"
  | "INVENTORY_READ"
  | "INVENTORY_WRITE"
  | "TEAM_MANAGE"
  | "CLINIC_SETTINGS_MANAGE"

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    "PATIENT_READ",
    "PATIENT_WRITE",
    "SCHEDULE_READ",
    "SCHEDULE_WRITE",
    "CRM_READ",
    "CRM_WRITE",
    "CLINICAL_READ",
    "CLINICAL_WRITE",
    "FINANCE_READ",
    "FINANCE_WRITE",
    "INVENTORY_READ",
    "INVENTORY_WRITE",
    "TEAM_MANAGE",
    "CLINIC_SETTINGS_MANAGE",
  ],
  ADMIN: [
    "PATIENT_READ",
    "PATIENT_WRITE",
    "SCHEDULE_READ",
    "SCHEDULE_WRITE",
    "CRM_READ",
    "CRM_WRITE",
    "CLINICAL_READ",
    "CLINICAL_WRITE",
    "FINANCE_READ",
    "FINANCE_WRITE",
    "INVENTORY_READ",
    "INVENTORY_WRITE",
    "TEAM_MANAGE",
    "CLINIC_SETTINGS_MANAGE",
  ],
  PROFESSIONAL: [
    "PATIENT_READ",
    "PATIENT_WRITE",
    "SCHEDULE_READ",
    "SCHEDULE_WRITE",
    "CRM_READ",
    "CRM_WRITE",
    "CLINICAL_READ",
    "CLINICAL_WRITE",
    "INVENTORY_READ",
  ],
  RECEPTIONIST: [
    "PATIENT_READ",
    "PATIENT_WRITE",
    "SCHEDULE_READ",
    "SCHEDULE_WRITE",
    "CRM_READ",
    "CRM_WRITE",
  ],
  // Atendimento comercial (ex.: produtos digitais): só Conversas e CRM.
  SALES: ["CRM_READ", "CRM_WRITE"],
}

/**
 * Rotas da API liberadas para o perfil Comercial (SALES). Qualquer outra
 * rota autenticada responde 403 para esse perfil.
 */
const SALES_ALLOWED: { prefix: string; methods?: string[] }[] = [
  { prefix: "/api/auth" },
  { prefix: "/api/crm" },
  { prefix: "/api/leads" },
  { prefix: "/api/notifications" },
  { prefix: "/api/team", methods: ["GET"] },
  { prefix: "/api/clinic", methods: ["GET"] },
  { prefix: "/api/patients/options", methods: ["GET"] },
]

export function isRouteAllowedForRole(role: string | undefined, method: string, url: string) {
  if (role !== "SALES") return true
  const path = url.split("?")[0]
  return SALES_ALLOWED.some(
    (rule) =>
      (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) &&
      (!rule.methods || rule.methods.includes(method.toUpperCase())),
  )
}

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes(permission)
}
