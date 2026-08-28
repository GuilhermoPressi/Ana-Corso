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
}

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes(permission)
}
