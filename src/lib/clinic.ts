/**
 * "Hoje" da clínica na demonstração. Todos os dados mockados giram em torno
 * desta data — centralizar evita que telas mostrem meses diferentes entre si.
 */
import {
  clinicTodayLabel as tzClinicTodayLabel,
  getClinicDateKey,
  getClinicMonthKey,
  getClinicToday,
  isCurrentMonth as tzIsCurrentMonth,
} from "./timezone.js"

export { getClinicDateKey }

export const CLINIC_TODAY = getClinicToday()

export const CLINIC_MONTH = getClinicMonthKey()

/** Verdadeiro quando a data ISO cai no mês corrente da clínica. */
export function isCurrentMonth(isoOrDate: string | Date) {
  return tzIsCurrentMonth(isoOrDate)
}

export function clinicTodayLabel() {
  return tzClinicTodayLabel()
}

/** Soma dias a uma data ISO "AAAA-MM-DD" e devolve outra data ISO. */
export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(year, (month ?? 1) - 1, (day ?? 1) + days)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Todas as datas ISO do mês da data informada, para montar a grade do calendário. */
export function monthMatrix(iso: string) {
  const [year, month] = iso.split("-").map(Number)
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const pad = (value: number) => String(value).padStart(2, "0")

  const days: { iso: string; day: number }[] = []
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ iso: `${year}-${pad(month)}-${pad(day)}`, day })
  }

  return { days, leadingBlanks: first.getDay(), label: first }
}
