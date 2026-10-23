import { useEffect, useRef, useState } from "react"
import { Loader2, Mic, Send, Square, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

const MAX_SECONDS = 5 * 60

/** Formato suportado pelo navegador (a Evolution converte para áudio de voz do WhatsApp). */
function pickMimeType() {
  const candidates = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  if (typeof MediaRecorder === "undefined") return null
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
}

function extensionFor(mime: string) {
  if (mime.includes("ogg")) return "ogg"
  if (mime.includes("mp4")) return "m4a"
  return "webm"
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/**
 * Botão de microfone do composer: grava, mostra o tempo e permite descartar
 * ou enviar como mensagem de voz.
 */
export function AudioRecorder({
  disabled,
  onSend,
  onRecordingChange,
}: {
  disabled?: boolean
  onSend: (file: File) => Promise<void>
  onRecordingChange?: (recording: boolean) => void
}) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [sending, setSending] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sendOnStopRef = useRef(false)

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
    setRecording(false)
    onRecordingChange?.(false)
  }

  useEffect(() => () => cleanup(), []) // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    const mimeType = pickMimeType()
    if (mimeType === null || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Este navegador não permite gravar áudio.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      sendOnStopRef.current = false
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        const type = recorder.mimeType || mimeType || "audio/webm"
        const blob = new Blob(chunksRef.current, { type })
        const shouldSend = sendOnStopRef.current
        cleanup()
        if (!shouldSend || blob.size === 0) return
        setSending(true)
        try {
          const baseType = type.split(";")[0]
          await onSend(new File([blob], `audio-${Date.now()}.${extensionFor(baseType)}`, { type: baseType }))
        } finally {
          setSending(false)
        }
      }
      recorder.start(250)
      recorderRef.current = recorder
      setSeconds(0)
      setRecording(true)
      onRecordingChange?.(true)
      timerRef.current = setInterval(() => {
        setSeconds((current) => {
          if (current + 1 >= MAX_SECONDS) {
            sendOnStopRef.current = true
            recorderRef.current?.stop()
          }
          return current + 1
        })
      }, 1000)
    } catch (err) {
      cleanup()
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError")
      toast.error(
        denied
          ? "Permita o uso do microfone no navegador (ícone de cadeado ao lado do endereço) para gravar."
          : "Não foi possível acessar o microfone.",
      )
    }
  }

  function stop(send: boolean) {
    sendOnStopRef.current = send
    recorderRef.current?.stop()
  }

  if (sending) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="Enviando áudio">
        <Loader2 className="animate-spin" />
      </Button>
    )
  }

  if (!recording) {
    return (
      <Button variant="ghost" size="icon" onClick={start} disabled={disabled} aria-label="Gravar áudio" title="Gravar áudio">
        <Mic />
      </Button>
    )
  }

  return (
    <div className="flex flex-1 items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1">
      <Button variant="ghost" size="icon" className="size-8" onClick={() => stop(false)} aria-label="Descartar áudio">
        <Trash2 className="size-4" />
      </Button>
      <span className="flex items-center gap-2 text-[13px] font-medium tabular-nums text-destructive">
        <span className="size-2 animate-pulse rounded-full bg-destructive" />
        Gravando {formatTime(seconds)}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => stop(true)} aria-label="Parar e enviar">
          <Square className="size-3.5 fill-current" />
        </Button>
        <Button size="icon" className="size-8" onClick={() => stop(true)} aria-label="Enviar áudio">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}
