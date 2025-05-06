'use client'

import { useDebouncedValue } from '@mantine/hooks'
import { CameraControls as CameraControlsDrei } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import React, { type FC, useEffect, useRef } from 'react'
import { MathUtils } from 'three'

const MIN_POLAR_ANGLE = MathUtils.degToRad(55)
const MAX_POLAR_ANGLE = MathUtils.degToRad(125)

const MIN_AZIMUTH_ANGLE = MathUtils.degToRad(-35)
const MAX_AZIMUTH_ANGLE = MathUtils.degToRad(35)

const CameraControls: FC = () => {
  const size = useThree((s) => s.size)
  const [debouncedSize] = useDebouncedValue(size, 500, { leading: true })
  const cameraControls = useRef<CameraControlsDrei>(null)
  // Rotation values for pointer move
  const targetPolarAngle = useRef({ value: 0 })
  const targetAzimuthAngle = useRef({ value: 0 })

  useEffect(() => {
    if (!cameraControls.current) return
    if (debouncedSize.width < 480) return

    const onPointerMove = (e: PointerEvent) => {
      // Calculate normalized position from center of screen (-1 to 1 range)
      const normalizedY = -(e.clientY - debouncedSize.height / 2) / (debouncedSize.height / 2)
      const normalizedX = -(e.clientX - debouncedSize.width / 2) / (debouncedSize.width / 2)

      // When normalizedY is 0 (center of screen), we want polar angle to be exactly 90 degrees (π/2)
      // Map the normalized range to our polar angle range
      const centerPolarAngle = MathUtils.degToRad(90) // Center value (when pointer is at center height)
      const polarRangeHalf = (MAX_POLAR_ANGLE - MIN_POLAR_ANGLE) / 2
      const newPolarAngle = centerPolarAngle + normalizedY * polarRangeHalf

      // Similar mapping for azimuth angle
      const centerAzimuthAngle = 0 // Center value (when pointer is at center width)
      const azimuthRangeHalf = (MAX_AZIMUTH_ANGLE - MIN_AZIMUTH_ANGLE) / 2
      const newAzimuthAngle = centerAzimuthAngle + normalizedX * azimuthRangeHalf

      targetPolarAngle.current.value = newPolarAngle
      targetAzimuthAngle.current.value = newAzimuthAngle
    }

    window.addEventListener('pointermove', onPointerMove)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [debouncedSize])

  useFrame((_, delta) => {
    if (!cameraControls.current) return
    if (debouncedSize.width < 480) return
    // Move camera to pointer position with lerp for smoothness
    if (cameraControls.current.azimuthAngle !== targetAzimuthAngle.current.value) {
      const newAziumuthAngle = MathUtils.lerp(
        cameraControls.current.azimuthAngle,
        targetAzimuthAngle.current.value,
        delta * 6,
      )
      cameraControls.current.rotateAzimuthTo(newAziumuthAngle, false)
    }

    if (cameraControls.current.polarAngle !== targetPolarAngle.current.value) {
      const newPolarAngle = MathUtils.lerp(cameraControls.current.polarAngle, targetPolarAngle.current.value, delta * 6)
      cameraControls.current.rotatePolarTo(newPolarAngle, false)
    }
  })

  return (
    <CameraControlsDrei
      ref={cameraControls}
      minPolarAngle={MIN_POLAR_ANGLE}
      maxPolarAngle={MAX_POLAR_ANGLE}
      minAzimuthAngle={MIN_AZIMUTH_ANGLE}
      maxAzimuthAngle={MAX_AZIMUTH_ANGLE}
      makeDefault={true}
      mouseButtons={{
        left: 0,
        middle: 0,
        right: 0,
        wheel: 0,
      }}
      touches={{
        one: 0,
        two: 0,
        three: 0,
      }}
    />
  )
}

export default CameraControls
