import type { DifficultyTier, PuzzleDefinition } from '@/core/types'
import { extractClues } from '@/engine/clue-extractor'
import { scoreDifficulty } from '@/engine/scorer'
import { solvePuzzle } from '@/engine/solver'

interface TierProfile {
  size: number
  fillRatio: number
}

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

function generateRandomGrid(profile: TierProfile, random: () => number): boolean[][] {
  const initial = Array.from({ length: profile.size }, () =>
    Array.from({ length: profile.size }, () => random() < profile.fillRatio),
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
  const maxRetries = 10
  const extendedRetries = 20
  let fallback: PuzzleDefinition | null = null

  for (let attempt = 0; attempt < extendedRetries; attempt += 1) {
    const attemptSeed = seed + attempt * 7_919
    const random = mulberry32(attemptSeed)
    const candidate =
      attempt < maxRetries
        ? generateRandomGrid(profile, random)
        : mutateTemplate(getTemplateByTier(tier), random)

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
