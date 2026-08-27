import { useEffect, useState } from "react"

/** Arquivo fornecido pela clínica. Trocar aqui se o nome mudar. */
export const MODEL_URL = "/face.glb"

export type ModelAvailability = "checking" | "available" | "missing"

/**
 * Confere se o arquivo do modelo existe de verdade antes de entregar a URL ao
 * useGLTF.
 *
 * Não dá para confiar só no status HTTP: em dev o Vite responde o index.html
 * para qualquer caminho desconhecido, e o artefato publicado faz o mesmo. O
 * loader do three então tenta interpretar HTML como GLB e estoura fora do ciclo
 * de render — onde nenhum error boundary alcança. Aqui a checagem é explícita:
 * content-type e a assinatura "glTF" dos primeiros bytes.
 */
export function useModelAvailability(url: string, enabled = true): ModelAvailability {
  const [status, setStatus] = useState<ModelAvailability>("checking")

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()

    async function check() {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Range: "bytes=0-3" },
        })

        if (!response.ok) {
          setStatus("missing")
          return
        }

        const contentType = response.headers.get("content-type") ?? ""
        if (contentType.includes("text/html")) {
          setStatus("missing")
          return
        }

        const bytes = new Uint8Array(await response.arrayBuffer())
        const magic = String.fromCharCode(...bytes.slice(0, 4))

        setStatus(magic === "glTF" ? "available" : "missing")
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        setStatus("missing")
      }
    }

    void check()
    return () => controller.abort()
  }, [url, enabled])

  return status
}
