import { useEffect, useRef, useState } from 'react'

interface FireworksOverlayProps {
  durationMs?: number
}

interface Point {
  x: number
  y: number
}

type BurstStyle = 'peony' | 'ring' | 'willow'

interface Rocket {
  x: number
  y: number
  targetX: number
  targetY: number
  angle: number
  speed: number
  acceleration: number
  hue: number
  brightness: number
  trail: Point[]
  burstStyle: BurstStyle
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  drag: number
  alpha: number
  decay: number
  size: number
  hue: number
  brightness: number
  flicker: number
  trail: Point[]
}

interface Viewport {
  width: number
  height: number
}

const TAU = Math.PI * 2
const ROCKET_TRAIL_LENGTH = 7
const PARTICLE_TRAIL_LENGTH = 5

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function pushTrailPoint(trail: Point[], x: number, y: number, limit: number) {
  trail.unshift({ x, y })
  if (trail.length > limit) {
    trail.pop()
  }
}

function chooseBurstStyle(): BurstStyle {
  const roll = Math.random()
  if (roll < 0.22) {
    return 'ring'
  }
  if (roll < 0.42) {
    return 'willow'
  }
  return 'peony'
}

function createRocket(viewport: Viewport): Rocket {
  const startX = randomBetween(viewport.width * 0.16, viewport.width * 0.84)
  const startY = viewport.height + randomBetween(36, 120)

  let targetX = 0
  let targetY = 0
  let attempts = 0

  do {
    targetX = randomBetween(viewport.width * 0.08, viewport.width * 0.92)
    targetY = randomBetween(viewport.height * 0.08, viewport.height * 0.52)
    attempts += 1
  } while (
    attempts < 6 &&
    targetX > viewport.width * 0.28 &&
    targetX < viewport.width * 0.72 &&
    targetY > viewport.height * 0.2 &&
    targetY < viewport.height * 0.72
  )

  const angle = Math.atan2(targetY - startY, targetX - startX)

  return {
    x: startX,
    y: startY,
    targetX,
    targetY,
    angle,
    speed: randomBetween(8.8, 11.6),
    acceleration: randomBetween(1.016, 1.028),
    hue: randomBetween(0, 360),
    brightness: randomBetween(62, 74),
    trail: [],
    burstStyle: chooseBurstStyle(),
  }
}

function createParticles(
  rocket: Rocket,
  reducedMotion: boolean,
  densityScale: number,
): Particle[] {
  const baseCount =
    rocket.burstStyle === 'willow' ? 28 : rocket.burstStyle === 'ring' ? 38 : 46
  const particleCount = Math.max(
    reducedMotion ? 16 : 24,
    Math.round(baseCount * densityScale * (reducedMotion ? 0.6 : 1)),
  )
  const particles: Particle[] = []

  for (let index = 0; index < particleCount; index += 1) {
    const angle =
      rocket.burstStyle === 'ring'
        ? (TAU * index) / particleCount + randomBetween(-0.08, 0.08)
        : randomBetween(0, TAU)

    const speed =
      rocket.burstStyle === 'willow'
        ? randomBetween(1.5, 3.2)
        : rocket.burstStyle === 'ring'
          ? randomBetween(3.6, 5.1)
          : randomBetween(2.3, 5.4)

    const hue =
      rocket.burstStyle === 'willow'
        ? randomBetween(36, 54)
        : (rocket.hue + randomBetween(-18, 18) + 360) % 360

    particles.push({
      x: rocket.x,
      y: rocket.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity:
        rocket.burstStyle === 'willow' ? randomBetween(0.055, 0.085) : randomBetween(0.03, 0.055),
      drag:
        rocket.burstStyle === 'willow' ? randomBetween(0.976, 0.986) : randomBetween(0.956, 0.975),
      alpha: 1,
      decay:
        rocket.burstStyle === 'willow' ? randomBetween(0.008, 0.014) : randomBetween(0.012, 0.019),
      size:
        rocket.burstStyle === 'willow' ? randomBetween(1.9, 3.3) : randomBetween(1.4, 2.8),
      hue,
      brightness:
        rocket.burstStyle === 'willow' ? randomBetween(66, 78) : randomBetween(56, 72),
      flicker: randomBetween(0.8, 1.7),
      trail: [],
    })
  }

  const coreCount = reducedMotion ? 3 : 6
  for (let index = 0; index < coreCount; index += 1) {
    const angle = randomBetween(0, TAU)
    const speed = randomBetween(1.2, 2.8)
    particles.push({
      x: rocket.x,
      y: rocket.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: randomBetween(0.024, 0.04),
      drag: randomBetween(0.95, 0.968),
      alpha: 0.95,
      decay: randomBetween(0.02, 0.03),
      size: randomBetween(1.1, 1.8),
      hue: rocket.hue,
      brightness: 92,
      flicker: randomBetween(1.2, 2.2),
      trail: [],
    })
  }

  return particles
}

export function FireworksOverlay({ durationMs = 2600 }: FireworksOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    let context: CanvasRenderingContext2D | null = null
    try {
      context = canvas.getContext('2d')
    } catch {
      setVisible(false)
      return
    }

    if (!context) {
      setVisible(false)
      return
    }

    const context2d = context

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const totalDuration = reducedMotion ? Math.min(durationMs, 1700) : durationMs
    const densityScale = clamp((window.innerWidth * window.innerHeight) / (390 * 844), 0.78, 1.16)
    const viewport: Viewport = { width: 0, height: 0 }
    const rockets: Rocket[] = []
    const particles: Particle[] = []

    let animationFrameId = 0
    let disposed = false
    let startedAt = 0
    let lastTimestamp = 0
    let nextLaunchAt = 0

    const resizeCanvas = () => {
      viewport.width = window.innerWidth
      viewport.height = window.innerHeight

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio))
      canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio))
      context2d.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const launchRocket = () => {
      rockets.push(createRocket(viewport))
    }

    const launchBurstIfDue = (timestamp: number, elapsed: number) => {
      const spawnWindow = totalDuration * 0.72
      if (elapsed > spawnWindow) {
        return
      }

      while (timestamp >= nextLaunchAt) {
        launchRocket()
        if (!reducedMotion && Math.random() < 0.22) {
          launchRocket()
        }
        nextLaunchAt += randomBetween(reducedMotion ? 280 : 150, reducedMotion ? 430 : 260)
      }
    }

    const explodeRocket = (rocket: Rocket) => {
      particles.push(...createParticles(rocket, reducedMotion, densityScale))
    }

    const drawTrail = (
      trail: Point[],
      x: number,
      y: number,
      color: string,
      lineWidth: number,
    ) => {
      if (trail.length === 0) {
        return
      }

      const oldestPoint = trail[trail.length - 1]
      context2d.beginPath()
      context2d.moveTo(oldestPoint.x, oldestPoint.y)
      for (let index = trail.length - 2; index >= 0; index -= 1) {
        context2d.lineTo(trail[index].x, trail[index].y)
      }
      context2d.lineTo(x, y)
      context2d.strokeStyle = color
      context2d.lineWidth = lineWidth
      context2d.stroke()
    }

    const frame = (timestamp: number) => {
      if (disposed) {
        return
      }

      if (startedAt === 0) {
        startedAt = timestamp
        lastTimestamp = timestamp
        nextLaunchAt = timestamp + 40
        launchRocket()
        if (!reducedMotion) {
          launchRocket()
        }
      }

      const delta = clamp((timestamp - lastTimestamp) / 16.667, 0.6, 2.4)
      const elapsed = timestamp - startedAt
      const fadeStart = totalDuration * 0.7
      const opacity = elapsed <= fadeStart ? 1 : 1 - clamp((elapsed - fadeStart) / (totalDuration - fadeStart), 0, 1)
      lastTimestamp = timestamp

      launchBurstIfDue(timestamp, elapsed)

      context2d.clearRect(0, 0, viewport.width, viewport.height)
      context2d.save()
      context2d.globalCompositeOperation = 'lighter'
      context2d.lineCap = 'round'
      context2d.lineJoin = 'round'

      for (let index = rockets.length - 1; index >= 0; index -= 1) {
        const rocket = rockets[index]
        pushTrailPoint(rocket.trail, rocket.x, rocket.y, ROCKET_TRAIL_LENGTH)
        rocket.speed *= Math.pow(rocket.acceleration, delta)

        const remainingX = rocket.targetX - rocket.x
        const remainingY = rocket.targetY - rocket.y
        const remainingDistance = Math.hypot(remainingX, remainingY)

        if (remainingDistance <= rocket.speed * delta) {
          rocket.x = rocket.targetX
          rocket.y = rocket.targetY
          explodeRocket(rocket)
          rockets.splice(index, 1)
          continue
        }

        rocket.x += Math.cos(rocket.angle) * rocket.speed * delta
        rocket.y += Math.sin(rocket.angle) * rocket.speed * delta

        const trailColor = `hsla(${rocket.hue}, 100%, ${rocket.brightness}%, ${0.35 * opacity})`
        drawTrail(rocket.trail, rocket.x, rocket.y, trailColor, 2.2)

        context2d.shadowBlur = 16
        context2d.shadowColor = `hsla(${rocket.hue}, 100%, 70%, ${0.55 * opacity})`
        context2d.fillStyle = `hsla(${rocket.hue}, 100%, 76%, ${0.9 * opacity})`
        context2d.beginPath()
        context2d.arc(rocket.x, rocket.y, 2.4, 0, TAU)
        context2d.fill()
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index]
        pushTrailPoint(particle.trail, particle.x, particle.y, PARTICLE_TRAIL_LENGTH)

        const dragFactor = Math.pow(particle.drag, delta)
        particle.vx *= dragFactor
        particle.vy = particle.vy * dragFactor + particle.gravity * delta
        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        particle.alpha -= particle.decay * delta
        particle.size *= Math.pow(0.996, delta)

        if (particle.alpha <= 0.02 || particle.size <= 0.35) {
          particles.splice(index, 1)
          continue
        }

        const flickerLift = Math.sin(timestamp * 0.015 * particle.flicker) * 7
        const brightness = clamp(particle.brightness + flickerLift, 48, 96)
        const alpha = particle.alpha * opacity
        const trailColor = `hsla(${particle.hue}, 100%, ${brightness}%, ${alpha * 0.38})`
        drawTrail(particle.trail, particle.x, particle.y, trailColor, Math.max(0.9, particle.size * 0.88))

        context2d.shadowBlur = 10
        context2d.shadowColor = `hsla(${particle.hue}, 100%, ${brightness}%, ${alpha * 0.5})`

        const glowRadius = Math.max(2.8, particle.size * 4)
        const glow = context2d.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          glowRadius,
        )
        glow.addColorStop(0, `hsla(${particle.hue}, 100%, ${Math.min(brightness + 12, 98)}%, ${alpha})`)
        glow.addColorStop(0.35, `hsla(${particle.hue}, 100%, ${brightness}%, ${alpha * 0.34})`)
        glow.addColorStop(1, `hsla(${particle.hue}, 100%, ${brightness - 12}%, 0)`)
        context2d.fillStyle = glow
        context2d.beginPath()
        context2d.arc(particle.x, particle.y, glowRadius, 0, TAU)
        context2d.fill()

        context2d.fillStyle = `hsla(${particle.hue}, 100%, ${Math.min(brightness + 16, 98)}%, ${alpha})`
        context2d.beginPath()
        context2d.arc(particle.x, particle.y, Math.max(0.9, particle.size), 0, TAU)
        context2d.fill()
      }

      context2d.restore()

      if (elapsed >= totalDuration && rockets.length === 0 && particles.length === 0) {
        setVisible(false)
        return
      }

      animationFrameId = window.requestAnimationFrame(frame)
    }

    resizeCanvas()
    animationFrameId = window.requestAnimationFrame(frame)
    window.addEventListener('resize', resizeCanvas)

    return () => {
      disposed = true
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [durationMs])

  if (!visible) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="fireworks-overlay"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  )
}
