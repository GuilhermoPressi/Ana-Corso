import {
  createUtcFromClinicLocal,
  getClinicDateKey,
  getClinicDayRange,
  getClinicMonthKey,
  getClinicMonthRange,
} from "../utils/timezone.js"

export function runTimezoneTestSuite() {
  const tz = "America/Sao_Paulo"
  console.log("=== EXECUTANDO TESTES OBRIGATÓRIOS DE TIMEZONE ===")

  // Test 1: 31/08 às 23:30 na clínica (America/Sao_Paulo)
  // Em UTC: 2026-09-01 02:30:00Z
  const aug31_2330_utc = createUtcFromClinicLocal(2026, 8, 31, 23, 30, 0, 0, tz)
  const aug31DateKey = getClinicDateKey(aug31_2330_utc, tz)
  const aug31MonthKey = getClinicMonthKey(aug31_2330_utc, tz)

  if (aug31DateKey !== "2026-08-31" || aug31MonthKey !== "2026-08") {
    throw new Error(`FAIL: 31/08 23:30 local falhou. Esperado 2026-08-31 / 2026-08, obtido: ${aug31DateKey} / ${aug31MonthKey}`)
  }
  console.log("✅ PASS: 31/08 23:30 local -> Reconhecido estritamente como AGOSTO (2026-08)")

  // Test 2: 01/09 às 00:30 na clínica (America/Sao_Paulo)
  // Em UTC: 2026-09-01 03:30:00Z
  const sep01_0030_utc = createUtcFromClinicLocal(2026, 9, 1, 0, 30, 0, 0, tz)
  const sep01DateKey = getClinicDateKey(sep01_0030_utc, tz)
  const sep01MonthKey = getClinicMonthKey(sep01_0030_utc, tz)

  if (sep01DateKey !== "2026-09-01" || sep01MonthKey !== "2026-09") {
    throw new Error(`FAIL: 01/09 00:30 local falhou. Esperado 2026-09-01 / 2026-09, obtido: ${sep01DateKey} / ${sep01MonthKey}`)
  }
  console.log("✅ PASS: 01/09 00:30 local -> Reconhecido estritamente como SETEMBRO (2026-09)")

  // Test 3: Horários de limite extrema: 00:01 e 23:59
  const min0001 = createUtcFromClinicLocal(2026, 8, 15, 0, 1, 0, 0, tz)
  const max2359 = createUtcFromClinicLocal(2026, 8, 15, 23, 59, 59, 999, tz)

  if (getClinicDateKey(min0001, tz) !== "2026-08-15" || getClinicDateKey(max2359, tz) !== "2026-08-15") {
    throw new Error("FAIL: Limites extremos 00:01 ou 23:59 falharam.")
  }
  console.log("✅ PASS: Limites diários extremos (00:01 e 23:59) validados com sucesso")

  // Test 4: Faixa UTC do mês de Agosto (getClinicMonthRange)
  const { startDate: augStart, endDate: augEnd } = getClinicMonthRange("2026-08", tz)
  console.log(`August Month Range UTC: ${augStart.toISOString()} -> ${augEnd.toISOString()}`)

  // O timestamp 31/08 23:30 local DEVE estar DENTRO do augStart -> augEnd
  if (aug31_2330_utc < augStart || aug31_2330_utc > augEnd) {
    throw new Error("FAIL: 31/08 23:30 local ficou fora do intervalo UTC de Agosto!")
  }
  console.log("✅ PASS: 31/08 23:30 local está dentro da busca relacional do mês de Agosto no PostgreSQL")

  // O timestamp 01/09 00:30 local DEVE estar FORA do augStart -> augEnd
  if (sep01_0030_utc <= augEnd) {
    throw new Error("FAIL: 01/09 00:30 local vazou para o intervalo UTC de Agosto!")
  }
  console.log("✅ PASS: 01/09 00:30 local está fora do mês de Agosto e será contado no mês de Setembro")

  console.log("=== TODOS OS TESTES DE TIMEZONE PASSARAM COM SUCESSO ===")
}

// Executar se for chamado diretamente via tsx
if (process.argv[1]?.includes("timezone.test")) {
  runTimezoneTestSuite()
}
