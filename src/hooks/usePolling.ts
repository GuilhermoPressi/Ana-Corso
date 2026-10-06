import { useEffect, useRef } from "react"

/**
 * Executa `callback` imediatamente e depois a cada `intervalMs`, pausando
 * enquanto a aba do navegador está em segundo plano.
 */
export function usePolling(callback: () => void | Promise<void>, intervalMs: number, deps: unknown[] = []) {
  const saved = useRef(callback)
  saved.current = callback

  useEffect(() => {
    let cancelled = false
    let running = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function tick() {
      if (cancelled || running) return
      running = true
      if (document.visibilityState === "visible") {
        try {
          await saved.current()
        } catch {
          // erros já são tratados por quem chama; o polling segue
        }
      }
      running = false
      if (!cancelled) timer = setTimeout(tick, intervalMs)
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        clearTimeout(timer)
        tick()
      }
    }

    tick()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps])
}
