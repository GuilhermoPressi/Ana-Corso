import { faceRegions } from "@/data/faceRegions"
import { cn } from "@/lib/utils"

export type FaceMapProps = {
  selectedId: string | null
  onSelect: (regionId: string) => void
  /** Quantos pontos já foram registrados em cada região. */
  countByRegion: Record<string, number>
  /** Regiões destacadas conforme o procedimento escolhido. */
  highlightGroup?: string
}

export function FaceMap({ selectedId, onSelect, countByRegion, highlightGroup }: FaceMapProps) {
  return (
    <svg viewBox="0 0 200 260" className="h-full w-full" role="img" aria-label="Mapa facial">
      <title>Mapa facial para marcação dos pontos de aplicação</title>

      {/* Contorno anatômico de referência */}
      <g
        stroke="var(--border)"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M100 22c-30 0-49 21-49 54 0 13 2 24 5 34 5 15 15 28 27 35 6 4 11 5 17 5s11-1 17-5c12-7 22-20 27-35 3-10 5-21 5-34 0-33-19-54-49-54Z" />
        <path d="M62 88c7-5 17-5 23 1" />
        <path d="M115 89c6-6 16-6 23-1" />
        <ellipse cx="73" cy="97" rx="9" ry="5" />
        <ellipse cx="127" cy="97" rx="9" ry="5" />
        <path d="M100 92v20c0 4-3 7-8 8" />
        <path d="M86 148c4-3 9-5 14-5s10 2 14 5c-4 6-9 9-14 9s-10-3-14-9Z" />
        <path d="M78 205c-18 7-31 16-37 30" />
        <path d="M122 205c18 7 31 16 37 30" />
      </g>

      {/* Regiões clicáveis */}
      {faceRegions.map((region) => {
        const count = countByRegion[region.id] ?? 0
        const selected = region.id === selectedId
        const dimmed = highlightGroup ? !region.groups.includes(highlightGroup) : false

        return (
          <g
            key={region.id}
            transform={region.rotate ? `rotate(${region.rotate} ${region.cx} ${region.cy})` : undefined}
          >
            <ellipse
              cx={region.cx}
              cy={region.cy}
              rx={region.rx}
              ry={region.ry}
              onClick={() => onSelect(region.id)}
              className={cn(
                "cursor-pointer transition-all",
                selected
                  ? "fill-primary/25 stroke-primary"
                  : count > 0
                    ? "fill-primary/12 stroke-primary/45"
                    : "fill-transparent stroke-border hover:fill-primary/[0.07] hover:stroke-primary/35",
                dimmed && !selected && count === 0 && "opacity-25",
              )}
              strokeWidth={selected ? 1.8 : 1.2}
              strokeDasharray={count > 0 || selected ? undefined : "3 3"}
            >
              <title>{region.name}</title>
            </ellipse>

            {count > 0 && (
              <g pointerEvents="none">
                <circle cx={region.cx} cy={region.cy} r="7.5" className="fill-primary" />
                <text
                  x={region.cx}
                  y={region.cy + 3}
                  textAnchor="middle"
                  className="fill-primary-foreground"
                  style={{ fontSize: "9px", fontWeight: 600 }}
                >
                  {count}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
