export function normalizeAngleDeg(angle: number): number {
  if (!Number.isFinite(angle)) return 0
  let a = angle % 360
  if (a < -180) a += 360
  if (a >= 180) a -= 360
  return a
}

export function clampItemCount(total: number, maxItems: number): number {
  const max = Number.isFinite(maxItems) ? Math.max(0, Math.floor(maxItems)) : 0
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0
  return Math.min(safeTotal, max)
}

export function snapIndex(rotationDeg: number, stepDeg: number, count: number): number {
  if (!Number.isFinite(rotationDeg) || !Number.isFinite(stepDeg) || !Number.isFinite(count)) return 0
  if (count <= 0) return 0
  if (stepDeg === 0) return 0
  const raw = Math.round(-rotationDeg / stepDeg)
  const mod = raw % count
  if (mod === 0) return 0
  return mod < 0 ? mod + count : mod
}

export function rotationForIndex(index: number, stepDeg: number): number {
  if (!Number.isFinite(index) || !Number.isFinite(stepDeg)) return 0
  const value = -index * stepDeg
  return value === 0 ? 0 : value
}
