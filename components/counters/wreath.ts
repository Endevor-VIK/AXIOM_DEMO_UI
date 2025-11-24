type Options = {
  value: number | string
  label: string
  ringSize?: number
  tiles?: number
}

type Tile = {
  angle: number
  origR: number
  origW: number
  origH: number
  origRot: number
  compound: boolean
  currentR: number
  currentW: number
  currentH: number
  currentRot: number
  targetR: number
  targetW: number
  targetH: number
  targetRot: number
  progress: number
  animating: boolean
  direction: number
  delay: number
  elapsed: number
}

type Config = {
  tileCount: number
  outerRadiusK: number
  innerRadiusK: number
  minTileK: number
  maxTileK: number
  bandGapK: number
  outerRedWidthK: number
  innerRedWidthK: number
  shadowBlur: number
  baseLight: number
  hoverLight: number
  redTint: number
  transformDuration: number
  staggerPerRad: number
  maxStagger: number
  baseStaggerStep: number
  aspectRatios: number[]
  compoundProb: number
}

export type WreathApi = {
  setValue(next: number | string): void
  destroy(): void
}

let mountIndex = 0

const defaultConfig: Config = {
  tileCount: 96,
  outerRadiusK: 0.9,
  innerRadiusK: 0.6,
  minTileK: 0.025,
  maxTileK: 0.05,
  bandGapK: 0.015,
  outerRedWidthK: 0.0062,
  innerRedWidthK: 0.0048,
  shadowBlur: 5,
  baseLight: 0.024,
  hoverLight: 0.072,
  redTint: 0.09,
  transformDuration: 780,
  staggerPerRad: 90,
  maxStagger: 285,
  baseStaggerStep: 48,
  aspectRatios: [1, 1.4, 0.7, 1.8, 0.55, 2.2, 0.35],
  compoundProb: 0.2,
}

export function mountWreath(root: HTMLElement, opts: Options): WreathApi {
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  const canvas = document.createElement('canvas')
  const ctx = getRequiredContext(canvas)
  canvas.setAttribute('role', 'presentation')
  canvas.setAttribute('aria-hidden', 'true')

  root.appendChild(canvas)

  const readout = document.createElement('div')
  readout.className = 'ax-readout'
  readout.innerHTML = `<div class="ax-value" aria-live="polite"></div><div class="ax-label"></div>`
  const valueEl = readout.querySelector('.ax-value') as HTMLDivElement
  const labelEl = readout.querySelector('.ax-label') as HTMLDivElement
  valueEl.textContent = String(opts.value ?? '0')
  labelEl.textContent = String(opts.label ?? '')
  root.appendChild(readout)

  const cfg: Config = {
    ...defaultConfig,
    tileCount: clamp(opts.tiles ?? defaultConfig.tileCount, 40, 140),
  }
  const aspectPool = cfg.aspectRatios.length ? cfg.aspectRatios : [1]
  const pickAspect = () => {
    const index = Math.floor(rand() * aspectPool.length)
    const candidate = aspectPool[index] ?? 1
    const safe = Math.abs(candidate) < 0.0001 ? 1 : candidate
    return safe
  }

  const instanceSeed = 0xdead + mountIndex * 157
  mountIndex += 1
  const rand = mulberry32(instanceSeed)

  let tiles: Tile[] = []
  let size = 0
  let hovering = false
  let lastTime = performance.now()
  let rafId = 0
  let pointerAngle = 0
  let hasPointerPosition = false
  let pointerDistance = 0
  const interactionTarget = (root.closest('a') as HTMLElement | null) ?? root

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let prefersReducedMotion = reduceMotionQuery.matches

  const handleMotionPreference = (event: MediaQueryListEvent | MediaQueryList) => {
    prefersReducedMotion = event.matches
    if (prefersReducedMotion) {
      stopAnimation()
      tiles.forEach((tile) => {
        tile.currentR = tile.origR
        tile.currentW = tile.origW
        tile.currentH = tile.origH
        tile.currentRot = tile.origRot
        tile.animating = false
        tile.direction = 0
        tile.progress = 0
      })
      draw()
    }
  }

  function handlePointerMove(event: MouseEvent) {
    const rect = root.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = event.clientX - centerX
    const dy = event.clientY - centerY
    pointerAngle = Math.atan2(dy, dx)
    pointerDistance = Math.sqrt(dx * dx + dy * dy)
    hasPointerPosition = true
  }

  function computeStaggerDelay(angle: number, index: number) {
    if (prefersReducedMotion) {
      return 0
    }
    if (hasPointerPosition && pointerDistance > 4) {
      const diff = Math.abs(shortestAngle(angle, pointerAngle))
      return Math.min(cfg.maxStagger, diff * cfg.staggerPerRad)
    }
    return Math.min(cfg.maxStagger, index * cfg.baseStaggerStep)
  }

  if (typeof reduceMotionQuery.addEventListener === 'function') {
    reduceMotionQuery.addEventListener('change', handleMotionPreference)
  } else {
    // eslint-disable-next-line deprecation/deprecation
    reduceMotionQuery.addListener(handleMotionPreference)
  }

  function computeTiles(measuredSize: number) {
    tiles = []
    const outerR = measuredSize * cfg.outerRadiusK * 0.5
    const innerR = measuredSize * cfg.innerRadiusK * 0.5
    const bandGap = Math.max(1.5, measuredSize * cfg.bandGapK)
    const angleStep = (Math.PI * 2) / cfg.tileCount

    for (let i = 0; i < cfg.tileCount; i += 1) {
      const angle = angleStep * i + (rand() - 0.5) * angleStep * 0.28
      const baseSize = lerp(measuredSize * cfg.minTileK, measuredSize * cfg.maxTileK, rand())
      const aspect = pickAspect()

      let w = baseSize
      let h = baseSize
      if (aspect > 1) {
        w = baseSize * aspect
      } else if (aspect < 1) {
        h = baseSize / aspect
      }

      const maxDim = Math.max(w, h)
      const half = maxDim * 0.5
      const minR = innerR + bandGap + half
      const maxR = outerR - bandGap - half
      const baseRadius = lerp(minR, maxR, rand())
      const r = clamp(baseRadius + (rand() * 2 - 1) * Math.min(maxDim * 0.16, bandGap * 0.9), minR, maxR)
      const rot = (rand() * 2 - 1) * (Math.PI / 5)
      const compound = rand() < cfg.compoundProb

      tiles.push({
        angle,
        origR: r,
        origW: w,
        origH: h,
        origRot: rot,
        compound,
        currentR: r,
        currentW: w,
        currentH: h,
        currentRot: rot,
        targetR: r,
        targetW: w,
        targetH: h,
        targetRot: rot,
        progress: 0,
        animating: false,
        direction: 0,
        delay: 0,
        elapsed: 0,
      })
    }
  }

  function draw(time?: number) {
    const W = canvas.width
    const H = canvas.height
    const S = Math.min(W, H)
    const cx = W / 2
    const cy = H / 2
    ctx.clearRect(0, 0, W, H)

    const g780 = getCssVar('--g-780') || '#1a1d20'
    const g700 = getCssVar('--g-700') || '#22272b'
    const g820 = getCssVar('--g-820') || '#16191b'
    const g860 = getCssVar('--g-860') || '#141718'
    const r500 = getCssVar('--r-500') || '#ff2d55'
    const r700 = getCssVar('--r-700') || '#8e1022'

    const outerRadius = S * cfg.outerRadiusK * 0.5
    const innerRadius = S * cfg.innerRadiusK * 0.5

    let anyAnimating = false

    if (typeof time === 'number') {
      const delta = time - lastTime
      tiles.forEach((tile) => {
        if (!tile.animating) {
          return
        }
        tile.elapsed += delta
        if (tile.elapsed < tile.delay) {
          anyAnimating = true
          return
        }
        const localTime = tile.elapsed - tile.delay
        tile.progress = Math.min(1, localTime / cfg.transformDuration)
        const eased = easeInOutCubic(tile.progress)
        if (tile.direction === 1) {
          tile.currentR = lerp(tile.origR, tile.targetR, eased)
          tile.currentW = lerp(tile.origW, tile.targetW, eased)
          tile.currentH = lerp(tile.origH, tile.targetH, eased)
          tile.currentRot = lerp(tile.origRot, tile.targetRot, eased)
        } else if (tile.direction === -1) {
          tile.currentR = lerp(tile.targetR, tile.origR, eased)
          tile.currentW = lerp(tile.targetW, tile.origW, eased)
          tile.currentH = lerp(tile.targetH, tile.origH, eased)
          tile.currentRot = lerp(tile.targetRot, tile.origRot, eased)
        }
        if (tile.progress >= 1) {
          tile.animating = false
          tile.progress = 1
        } else {
          anyAnimating = true
        }
      })
      if (tiles.some((tile) => tile.animating || tile.elapsed < tile.delay)) {
        anyAnimating = true
      }
    }

    // outer ring
    const outerGrad = ctx.createLinearGradient(0, 0, W, H)
    outerGrad.addColorStop(0, r500)
    outerGrad.addColorStop(1, r700)
    ctx.save()
    ctx.lineWidth = Math.max(1, S * cfg.outerRedWidthK)
    ctx.strokeStyle = outerGrad
    ctx.beginPath()
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // inner ring
    const innerGrad = ctx.createLinearGradient(W, 0, 0, H)
    innerGrad.addColorStop(0, r500)
    innerGrad.addColorStop(1, r700)
    ctx.save()
    ctx.lineWidth = Math.max(1, S * cfg.innerRedWidthK)
    ctx.strokeStyle = innerGrad
    ctx.beginPath()
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.translate(cx, cy)
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = cfg.shadowBlur
    ctx.shadowOffsetY = 2

    tiles.forEach((tile) => {
      const brighten = hovering ? cfg.hoverLight : cfg.baseLight
      const baseGraph = lightenColor(g780, brighten)
      const tinted = mixColors(baseGraph, r500, cfg.redTint)
      const lightEdge = lightenColor(g700, brighten + cfg.redTint * 0.5)
      const darkEdge = g820
      const x = Math.cos(tile.angle) * tile.currentR
      const y = Math.sin(tile.angle) * tile.currentR
      const w = tile.currentW
      const h = tile.currentH

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(tile.currentRot)
      ctx.fillStyle = tinted

      if (tile.compound) {
        const barH = h * 0.4
        const barW = w * 0.4
        ctx.fillRect(-w * 0.6, -barH * 0.5, w * 1.2, barH)
        ctx.fillRect(-barW * 0.5, -h * 0.6, barW, h * 1.2)

        ctx.globalAlpha = 0.6
        ctx.fillStyle = lightEdge
        const bevelHh = Math.max(1.5, barH * 0.2)
        const bevelWh = Math.max(1.5, w * 0.15)
        ctx.fillRect(-w * 0.6, -barH * 0.5, w * 1.2, bevelHh)
        ctx.fillRect(-w * 0.6, -barH * 0.5, bevelWh, barH)
        const bevelHv = Math.max(1.5, h * 0.15)
        const bevelWv = Math.max(1.5, barW * 0.2)
        ctx.fillRect(-barW * 0.5, -h * 0.6, bevelWv, h * 1.2)
        ctx.fillRect(-barW * 0.5, -h * 0.6, barW, bevelHv)

        ctx.globalAlpha = 0.35
        ctx.fillStyle = darkEdge
        const bevelHhB = Math.max(1.5, barH * 0.25)
        ctx.fillRect(-w * 0.6, barH * 0.5 - bevelHhB, w * 1.2, bevelHhB)
        ctx.fillRect(w * 0.6 - bevelWh, -barH * 0.5, bevelWh, barH)
        const bevelHvB = Math.max(1.5, h * 0.25)
        ctx.fillRect(-barW * 0.5, h * 0.6 - bevelHvB, barW, bevelHvB)
        ctx.fillRect(barW * 0.5 - bevelWv, -h * 0.6, bevelWv, h * 1.2)

        ctx.globalAlpha = 0.15
        ctx.strokeStyle = g860
        const lineW = Math.max(1, Math.min(w, h) * 0.035)
        ctx.lineWidth = lineW
        ctx.strokeRect(-w * 0.6 + lineW / 2, -barH * 0.5 + lineW / 2, w * 1.2 - lineW, barH - lineW)
        ctx.strokeRect(-barW * 0.5 + lineW / 2, -h * 0.6 + lineW / 2, barW - lineW, h * 1.2 - lineW)
      } else {
        ctx.fillRect(-w / 2, -h / 2, w, h)

        ctx.globalAlpha = 0.6
        ctx.fillStyle = lightEdge
        const bevelH = Math.max(1.5, h * 0.15)
        const bevelW = Math.max(1.5, w * 0.15)
        ctx.fillRect(-w / 2, -h / 2, w, bevelH)
        ctx.fillRect(-w / 2, -h / 2, bevelW, h)

        ctx.globalAlpha = 0.35
        ctx.fillStyle = darkEdge
        const bevelHb = Math.max(1.5, h * 0.18)
        const bevelWb = Math.max(1.5, w * 0.18)
        ctx.fillRect(-w / 2, h / 2 - bevelHb, w, bevelHb)
        ctx.fillRect(w / 2 - bevelWb, -h / 2, bevelWb, h)

        ctx.globalAlpha = 0.15
        ctx.strokeStyle = g860
        const lineW = Math.max(1, Math.min(w, h) * 0.035)
        ctx.lineWidth = lineW
        ctx.strokeRect(-w / 2 + lineW / 2, -h / 2 + lineW / 2, w - lineW, h - lineW)
      }
      ctx.restore()
    })
    ctx.restore()

    ctx.save()
    const vignette = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.55)
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.25)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    if (anyAnimating) {
      rafId = requestAnimationFrame(draw)
    } else {
      rafId = 0
    }
    lastTime = typeof time === 'number' ? time : performance.now()
  }

  function startTransform() {
    if (prefersReducedMotion) {
      return
    }
    const outerR = size * cfg.outerRadiusK * 0.5
    const innerR = size * cfg.innerRadiusK * 0.5
    const bandGap = Math.max(1.5, size * cfg.bandGapK)
    tiles.forEach((tile, index) => {
      const maxDim = Math.max(tile.origW, tile.origH)
      const half = maxDim * 0.5
      const minR = innerR + bandGap + half
      const maxR = outerR - bandGap - half
      const shift = (rand() * 2 - 1) * Math.min(maxDim * 0.18, bandGap * 1.1)
      let newR = tile.origR + shift
      newR = clamp(newR, minR, maxR)
      tile.targetR = newR
      const aspect = pickAspect()
      if (aspect > 1) {
        tile.targetW = tile.origW * aspect
        tile.targetH = tile.origH
      } else if (aspect < 1) {
        tile.targetW = tile.origW
        tile.targetH = tile.origH / aspect
      } else {
        tile.targetW = tile.origW
        tile.targetH = tile.origH
      }
      tile.targetRot = tile.origRot + (rand() * 2 - 1) * (Math.PI / 6)
      tile.delay = computeStaggerDelay(tile.angle, index)
      tile.elapsed = 0
      tile.progress = 0
      tile.animating = true
      tile.direction = 1
    })
    lastTime = performance.now()
    if (!rafId) {
      rafId = requestAnimationFrame(draw)
    }
  }

  function revertTransform() {
    if (prefersReducedMotion) {
      tiles.forEach((tile) => {
        tile.currentR = tile.origR
        tile.currentW = tile.origW
        tile.currentH = tile.origH
        tile.currentRot = tile.origRot
        tile.animating = false
        tile.direction = 0
        tile.progress = 0
      })
      draw()
      return
    }
    tiles.forEach((tile, index) => {
      tile.progress = 0
      tile.animating = true
      tile.direction = -1
      tile.delay = computeStaggerDelay(tile.angle, index)
      tile.elapsed = 0
    })
    lastTime = performance.now()
    if (!rafId) {
      rafId = requestAnimationFrame(draw)
    }
  }

  function stopAnimation() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function resize() {
    const rect = root.getBoundingClientRect()
    const newSize = Math.round(rect.width || opts.ringSize || 260)
    if (newSize === size) return
    size = newSize
    canvas.width = Math.round(size * DPR)
    canvas.height = Math.round(size * DPR)
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    computeTiles(size)
    draw()
  }

  function destroy() {
    stopAnimation()
    resizeObserver.disconnect()
    interactionTarget.removeEventListener('mouseenter', handleEnter)
    interactionTarget.removeEventListener('mouseleave', handleLeave)
    interactionTarget.removeEventListener('click', handleClick)
    interactionTarget.removeEventListener('focusin', handleEnter)
    interactionTarget.removeEventListener('focusout', handleLeave)
    interactionTarget.removeEventListener('mousemove', handlePointerMove)
    if (typeof reduceMotionQuery.removeEventListener === 'function') {
      reduceMotionQuery.removeEventListener('change', handleMotionPreference)
    } else {
      // eslint-disable-next-line deprecation/deprecation
      reduceMotionQuery.removeListener(handleMotionPreference)
    }
    root.replaceChildren()
  }

  function handleEnter() {
    hovering = true
    startTransform()
  }

  function handleLeave() {
    hovering = false
    revertTransform()
    hasPointerPosition = false
  }

  function handleClick() {
    hovering = true
    startTransform()
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(root)
  resize()

  interactionTarget.addEventListener('mouseenter', handleEnter, { passive: true })
  interactionTarget.addEventListener('mouseleave', handleLeave, { passive: true })
  interactionTarget.addEventListener('click', handleClick, { passive: true })
  interactionTarget.addEventListener('focusin', handleEnter)
  interactionTarget.addEventListener('focusout', handleLeave)
  interactionTarget.addEventListener('mousemove', handlePointerMove, { passive: true })
  if (interactionTarget === root) {
    root.tabIndex = root.tabIndex >= 0 ? root.tabIndex : 0
  }

  return {
    setValue(next) {
      valueEl.textContent = String(next)
    },
    destroy,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function getCssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function parseColor(value: string) {
  if (value.startsWith('rgb')) {
    const match = value.match(/rgb\s*\(\s*(\d+)[^\d]+(\d+)[^\d]+(\d+)/i)
    if (!match) return { r: 0, g: 0, b: 0 }
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) }
  }
  return hexToRgb(value)
}

function hexToRgb(hex: string) {
  const normalized = hex.replace(/^#/, '')
  const intVal = parseInt(normalized, 16)
  return {
    r: (intVal >> 16) & 0xff,
    g: (intVal >> 8) & 0xff,
    b: intVal & 0xff,
  }
}

function getRequiredContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to obtain 2D canvas context for CounterWreath')
  }
  return context
}

function lightenColor(color: string, factor: number) {
  const { r, g, b } = parseColor(color)
  const clamped = Math.min(1, Math.max(0, factor))
  const lift = (channel: number) => Math.min(255, Math.round(channel + (255 - channel) * clamped))
  return `rgb(${lift(r)}, ${lift(g)}, ${lift(b)})`
}

function mixColors(c1: string, c2: string, ratio: number) {
  const a = parseColor(c1)
  const b = parseColor(c2)
  const t = Math.min(1, Math.max(0, ratio))
  const mixChannel = (x: number, y: number) => Math.round(x * (1 - t) + y * t)
  return `rgb(${mixChannel(a.r, b.r)}, ${mixChannel(a.g, b.g)}, ${mixChannel(a.b, b.b)})`
}

function shortestAngle(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b))
}
