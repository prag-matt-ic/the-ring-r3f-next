'use client'
import { useGSAP } from '@gsap/react'
import { useVideoTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { colorsFromRange, css } from '@thi.ng/color'
import gsap from 'gsap'
import React, { type FC, Suspense, useMemo, useRef } from 'react'
import {
  array,
  color,
  cos,
  deltaTime,
  float,
  Fn,
  hash,
  If,
  instancedArray,
  instanceIndex,
  mix,
  mod,
  mx_fractal_noise_vec3,
  mx_noise_float,
  PI2,
  positionWorld,
  screenSize,
  screenUV,
  select,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { AdditiveBlending, SRGBColorSpace, Vector2, VideoTexture, WebGPURenderer } from 'three/webgpu'

// Generate color palette
const PALETTE = [
  ...colorsFromRange('cool', {
    base: 'silver',
    num: 40,
    variance: 0.2,
  }),
  ...colorsFromRange('weak', {
    base: 'azure',
    num: 20,
    variance: 0.05,
  }),
]

const COLOUR_COUNT = PALETTE.length
const colors = array(PALETTE.map((c) => color(css(c))))

const PARTICLE_COUNT = Math.pow(320, 2) //
const NUMBER_OF_RING_CLUSTERS = 3
export const RING_RADIUS = 2.0

const seeds = new Float32Array(PARTICLE_COUNT)
for (let i = 0; i < PARTICLE_COUNT; i++) {
  seeds[i] = Math.random()
}

type Props = {
  textPoints: Float32Array | null
}

export const TheRingParticles: FC<Props> = ({ textPoints }) => {
  const renderer = useThree((s) => s.gl) as unknown as WebGPURenderer
  const viewport = useThree((s) => s.viewport)

  const { key, positionNode, colorNode, scaleNode, opacityNode, updateParticles, spawnParticles, uPointer } =
    useMemo(() => {
      if (!textPoints) return {}

      const uPointer = uniform(vec2(0.0)).label('pointer')

      const seedBuffer = instancedArray(seeds, 'float')
      const positionBuffer = instancedArray(PARTICLE_COUNT, 'vec4') // w stores the life
      const velocityBuffer = instancedArray(PARTICLE_COUNT, 'vec4') // w stores if it's a ring, or text particle (object 0 or 1)
      const colorBuffer = instancedArray(PARTICLE_COUNT, 'vec3')
      const textPositionBuffer = instancedArray(textPoints, 'vec3')

      const ringRadius = float(RING_RADIUS)

      const computeInitialPositions = Fn(() => {
        const seed = seedBuffer.element(instanceIndex)
        const initialPos = positionBuffer.element(instanceIndex)
        // Initate some particles offscreen with a random lifetime.
        const initialLife = mix(0.0, 0.16, hash(instanceIndex))
        initialPos.assign(vec4(0.0, 0.0, 50.0, initialLife))

        const initialVel = velocityBuffer.element(instanceIndex)
        const object = select(seed.lessThan(0.75), float(0.0), float(1.0))
        initialVel.assign(vec4(0.0, 0.0, 0.0, object))
      })().compute(PARTICLE_COUNT)

      const computeColours = Fn(() => {
        const seed = seedBuffer.element(instanceIndex)
        const c = colorBuffer.element(instanceIndex)
        const colorIndex = hash(instanceIndex.sub(3)).mul(COLOUR_COUNT).floor()
        const randomColor = colors.element(colorIndex)

        const finalColor = select(hash(seed), randomColor, color('#fff'))
        c.assign(finalColor)
      })().compute(PARTICLE_COUNT)

      renderer.computeAsync([computeColours, computeInitialPositions])

      // @ts-expect-error missing type in TSL
      const positionNode = positionBuffer.toAttribute().xyz

      const colorNode = Fn(() => {
        const c = colorBuffer.element(instanceIndex)
        const centeredUv = uv().distance(vec2(0.5))
        const softCircle = smoothstep(0.25, 0.5, centeredUv).oneMinus()
        return vec4(c, softCircle)
      })()

      const opacityNode = Fn(() => {
        // @ts-expect-error missing type in TSL
        const life = positionBuffer.toAttribute().w
        const posZ = positionWorld.z
        const zFade = smoothstep(0.0, 4.0, posZ).oneMinus()
        return life.mul(zFade)
      })()

      const scaleNode = Fn(() => {
        const baseScale = vec2(mix(0.3, 1.0, hash(instanceIndex.add(4.0))))
        const posZ = positionWorld.z
        const attenuation = smoothstep(-3.0, 6.0, posZ).mul(8.0).oneMinus()
        return baseScale.mul(attenuation)
      })()

      const updateParticles = Fn(() => {
        const seed = seedBuffer.element(instanceIndex)
        const pos = positionBuffer.element(instanceIndex).xyz
        const life = positionBuffer.element(instanceIndex).w
        const vel = velocityBuffer.element(instanceIndex).xyz
        const object = velocityBuffer.element(instanceIndex).w
        const dt = deltaTime.mul(0.08)

        If(life.greaterThan(0.0), () => {
          const noise = mx_fractal_noise_vec3(pos.add(time.mul(0.3)), 4.0, 1.0, 0.4, 0.5).mul(life.add(0.5))

          const isOnText = object.equal(1.0)

          If(isOnText, () => {
            noise.mulAssign(0.05)
          }).Else(() => {
            noise.mulAssign(0.12)
          })

          // Attract towards uPointer
          const attractor = vec3(uPointer.sub(pos.xy), 2.0)
          const attractorIntensity = select(isOnText, 0.008, 0.02)
          vel.addAssign(attractor.mul(attractorIntensity))

          // Update velocity with turbulence.
          vel.addAssign(noise)

          // Update position based on velocity and time.
          pos.addAssign(vel.mul(dt.mul(seed)))
          // Subtract lifetime.
          life.subAssign(dt)
        })
      })().compute(PARTICLE_COUNT)

      // Spawn function: only reset particles that are dead.
      const spawnParticles = Fn(() => {
        const idx = instanceIndex.toVar() //spawnIndex.add(instanceIndex).mod(particleCount).toInt();
        const pos = positionBuffer.element(instanceIndex).xyz

        const life = positionBuffer.element(instanceIndex).w
        const vel = velocityBuffer.element(instanceIndex).xyz
        const object = velocityBuffer.element(instanceIndex).w
        const seed = seedBuffer.element(instanceIndex)
        const s = seed.mul(2.0).sub(1).toVar()

        // Spawn new particle if the current one is dead
        If(life.lessThanEqual(0.0), () => {
          // Assign a random lifetime
          life.assign(mix(0.01, 0.16, hash(idx.add(time))))

          const isOnText = object.equal(1.0)

          If(isOnText, () => {
            // Spawn text particles
            const randomIndex = hash(instanceIndex.add(3))
              .mul(textPoints.length / 3)
              .floor()
            const textPos = textPositionBuffer.element(randomIndex)
            pos.assign(textPos)
            const textVel = vec3(0.0, 0.0, s.mul(4.0))
            vel.assign(textVel)
          }).Else(() => {
            // Spawn on the ring
            const shouldCluster = seed.lessThan(0.4)
            const ringNoise = mx_noise_float(time.mul(0.33))

            If(shouldCluster, () => {
              // Instead of using a fully random angle
              const randomValue = hash(instanceIndex.add(4))

              const clusterIndex = randomValue.mul(NUMBER_OF_RING_CLUSTERS).floor()

              const clusterCenter = clusterIndex.div(NUMBER_OF_RING_CLUSTERS).mul(PI2).sub(randomValue.mul(2.0))

              const angleOffset = mx_noise_float(vec3(s.mul(8.0), time, instanceIndex))

              const angle = clusterCenter.add(angleOffset)

              const newPos = vec3(
                sin(angle.add(ringNoise.mul(0.3)).add(angleOffset.mul(0.1)))
                  .mul(ringRadius)
                  .add(angleOffset.mul(0.1)),
                cos(angle.sub(angleOffset.mul(0.1)))
                  .mul(ringRadius)
                  .add(ringNoise.mul(0.2)),
                0.0,
              )
              pos.assign(newPos)

              // Generate an outward velocity based on the angle
              const newVel = vec3(sin(angle).mul(s.mul(2.0)), cos(angle).mul(seed.mul(2.0)), seed)
              vel.assign(newVel)
            }).Else(() => {
              // Spread around the ring...
              const angle = hash(instanceIndex).mul(PI2)

              const newPos = vec3(
                sin(angle.add(ringNoise.mul(0.3))).mul(ringRadius),
                cos(angle).mul(ringRadius).add(ringNoise.mul(0.2)),
                0.0,
              )
              pos.assign(newPos)

              // Generate an outward velocity based on the angle
              const newVel = vec3(sin(angle).mul(seed.mul(4.0)), cos(angle).mul(s.mul(4.0)), s.mul(16.0))
              vel.assign(newVel)
            })
          })
        })
      })().compute(PARTICLE_COUNT)

      return {
        key: colorNode.uuid,
        positionNode,
        colorNode,
        scaleNode,
        opacityNode,
        updateParticles,
        spawnParticles,
        uPointer,
      }
    }, [renderer, textPoints])

  const pointerWorldPos = useRef(new Vector2(0, 0)).current

  useFrame(({ pointer }) => {
    if (!textPoints) return
    if (!renderer) return
    if (!updateParticles || !spawnParticles) return
    pointerWorldPos.set(pointer.x * viewport.width, pointer.y * viewport.height)
    // @ts-expect-error assigning type
    uPointer.value = pointerWorldPos
    renderer.compute([updateParticles, spawnParticles])
  })

  if (!textPoints) return null

  return (
    <instancedMesh args={[undefined, undefined, PARTICLE_COUNT]} frustumCulled={false}>
      <planeGeometry args={[0.036, 0.036]} />
      <spriteNodeMaterial
        key={key}
        positionNode={positionNode}
        colorNode={colorNode}
        scaleNode={scaleNode}
        opacityNode={opacityNode}
        blending={AdditiveBlending}
        depthWrite={false}
        transparent={true}
      />
    </instancedMesh>
  )
}

type VideoProps = {
  shouldPlay: boolean
}

export const TheRingVideo: FC<VideoProps> = ({ shouldPlay = false }) => {
  const videoTexture = useVideoTexture('/videos/ring-girl.mp4', {
    start: shouldPlay,
    muted: true,
    loop: false,
  })
  videoTexture.colorSpace = SRGBColorSpace
  const planeWidth = 16
  const planeHeight = 9
  // const videoAspect = 9 / 16; // videoTexture.image.width / videoTexture.image.height;

  const { colorNode, opacityNode, uOpacity, uVideoTexture } = useMemo(() => {
    const uVideoTexture = uniform(VideoTexture, typeof VideoTexture)
    const uOpacity = uniform(float(0.0)).label('uOpacity')

    const opacityNode = uOpacity

    const colorNode = Fn(() => {
      const colour = vec4(0.0).toVar()
      // @ts-expect-error use of video texture not TS safe
      const videoColour = texture(uVideoTexture.value).label('videoTexture')

      const aspectUv = uv().toVar()
      const videoAspect = float(16 / 9) // videoTexture.image.width / videoTexture.image.height;
      aspectUv.x.mulAssign(videoAspect)

      const distanceToCenter = aspectUv.distance(vec2(float(0.5).mul(videoAspect), 0.5))
      const smoothCircle = smoothstep(0.2, 0.5, distanceToCenter)
      colour.assign(mix(videoColour, vec4(0.0), smoothCircle))
      colour.a.mulAssign(0.2)

      return colour
    })()

    return { colorNode, opacityNode, uOpacity, uVideoTexture }
  }, [])

  useGSAP(
    () => {
      if (!uOpacity) return
      gsap.to(uOpacity, {
        value: shouldPlay ? 1.0 : 0.0,
        duration: 1.0,
      })
    },
    { dependencies: [shouldPlay, uOpacity] },
  )

  useFrame(() => {
    if (!texture || !uVideoTexture) return
    videoTexture.update()
    // @ts-expect-error new ting
    uVideoTexture.value = videoTexture
  })

  return (
    <Suspense fallback={null}>
      <mesh position={[0, 0, -3]} scale={0.8}>
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshBasicNodeMaterial colorNode={colorNode} opacityNode={opacityNode} depthTest={false} transparent={true} />
      </mesh>
    </Suspense>
  )
}

export const backgroundNode = Fn(() => {
  // vertical gradient
  const baseColour = mix(color('#000'), color('#0C0D0D'), smoothstep(0.0, 1.0, screenUV.y)).toVar()

  // Noisy lines
  const specklyNoise = mx_noise_float(vec3(screenUV.x.mul(400), screenUV.y.mul(360), 1.0))
  const noiseStep = mod(time, 0.3).mul(0.5)
  const noiseLines = mx_noise_float(
    vec3(
      screenUV.x.mul(5.0).add(specklyNoise).add(time),
      screenUV.y.mul(40.0).add(specklyNoise).sub(noiseStep),
      time.mul(0.2),
    ),
  ).pow(6.0)
  const noiseColor = color('#677278')
  const finalColor = mix(baseColour, noiseColor, noiseLines)

  // Circular vignette
  const screenAspect = screenSize.x.div(screenSize.y)
  const aspectUv = screenUV.toVar()
  aspectUv.x.mulAssign(screenAspect)
  const distanceToCenter = aspectUv.distance(vec2(float(0.5).mul(screenAspect), 0.5))
  const smoothCircle = smoothstep(0.3, 0.7, distanceToCenter)
  const c = mix(finalColor, color('#000'), smoothCircle)
  return c
})()
