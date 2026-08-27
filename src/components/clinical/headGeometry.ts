import * as THREE from "three"

/**
 * Escala dos eixos da cabeça. Exportada porque o cálculo de "qual região foi
 * clicada" precisa desfazer essa deformação antes de comparar direções.
 */
export const HEAD_SCALE = { x: 0.78, y: 1.3, z: 0.86 } as const

/**
 * Volume de referência usado APENAS como reserva.
 *
 * O modelo oficial da cena é o `public/face.glb`. Esta esfera deformada existe
 * para a aba 3D continuar utilizável enquanto o arquivo não estiver publicado —
 * e some assim que ele estiver lá.
 */
export function createHeadGeometry() {
  const geometry = new THREE.SphereGeometry(1, 128, 128)
  const position = geometry.attributes.position as THREE.BufferAttribute
  const vertex = new THREE.Vector3()

  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i)
    const u = vertex.y // -1 (queixo) .. 1 (topo do crânio)

    // Afunila em direção ao queixo e estreita de leve o alto da cabeça.
    let taper = 1
    if (u < 0) taper -= 0.45 * Math.pow(-u, 1.7)
    if (u > 0.55) taper *= 1 - 0.18 * Math.pow((u - 0.55) / 0.45, 2)

    vertex.x *= taper * HEAD_SCALE.x
    vertex.z *= taper * HEAD_SCALE.z
    vertex.y *= HEAD_SCALE.y

    // Nuca achatada.
    if (vertex.z < 0) vertex.z *= 0.93

    // Testa menos esférica que o resto do crânio.
    if (vertex.z > 0 && u > 0.45) vertex.z *= 1 - 0.1 * ((u - 0.45) / 0.55)

    // Projeção do mento.
    if (u < -0.5 && vertex.z > 0) {
      vertex.z += 0.07 * Math.pow((-u - 0.5) / 0.5, 1.5)
    }

    position.setXYZ(i, vertex.x, vertex.y, vertex.z)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Normaliza um ponto da superfície desfazendo a escala dos eixos, para que a
 * comparação com as âncoras das regiões vire uma comparação de direções.
 */
export function toHeadDirection(point: { x: number; y: number; z: number }) {
  const x = point.x / HEAD_SCALE.x
  const y = point.y / HEAD_SCALE.y
  const z = point.z / HEAD_SCALE.z
  const length = Math.hypot(x, y, z) || 1
  return { x: x / length, y: y / length, z: z / length }
}

/**
 * Direção normalizada de um ponto dentro de uma caixa delimitadora centrada na
 * origem. É assim que o clique numa malha GLTF de tamanho arbitrário vira uma
 * direção comparável com as âncoras das regiões.
 */
export function toBoxDirection(
  point: { x: number; y: number; z: number },
  half: { x: number; y: number; z: number },
) {
  const x = point.x / (half.x || 1)
  const y = point.y / (half.y || 1)
  const z = point.z / (half.z || 1)
  const length = Math.hypot(x, y, z) || 1
  return { x: x / length, y: y / length, z: z / length }
}
