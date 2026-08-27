/**
 * Regiões do mapa facial.
 *
 * Coordenadas 2D em um viewBox 200x260, vista frontal. Como em foto clínica, o
 * lado esquerdo da imagem é o lado DIREITO da paciente — os rótulos seguem a
 * paciente, não quem olha.
 */
export type FaceRegion = {
  id: string
  name: string
  /** Grupo usado para filtrar por tipo de procedimento. */
  groups: string[]
  cx: number
  cy: number
  rx: number
  ry: number
  rotate?: number
  /**
   * Âncora da região no espaço da cabeça 3D (x para a direita de quem olha,
   * y para cima, z para a frente). Usada para descobrir qual região o clique
   * na malha atingiu.
   */
  anchor3d: [number, number, number]
}

export const faceRegions: FaceRegion[] = [
  {
    id: "frontal",
    name: "Frontal",
    groups: ["Toxina botulínica"],
    cx: 100,
    cy: 62,
    rx: 33,
    ry: 15,
    anchor3d: [0, 0.72, 0.68],
  },
  {
    id: "glabela",
    name: "Glabela",
    groups: ["Toxina botulínica"],
    cx: 100,
    cy: 84,
    rx: 9,
    ry: 8,
    anchor3d: [0, 0.42, 0.8],
  },
  {
    id: "temporal-d",
    name: "Temporal direita",
    groups: ["Preenchimento", "Bioestimulador"],
    cx: 58,
    cy: 78,
    rx: 11,
    ry: 14,
    anchor3d: [-0.6, 0.55, 0.4],
  },
  {
    id: "temporal-e",
    name: "Temporal esquerda",
    groups: ["Preenchimento", "Bioestimulador"],
    cx: 142,
    cy: 78,
    rx: 11,
    ry: 14,
    anchor3d: [0.6, 0.55, 0.4],
  },
  {
    id: "periorbital-d",
    name: "Periorbital direita",
    groups: ["Toxina botulínica"],
    cx: 72,
    cy: 97,
    rx: 13,
    ry: 9,
    anchor3d: [-0.36, 0.32, 0.7],
  },
  {
    id: "periorbital-e",
    name: "Periorbital esquerda",
    groups: ["Toxina botulínica"],
    cx: 128,
    cy: 97,
    rx: 13,
    ry: 9,
    anchor3d: [0.36, 0.32, 0.7],
  },
  {
    id: "nasal",
    name: "Dorso nasal",
    groups: ["Toxina botulínica", "Preenchimento"],
    cx: 100,
    cy: 104,
    rx: 7,
    ry: 11,
    anchor3d: [0, 0.18, 0.9],
  },
  {
    id: "malar-d",
    name: "Malar direita",
    groups: ["Preenchimento", "Bioestimulador"],
    cx: 71,
    cy: 120,
    rx: 16,
    ry: 12,
    anchor3d: [-0.46, 0.04, 0.66],
  },
  {
    id: "malar-e",
    name: "Malar esquerda",
    groups: ["Preenchimento", "Bioestimulador"],
    cx: 129,
    cy: 120,
    rx: 16,
    ry: 12,
    anchor3d: [0.46, 0.04, 0.66],
  },
  {
    id: "masseter-d",
    name: "Masseter direito",
    groups: ["Toxina botulínica"],
    cx: 61,
    cy: 148,
    rx: 11,
    ry: 17,
    anchor3d: [-0.58, -0.26, 0.42],
  },
  {
    id: "masseter-e",
    name: "Masseter esquerdo",
    groups: ["Toxina botulínica"],
    cx: 139,
    cy: 148,
    rx: 11,
    ry: 17,
    anchor3d: [0.58, -0.26, 0.42],
  },
  {
    id: "nasogeniano-d",
    name: "Sulco nasogeniano direito",
    groups: ["Preenchimento"],
    cx: 85,
    cy: 141,
    rx: 7,
    ry: 13,
    rotate: 12,
    anchor3d: [-0.22, -0.18, 0.82],
  },
  {
    id: "nasogeniano-e",
    name: "Sulco nasogeniano esquerdo",
    groups: ["Preenchimento"],
    cx: 115,
    cy: 141,
    rx: 7,
    ry: 13,
    rotate: -12,
    anchor3d: [0.22, -0.18, 0.82],
  },
  {
    id: "labio-superior",
    name: "Lábio superior",
    groups: ["Preenchimento", "Toxina botulínica"],
    cx: 100,
    cy: 145,
    rx: 15,
    ry: 6,
    anchor3d: [0, -0.3, 0.84],
  },
  {
    id: "labio-inferior",
    name: "Lábio inferior",
    groups: ["Preenchimento"],
    cx: 100,
    cy: 159,
    rx: 15,
    ry: 7,
    anchor3d: [0, -0.47, 0.8],
  },
  {
    id: "mandibula-d",
    name: "Mandíbula direita",
    groups: ["Preenchimento", "Bioestimulador"],
    cx: 73,
    cy: 172,
    rx: 16,
    ry: 9,
    rotate: 18,
    anchor3d: [-0.44, -0.62, 0.52],
  },
  {
    id: "mandibula-e",
    name: "Mandíbula esquerda",
    groups: ["Preenchimento", "Bioestimulador"],
    cx: 127,
    cy: 172,
    rx: 16,
    ry: 9,
    rotate: -18,
    anchor3d: [0.44, -0.62, 0.52],
  },
  {
    id: "mento",
    name: "Mento",
    groups: ["Preenchimento", "Toxina botulínica"],
    cx: 100,
    cy: 182,
    rx: 14,
    ry: 12,
    anchor3d: [0, -0.84, 0.66],
  },
]

/**
 * Região cuja âncora está mais próxima do ponto clicado na malha 3D.
 *
 * Compara direções em vez de posições: a cabeça é achatada em uns eixos e
 * alongada em outros, então a distância bruta favoreceria as regiões dos eixos
 * mais compridos. Normalizar desfaz esse viés.
 */
export function nearestRegion(
  point: { x: number; y: number; z: number },
  normalize: (p: { x: number; y: number; z: number }) => { x: number; y: number; z: number },
) {
  const target = normalize(point)

  let best = faceRegions[0]
  let bestDistance = Number.POSITIVE_INFINITY

  for (const region of faceRegions) {
    const [ax, ay, az] = region.anchor3d
    const anchor = normalize({ x: ax, y: ay, z: az })
    const distance =
      (target.x - anchor.x) ** 2 + (target.y - anchor.y) ** 2 + (target.z - anchor.z) ** 2

    if (distance < bestDistance) {
      bestDistance = distance
      best = region
    }
  }

  return best
}

export const depthOptions = [
  "Intradérmico",
  "Subcutâneo superficial",
  "Subcutâneo profundo",
  "Supraperiosteal",
  "Intramuscular",
]

export const techniqueOptions = [
  "Puntiforme",
  "Bolus",
  "Retroinjeção linear",
  "Leque",
  "Microbolus",
  "Cross-linking",
]
