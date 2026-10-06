/**
 * Depois de um deploy, uma aba aberta com a versão anterior ainda referencia
 * chunks (com hash) que não existem mais no servidor. Ao navegar para uma tela
 * lazy, o import falha. Nesses casos recarregamos a página uma vez para buscar
 * a versão nova, em vez de mostrar a tela de erro.
 */
const RELOAD_KEY = "ana_corso_stale_build_reload"
const RELOAD_WINDOW_MS = 30_000

export function isStaleBuildError(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .* failed|Unable to preload CSS/i.test(
    message,
  )
}

/** Recarrega uma única vez por janela de tempo, para nunca entrar em loop. Retorna true se recarregou. */
export function reloadForNewBuild() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < RELOAD_WINDOW_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // sem sessionStorage: recarrega mesmo assim
  }
  window.location.reload()
  return true
}

export function installStaleBuildRecovery() {
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadForNewBuild()) event.preventDefault()
  })
}
