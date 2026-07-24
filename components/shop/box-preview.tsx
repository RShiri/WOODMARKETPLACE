'use client'

import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { useLocale } from '@/lib/i18n/locale-context'
import type { BaseType } from '@/lib/pricing/engine'

// mm -> Three.js scene units. At this scale a typical 50-1000mm box maps to
// a 0.5-10 unit scene, which frames nicely with Bounds' auto-fit camera.
const SCALE = 1 / 100
const BASE_THICKNESS = 0.15

/** The open-bottom acrylic "hood" — a box with its -Y (bottom) face hidden, matching the real 5-panel case (lib/pricing/engine.ts). */
function HoodMesh({ lengthUnits, widthUnits, heightUnits }: { lengthUnits: number; widthUnits: number; heightUnits: number }) {
  const materials = useMemo(() => {
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#cfe9ff',
      transparent: true,
      opacity: 0.32,
      roughness: 0.08,
      metalness: 0,
      transmission: 0.7,
      thickness: 0.4,
      ior: 1.49,
      side: THREE.DoubleSide,
    })
    const hidden = new THREE.MeshBasicMaterial({ visible: false })
    // BoxGeometry material slot order: [+X, -X, +Y, -Y, +Z, -Z]
    return [glass, glass, glass, hidden, glass, glass]
  }, [])

  return (
    <mesh position={[0, heightUnits / 2, 0]} material={materials}>
      <boxGeometry args={[lengthUnits, heightUnits, widthUnits]} />
    </mesh>
  )
}

function BaseMesh({
  lengthUnits,
  widthUnits,
  baseType,
}: {
  lengthUnits: number
  widthUnits: number
  baseType: BaseType
}) {
  const isDark = baseType === 'acrylic_black' || baseType === 'led'
  return (
    <mesh position={[0, -BASE_THICKNESS / 2, 0]}>
      <boxGeometry args={[lengthUnits, BASE_THICKNESS, widthUnits]} />
      <meshStandardMaterial
        color={isDark ? '#18181a' : '#e2f1ff'}
        roughness={0.35}
        emissive={baseType === 'led' ? '#4fc9ff' : '#000000'}
        emissiveIntensity={baseType === 'led' ? 0.55 : 0}
      />
    </mesh>
  )
}

function Scene({
  lengthUnits,
  widthUnits,
  heightUnits,
  baseType,
}: {
  lengthUnits: number
  widthUnits: number
  heightUnits: number
  baseType: BaseType
}) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />
      <directionalLight position={[-5, 3, -4]} intensity={0.4} />
      {/* Remounting on dimension change is a simple, reliable way to force Bounds to refit the camera. */}
      <Bounds key={`${lengthUnits}-${widthUnits}-${heightUnits}-${baseType}`} fit clip observe margin={1.35}>
        <group>
          <HoodMesh lengthUnits={lengthUnits} widthUnits={widthUnits} heightUnits={heightUnits} />
          {baseType !== 'none' && (
            <BaseMesh lengthUnits={lengthUnits} widthUnits={widthUnits} baseType={baseType} />
          )}
        </group>
      </Bounds>
      <OrbitControls makeDefault enablePan={false} minDistance={1.5} maxDistance={25} />
    </>
  )
}

export function BoxPreview({
  lengthMm,
  widthMm,
  heightMm,
  baseType,
}: {
  lengthMm: number | null
  widthMm: number | null
  heightMm: number | null
  baseType: BaseType
}) {
  const { dict } = useLocale()
  const usingPlaceholder = !lengthMm || !widthMm || !heightMm

  const lengthUnits = (lengthMm ?? 300) * SCALE
  const widthUnits = (widthMm ?? 200) * SCALE
  const heightUnits = (heightMm ?? 250) * SCALE

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-lg border border-border bg-gradient-to-b from-muted/40 to-muted sm:h-80">
      <Canvas camera={{ position: [4, 3, 5], fov: 40 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <Scene lengthUnits={lengthUnits} widthUnits={widthUnits} heightUnits={heightUnits} baseType={baseType} />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between p-2 text-xs text-muted-foreground">
        <span>{usingPlaceholder ? dict.calculator.previewPlaceholderNote : ''}</span>
        <span>{dict.calculator.previewHint}</span>
      </div>
    </div>
  )
}
