import type { PhotoAngle } from "@/data/patients"
import { cn } from "@/lib/utils"

/**
 * Silhueta usada como marca-d'água nos espaços de foto. Não representa a
 * paciente — serve para dar noção do enquadramento esperado em cada ângulo.
 */
export function FaceGhost({ angle, className }: { angle: PhotoAngle; className?: string }) {
  const isProfile = angle === "perfil-direito" || angle === "perfil-esquerdo"
  const mirrored = angle === "perfil-esquerdo" || angle === "obliquo-esquerdo"
  const oblique = angle === "obliquo-direito" || angle === "obliquo-esquerdo"

  return (
    <svg
      viewBox="0 0 160 210"
      className={cn("h-full w-full", className)}
      fill="none"
      aria-hidden="true"
      style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
    >
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={oblique ? { transform: "skewX(-6deg)", transformOrigin: "center" } : undefined}
      >
        {isProfile ? (
          <>
            {/* Perfil */}
            <path d="M96 26c-18 0-32 15-33 34-1 12-4 20-9 27-3 4-2 7 2 8l7 2c1 8 1 14 3 18 4 8 13 12 23 12 6 0 11-1 15-3" />
            <path d="M63 97c3 2 7 2 10 0" />
            <path d="M56 60c4-3 9-3 12 0" />
            <path d="M66 121c5 3 12 3 17 0" />
            <path d="M107 60c9 4 15 14 15 26 0 20-9 34-24 42" />
            <path d="M98 152v10c0 14 14 22 34 26" />
            <path d="M64 152v12c-14 5-26 12-30 24" />
          </>
        ) : (
          <>
            {/* Frontal */}
            <path d="M80 24c-24 0-40 17-40 44 0 10 1 19 4 27 4 12 12 22 22 28 5 3 9 4 14 4s9-1 14-4c10-6 18-16 22-28 3-8 4-17 4-27 0-27-16-44-40-44Z" />
            <path d="M55 68c6-4 14-4 19 1" />
            <path d="M86 69c5-5 13-5 19-1" />
            <ellipse cx="63" cy="82" rx="7" ry="4" />
            <ellipse cx="97" cy="82" rx="7" ry="4" />
            <path d="M80 78v22c0 4-3 6-7 7" />
            <path d="M68 121c4-3 8-4 12-4s8 1 12 4c-3 6-7 9-12 9s-9-3-12-9Z" />
            <path d="M62 155c-16 6-28 14-34 26" />
            <path d="M98 155c16 6 28 14 34 26" />
          </>
        )}
      </g>
    </svg>
  )
}
