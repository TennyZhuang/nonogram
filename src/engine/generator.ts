import type { DifficultyTier, PuzzleDefinition } from '@/core/types'
import { extractClues } from '@/engine/clue-extractor'
import { scoreDifficulty } from '@/engine/scorer'
import { solvePuzzle } from '@/engine/solver'

interface TierProfile {
  size: number
  fillRatio: number
}

type SymmetryKind = 'horizontal' | 'vertical' | 'rotational'

const TIER_PROFILES: Record<DifficultyTier, TierProfile> = {
  1: { size: 10, fillRatio: 0.6 },
  2: { size: 10, fillRatio: 0.55 },
  3: { size: 15, fillRatio: 0.5 },
  4: { size: 15, fillRatio: 0.45 },
  5: { size: 15, fillRatio: 0.4 },
}

const TEMPLATE_10: boolean[][] = [
  [false, false, true, true, true, true, true, true, false, false],
  [false, true, true, false, false, false, false, true, true, false],
  [true, true, false, false, false, false, false, false, true, true],
  [true, false, false, false, true, true, false, false, false, true],
  [true, false, false, true, true, true, true, false, false, true],
  [true, false, false, true, true, true, true, false, false, true],
  [true, false, false, false, true, true, false, false, false, true],
  [true, true, false, false, false, false, false, false, true, true],
  [false, true, true, false, false, false, false, true, true, false],
  [false, false, true, true, true, true, true, true, false, false],
]

const TEMPLATE_15: boolean[][] = [
  [false, false, false, true, true, true, true, true, true, true, true, true, false, false, false],
  [false, false, true, true, false, false, false, false, false, false, false, true, true, false, false],
  [false, true, true, false, false, false, false, false, false, false, false, false, true, true, false],
  [true, true, false, false, false, false, true, true, true, false, false, false, false, true, true],
  [true, false, false, false, true, true, true, true, true, true, true, false, false, false, true],
  [true, false, false, true, true, false, false, false, false, false, true, true, false, false, true],
  [true, false, false, true, false, false, true, true, true, false, false, true, false, false, true],
  [true, false, false, true, false, true, true, true, true, true, false, true, false, false, true],
  [true, false, false, true, false, false, true, true, true, false, false, true, false, false, true],
  [true, false, false, true, true, false, false, false, false, false, true, true, false, false, true],
  [true, false, false, false, true, true, true, true, true, true, true, false, false, false, true],
  [true, true, false, false, false, false, true, true, true, false, false, false, false, true, true],
  [false, true, true, false, false, false, false, false, false, false, false, false, true, true, false],
  [false, false, true, true, false, false, false, false, false, false, false, true, true, false, false],
  [false, false, false, true, true, true, true, true, true, true, true, true, false, false, false],
]

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function cloneGrid(grid: boolean[][]): boolean[][] {
  return grid.map((row) => [...row])
}

function flipHorizontal(grid: boolean[][]): boolean[][] {
  return grid.map((row) => [...row].reverse())
}

function flipVertical(grid: boolean[][]): boolean[][] {
  return [...grid].reverse().map((row) => [...row])
}

function rotate90(grid: boolean[][]): boolean[][] {
  const size = grid.length
  const next = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  )
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      next[col][size - row - 1] = grid[row][col]
    }
  }
  return next
}

function rotate180(grid: boolean[][]): boolean[][] {
  return rotate90(rotate90(grid))
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

function mutateTemplate(template: boolean[][], random: () => number): boolean[][] {
  let grid = cloneGrid(template)
  if (random() < 0.5) {
    grid = flipHorizontal(grid)
  }
  if (random() < 0.5) {
    grid = flipVertical(grid)
  }
  const rotations = Math.floor(random() * 4)
  for (let i = 0; i < rotations; i += 1) {
    grid = rotate90(grid)
  }
  return grid
}

function smoothGrid(grid: boolean[][], random: () => number): boolean[][] {
  const size = grid.length
  const next = cloneGrid(grid)
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      let filledNeighbors = 0
      let totalNeighbors = 0
      for (let dRow = -1; dRow <= 1; dRow += 1) {
        for (let dCol = -1; dCol <= 1; dCol += 1) {
          if (dRow === 0 && dCol === 0) {
            continue
          }
          const nRow = row + dRow
          const nCol = col + dCol
          if (nRow < 0 || nRow >= size || nCol < 0 || nCol >= size) {
            continue
          }
          totalNeighbors += 1
          if (grid[nRow][nCol]) {
            filledNeighbors += 1
          }
        }
      }
      if (filledNeighbors >= Math.ceil(totalNeighbors / 2)) {
        next[row][col] = random() > 0.15
      } else {
        next[row][col] = random() < 0.1
      }
    }
  }
  return next
}

function gridDifferenceRatio(left: boolean[][], right: boolean[][]): number {
  if (left.length !== right.length || left[0]?.length !== right[0]?.length) {
    return 1
  }

  const size = left.length
  let differentCells = 0
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (left[row][col] !== right[row][col]) {
        differentCells += 1
      }
    }
  }
  return differentCells / (size * size)
}

function getSymmetryDistances(
  grid: boolean[][],
): Array<{ kind: SymmetryKind; distance: number }> {
  return [
    {
      kind: 'horizontal',
      distance: gridDifferenceRatio(grid, flipHorizontal(grid)),
    },
    {
      kind: 'vertical',
      distance: gridDifferenceRatio(grid, flipVertical(grid)),
    },
    {
      kind: 'rotational',
      distance: gridDifferenceRatio(grid, rotate180(grid)),
    },
  ]
}

function getSymmetryTarget(tier: DifficultyTier): number {
  if (tier === 3) {
    return 0.12
  }
  if (tier === 4) {
    return 0.16
  }
  if (tier === 5) {
    return 0.2
  }
  return 0
}

function randomIndexExcluding(
  size: number,
  excluded: number,
  random: () => number,
): number {
  if (size <= 1) {
    return 0
  }
  const offset = Math.floor(random() * (size - 1))
  return offset >= excluded ? offset + 1 : offset
}

function injectAsymmetry(
  grid: boolean[][],
  kind: SymmetryKind,
  random: () => number,
): void {
  const size = grid.length
  const center = Math.floor(size / 2)

  if (kind === 'horizontal') {
    const row = Math.floor(random() * size)
    const col =
      size % 2 === 1
        ? randomIndexExcluding(size, center, random)
        : Math.floor(random() * size)
    const mirrorCol = size - col - 1
    grid[row][col] = !grid[row][mirrorCol]
    return
  }

  if (kind === 'vertical') {
    const row =
      size % 2 === 1
        ? randomIndexExcluding(size, center, random)
        : Math.floor(random() * size)
    const col = Math.floor(random() * size)
    const mirrorRow = size - row - 1
    grid[row][col] = !grid[mirrorRow][col]
    return
  }

  let row = Math.floor(random() * size)
  const col = Math.floor(random() * size)
  if (size % 2 === 1 && row === center && col === center) {
    row = randomIndexExcluding(size, center, random)
  }
  const mirrorRow = size - row - 1
  const mirrorCol = size - col - 1
  grid[row][col] = !grid[mirrorRow][mirrorCol]
}

function diversifyHighTierGrid(
  grid: boolean[][],
  tier: DifficultyTier,
  random: () => number,
): boolean[][] {
  if (tier <= 2) {
    return grid
  }

  const targetDistance = getSymmetryTarget(tier)
  const next = cloneGrid(grid)
  const maxEdits = tier === 3 ? 6 : tier === 4 ? 10 : 14

  for (let edit = 0; edit < maxEdits; edit += 1) {
    const distances = getSymmetryDistances(next)
    let strongestSymmetry = distances[0]
    for (let i = 1; i < distances.length; i += 1) {
      if (distances[i].distance < strongestSymmetry.distance) {
        strongestSymmetry = distances[i]
      }
    }

    if (strongestSymmetry.distance >= targetDistance) {
      return next
    }

    injectAsymmetry(next, strongestSymmetry.kind, random)
  }

  return next
}

function passesSymmetryThreshold(grid: boolean[][], tier: DifficultyTier): boolean {
  if (tier <= 2) {
    return true
  }

  const targetDistance = getSymmetryTarget(tier)
  const distances = getSymmetryDistances(grid)
  for (const { distance } of distances) {
    if (distance < targetDistance) {
      return false
    }
  }
  return true
}

function generateRandomGrid(
  profile: TierProfile,
  tier: DifficultyTier,
  random: () => number,
): boolean[][] {
  const fillRatioOffset = tier >= 3 ? (random() - 0.5) * 0.18 : 0
  const fillRatio = clamp(profile.fillRatio + fillRatioOffset, 0.25, 0.75)
  const initial = Array.from({ length: profile.size }, () =>
    Array.from({ length: profile.size }, () => random() < fillRatio),
  )
  return smoothGrid(initial, random)
}

function sameGrid(left: boolean[][], right: boolean[][]): boolean {
  if (left.length !== right.length) {
    return false
  }
  for (let row = 0; row < left.length; row += 1) {
    for (let col = 0; col < left[row].length; col += 1) {
      if (left[row][col] !== right[row][col]) {
        return false
      }
    }
  }
  return true
}

function getTemplateByTier(tier: DifficultyTier): boolean[][] {
  return tier <= 2 ? TEMPLATE_10 : TEMPLATE_15
}

export function generatePuzzle(
  tier: DifficultyTier,
  seed = Math.floor(Math.random() * 1_000_000_000),
): PuzzleDefinition | null {
  const profile = TIER_PROFILES[tier]
  const maxRetries = tier >= 3 ? 16 : 10
  const extendedRetries = tier >= 3 ? 36 : 20
  let fallback: PuzzleDefinition | null = null

  for (let attempt = 0; attempt < extendedRetries; attempt += 1) {
    const attemptSeed = seed + attempt * 7_919
    const random = mulberry32(attemptSeed)
    const baseCandidate =
      attempt < maxRetries
        ? generateRandomGrid(profile, tier, random)
        : mutateTemplate(getTemplateByTier(tier), random)
    const candidate = diversifyHighTierGrid(baseCandidate, tier, random)

    if (!passesSymmetryThreshold(candidate, tier)) {
      continue
    }

    const clues = extractClues(candidate)
    const solved = solvePuzzle(clues)
    if (!solved.solved || !solved.unique || !solved.solution) {
      continue
    }
    if (!sameGrid(solved.solution, candidate)) {
      continue
    }

    const puzzle: PuzzleDefinition = {
      id: `tier-${tier}-${attemptSeed}`,
      seed: attemptSeed,
      size: profile.size,
      tier,
      solution: candidate,
      clues,
    }
    const scoredTier = scoreDifficulty(solved.trace, profile.size)
    if (scoredTier === tier) {
      return puzzle
    }

    if (!fallback) {
      fallback = puzzle
    }
  }

  return fallback
}
