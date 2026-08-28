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
 * Converts local date parts in clinic timezone into an exact UTC Date instance.
 */
export function createUtcFromClinicLocal(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0,
  millisecond: number = 0,
  timeZone: string = DEFAULT_CLINIC_TIMEZONE
): Date {
  const targetTz = timeZone || DEFAULT_CLINIC_TIMEZONE
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: targetTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  for (let i = 0; i < 3; i++) {
    const d = new Date(utcMs)
    const parts = formatter.formatToParts(d)
    const p: Record<string, number> = {}
    for (const part of parts) {
      if (part.type !== "literal") {
        p[part.type] = parseInt(part.value, 10)
      }
    }
    if (p.hour === 24) p.hour = 0

    const formattedLocalMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, millisecond)
    const targetLocalMs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
    const diff = targetLocalMs - formattedLocalMs
    if (diff === 0) break
    utcMs += diff
  }

  return new Date(utcMs)
}

/**
 * Returns exact UTC Date range { startDate, endDate } for a given local YYYY-MM-DD in clinic timezone.
 */
export function getClinicDayRange(dateIso: string, timeZone: string = DEFAULT_CLINIC_TIMEZONE): { startDate: Date; endDate: Date } {
  const [yearStr, monthStr, dayStr] = dateIso.split("-")
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)

  const startDate = createUtcFromClinicLocal(year, month, day, 0, 0, 0, 0, timeZone)
  const endDate = createUtcFromClinicLocal(year, month, day, 23, 59, 59, 999, timeZone)

  return { startDate, endDate }
}

/**
 * Returns exact UTC Date range { startDate, endDate } for a given local YYYY-MM in clinic timezone.
 */
export function getClinicMonthRange(monthIso: string, timeZone: string = DEFAULT_CLINIC_TIMEZONE): { startDate: Date; endDate: Date } {
  const [yearStr, monthStr] = monthIso.split("-")
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const startDate = createUtcFromClinicLocal(year, month, 1, 0, 0, 0, 0, timeZone)
  const endDate = createUtcFromClinicLocal(year, month, lastDay, 23, 59, 59, 999, timeZone)

  return { startDate, endDate }
}
