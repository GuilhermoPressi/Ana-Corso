/**
 * Som de "mensagem nova" gerado pelo Web Audio API (sem arquivo de áudio).
 *
 * Navegadores só liberam áudio depois de uma interação do usuário com a página;
 * `unlockNotificationSound` cria/retoma o AudioContext no primeiro clique ou tecla.
 */
let context: AudioContext | null = null

function getContext() {
  if (typeof window === "undefined") return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  context ??= new Ctor()
  return context
}

export function unlockNotificationSound() {
  const unlock = () => {
    getContext()
      ?.resume()
      .catch(() => {})
  }
  window.addEventListener("pointerdown", unlock, { once: true })
  window.addEventListener("keydown", unlock, { once: true })
}

/** Duas notas curtas e suaves (estilo "plim-plim"). */
export function playNotificationSound() {
  const ctx = getContext()
  if (!ctx || ctx.state !== "running") return

  const now = ctx.currentTime
  const notes = [
    { freq: 880, start: 0 },
    { freq: 1318.5, start: 0.13 },
  ]
  for (const note of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = note.freq
    gain.gain.setValueAtTime(0.0001, now + note.start)
    gain.gain.exponentialRampToValueAtTime(0.25, now + note.start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + 0.35)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + note.start)
    osc.stop(now + note.start + 0.4)
  }
}
