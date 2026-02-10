import { describe, expect, it } from 'vitest'

import { clampItemCount, normalizeAngleDeg, rotationForIndex, snapIndex } from '@/components/content/orbitMath'

describe('orbitMath', () => {
  it('normalizes angles to [-180, 180)', () => {
    expect(normalizeAngleDeg(0)).toBe(0)
    expect(normalizeAngleDeg(190)).toBe(-170)
    expect(normalizeAngleDeg(-190)).toBe(170)
    expect(normalizeAngleDeg(540)).toBe(-180)
  })

  it('clamps item count to max', () => {
    expect(clampItemCount(100, 24)).toBe(24)
    expect(clampItemCount(5, 24)).toBe(5)
    expect(clampItemCount(5, -1)).toBe(0)
  })

  it('snaps rotation to nearest index', () => {
    const count = 8
    const step = 360 / count // 45deg
    expect(snapIndex(0, step, count)).toBe(0)
    expect(snapIndex(-45, step, count)).toBe(1)
    expect(snapIndex(-44, step, count)).toBe(1)
    expect(snapIndex(45, step, count)).toBe(7)
  })

  it('computes rotation for index', () => {
    expect(rotationForIndex(0, 30)).toBe(0)
    expect(rotationForIndex(2, 30)).toBe(-60)
  })
})

