export const DEFAULT_CLINIC_TIMEZONE = "America/Sao_Paulo"

/**
 * Returns formatted YYYY-MM-DD for a given Date in the clinic's timezone.
 */
export function getClinicDateKey(date: Date = new Date(), timeZone: string = DEFAULT_CLINIC_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || DEFAULT_CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(date)
}

/**
 * Returns YYYY-MM for a given Date in the clinic's timezone.
 */
export function getClinicMonthKey(date: Date = new Date(), timeZone: string = DEFAULT_CLINIC_TIMEZONE): string {
  return getClinicDateKey(date, timeZone).slice(0, 7)
}

/**
 * Returns today's YYYY-MM-DD in the clinic's timezone.
 */
export function getClinicToday(timeZone: string = DEFAULT_CLINIC_TIMEZONE): string {
  return getClinicDateKey(new Date(), timeZone)
}

/**
 * Checks if a given ISO string or date falls into the current month in the clinic's timezone.
 */
export function isCurrentMonth(isoOrDate: string | Date, timeZone: string = DEFAULT_CLINIC_TIMEZONE): boolean {
  const targetDate = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate
  if (isNaN(targetDate.getTime())) {
    // String was "YYYY-MM-DD" without time component
    if (typeof isoOrDate === "string" && /^\d{4}-\d{2}/.test(isoOrDate)) {
      return isoOrDate.slice(0, 7) === getClinicMonthKey(new Date(), timeZone)
    }
    return false
  }
  return getClinicMonthKey(targetDate, timeZone) === getClinicMonthKey(new Date(), timeZone)
}

export function clinicTodayLabel(timeZone: string = DEFAULT_CLINIC_TIMEZONE): string {
  const now = new Date()
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timeZone || DEFAULT_CLINIC_TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(now)

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
