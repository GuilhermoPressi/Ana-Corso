import { Suspense, useMemo, useRef, useState } from "react"
import { Canvas, type ThreeEvent } from "@react-three/fiber"
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei"
import * as THREE from "three"

import { ModelBoundary } from "@/components/clinical/ModelBoundary"
import { MODEL_URL, type ModelAvailability } from "@/components/clinical/useModelAvailability"
import {
  createHeadGeometry,
  HEAD_SCALE,
  toBoxDirection,
} from "@/components/clinical/headGeometry"
import { faceRegions, nearestRegion } from "@/data/faceRegions"

/**
 * Ajuste de orientação do modelo importado.
 *
 * Exportadores diferem: alguns entregam o rosto olhando para -Z, outros com Z
 * para cima. Se o rosto aparecer de costas ou deitado, gire aqui — a marcação
 * das regiões acompanha, porque a direção do clique é calculada depois destas
 * transformações.
 */
const MODEL_ROTATION: [number, number, number] = [0, 0, 0]

/** Altura que o modelo deve ocupar na cena, para a câmera não precisar mudar. */
const TARGET_HEIGHT = 2.6

const MARKER_COLOR = "#ec6ba0"
const PENDING_COLOR = "#8b5cf6"
const SKIN_COLOR = "#f6d9e0"

export type Marker3D = {
  id: string
  position: [number, number, number]
  regionName: string
}

export type FaceMap3DProps = {
  markers: Marker3D[]
  /** Ponto clicado que ainda não virou registro. */
  pending: [number, number, number] | null
  selectedRegionId: string | null
  onPick: (input: { regionId: string; position: [number, number, number] }) => void
  /** Disponibilidade do .glb, verificada pela página antes de montar a cena. */
  availability: ModelAvailability
}

/**
 * Girar a cabeça é um arrasto que começa e termina sobre a malha — sem isto,
 * cada rotação marcaria um ponto. Guardamos onde o gesto começou e só tratamos
 * como clique quando o ponteiro praticamente não andou.
 */
const DRAG_THRESHOLD = 5

function usePickHandlers(
  half: { x: number; y: number; z: number },
  onPick: FaceMap3DProps["onPick"],
) {
  const gestureStart = useRef<{ x: number; y: number } | null>(null)

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    // Sem isto o clique atravessa e atinge a face de trás da malha.
    event.stopPropagation()
    gestureStart.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
  }

  function onPointerUp(event: ThreeEvent<PointerEvent>) {
    const start = gestureStart.current
    gestureStart.current = null
    if (!start) return

    const moved = Math.hypot(
      event.nativeEvent.clientX - start.x,
      event.nativeEvent.clientY - start.y,
    )
    if (moved > DRAG_THRESHOLD) return

    event.stopPropagation()

    const region = nearestRegion(event.point, (point) => toBoxDirection(point, half))
    const normal = event.face?.normal ?? new THREE.Vector3(0, 0, 1)
    const offset = normal.clone().multiplyScalar(0.012)

    onPick({
      regionId: region.id,
      position: [event.point.x + offset.x, event.point.y + offset.y, event.point.z + offset.z],
    })
  }

  function cancel() {
    gestureStart.current = null
  }

  return { onPointerDown, onPointerUp, cancel }
}

/* ------------------------------------------------------------------ *
 * Modelo real
 * ------------------------------------------------------------------ */

function GltfHead({ onPick }: { onPick: FaceMap3DProps["onPick"] }) {
  const { scene } = useGLTF(MODEL_URL)

  /*
   * O modelo é medido e reescalado para caber sempre na mesma moldura, seja
   * qual for a unidade em que foi exportado. Assim a câmera, os marcadores e as
   * âncoras das regiões continuam valendo sem ajuste manual.
   */
  const { model, scale, offset, half } = useMemo(() => {
    const clone = scene.clone(true)
    clone.rotation.set(...MODEL_ROTATION)
    clone.updateWorldMatrix(true, true)

    const bounds = new THREE.Box3().setFromObject(clone)
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const fit = TARGET_HEIGHT / (size.y || 1)

    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      object.material = new THREE.MeshPhysicalMaterial({
        color: SKIN_COLOR,
        roughness: 0.68,
        metalness: 0.02,
        clearcoat: 0.12,
        clearcoatRoughness: 0.6,
      })
    })

    return {
      model: clone,
      scale: fit,
      offset: center.multiplyScalar(-fit),
      half: size.multiplyScalar(fit / 2),
    }
  }, [scene])

  const handlers = usePickHandlers(half, onPick)

  return (
    <group
      scale={scale}
      position={[offset.x / scale, offset.y / scale, offset.z / scale]}
      onPointerDown={handlers.onPointerDown}
      onPointerUp={handlers.onPointerUp}
      onPointerOver={() => {
        document.body.style.cursor = "crosshair"
      }}
      onPointerOut={() => {
        handlers.cancel()
        document.body.style.cursor = ""
      }}
    >
      <primitive object={model} />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Volume de reserva, enquanto o .glb não estiver publicado
 * ------------------------------------------------------------------ */

function PlaceholderHead({ onPick }: { onPick: FaceMap3DProps["onPick"] }) {
  const geometry = useMemo(() => createHeadGeometry(), [])
  const handlers = usePickHandlers(HEAD_SCALE, onPick)

  return (
    <mesh
      geometry={geometry}
      onPointerDown={handlers.onPointerDown}
      onPointerUp={handlers.onPointerUp}
      onPointerOver={() => {
        document.body.style.cursor = "crosshair"
      }}
      onPointerOut={() => {
        handlers.cancel()
        document.body.style.cursor = ""
      }}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={SKIN_COLOR} roughness={0.78} metalness={0.02} />
    </mesh>
  )
}

function Marker({
  position,
  color,
  pulse = false,
}: {
  position: [number, number, number]
  color: string
  pulse?: boolean
}) {
  return (
    <group position={position} raycast={() => null}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[0.032, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />
      </mesh>

      {pulse && (
        <mesh raycast={() => null}>
          <sphereGeometry args={[0.06, 20, 20]} />
          <meshBasicMaterial color={color} transparent opacity={0.22} />
        </mesh>
      )}
    </group>
  )
}

export function FaceMap3D({
  markers,
  pending,
  selectedRegionId,
  onPick,
  availability,
}: FaceMap3DProps) {
  /** Ligado quando o arquivo existe mas o loader falhou ao interpretá-lo. */
  const [corrupted, setCorrupted] = useState(false)
  const selected = faceRegions.find((region) => region.id === selectedRegionId)

  const showPlaceholder = corrupted || availability === "missing"

  return (
    <Canvas
      camera={{ position: [0, 0.1, 4.4], fov: 36 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      shadows
      onPointerMissed={() => {
        document.body.style.cursor = ""
      }}
    >
      {/* Luz difusa e frontal, como a de uma sala de procedimento */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.05} castShadow />
      <directionalLight position={[-3, 1.2, 2.5]} intensity={0.4} />
      <directionalLight position={[0, -1.5, 2.5]} intensity={0.22} />
      {/* Contraluz para destacar a silhueta do perfil ao girar */}
      <directionalLight position={[-1.5, 1.5, -3]} intensity={0.5} color="#ffd9e6" />
      {/* Sem <Environment> do drei de propósito: o preset baixa um HDR de CDN
          externo, que falharia no artefato publicado. */}
      <hemisphereLight args={["#ffffff", "#e7c8d2", 0.5]} />

      {availability === "available" && !corrupted ? (
        // O boundary fica como segunda linha de defesa: se o arquivo existir mas
        // estiver corrompido, a cena cai no volume de reserva em vez de sumir.
        <ModelBoundary
          onError={() => setCorrupted(true)}
          fallback={<PlaceholderHead onPick={onPick} />}
        >
          <Suspense fallback={null}>
            <GltfHead onPick={onPick} />
          </Suspense>
        </ModelBoundary>
      ) : (
        showPlaceholder && <PlaceholderHead onPick={onPick} />
      )}

      {/* Guias dos terços faciais — referência de leitura, não clicáveis */}
      {showPlaceholder &&
        [0.42, -0.05, -0.52].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
            <torusGeometry args={[0.79, 0.0035, 8, 96]} />
            <meshBasicMaterial color="#c9899f" transparent opacity={0.28} />
          </mesh>
        ))}

      {selected && (
        <mesh position={selected.anchor3d} raycast={() => null}>
          <sphereGeometry args={[0.09, 24, 24]} />
          <meshBasicMaterial color={MARKER_COLOR} transparent opacity={0.18} />
        </mesh>
      )}

      {markers.map((marker) => (
        <Marker key={marker.id} position={marker.position} color={MARKER_COLOR} />
      ))}

      {pending && <Marker position={pending} color={PENDING_COLOR} pulse />}

      <ContactShadows position={[0, -1.55, 0]} opacity={0.22} scale={5} blur={2.6} far={2} />

      <OrbitControls
        enablePan={false}
        minDistance={2.4}
        maxDistance={5.5}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.85}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}

export default FaceMap3D
