import type { DifficultyTier, PuzzleClues, PuzzleDefinition } from '@/core/types'
import { extractClues } from '@/engine/clue-extractor'
import {
  assessPuzzleDifficultyV2,
  type DifficultyAssessment,
} from '@/engine/difficulty-v2'
import { scoreDifficulty } from '@/engine/scorer'
import { solvePuzzle } from '@/engine/solver'

interface TierProfile {
  size: number
  fillRatio: number
  fillRatioJitter: number
  rounds: number
  beamWidth: number
  freshCandidates: number
  shortlistSize: number
  mutationEdits: number
  targetScore: number
  targetRevealBalance: number
  symmetryFloor: number
  minimumFunScore: number
}

interface ScreenedCandidate {
  grid: boolean[][]
  signature: string
  clues: PuzzleClues
  exactTier: DifficultyTier
  exactBranchNodes: number
  baseFunScore: number
  screenScore: number
  candidateSeed: number
}

interface CandidateEvaluation {
  puzzle: PuzzleDefinition
  assessment: DifficultyAssessment
  objective: number
  funScore: number
  signature: string
}

type SymmetryKind = 'horizontal' | 'vertical' | 'rotational'

type ExactSolveResult = ReturnType<typeof solvePuzzle>

const generatedPuzzleCache = new Map<string, PuzzleDefinition | null>()

function clonePuzzle(puzzle: PuzzleDefinition | null): PuzzleDefinition | null {
  if (!puzzle) {
    return null
  }
  return {
    ...puzzle,
    solution: puzzle.solution.map((row) => [...row]),
    clues: {
      rows: puzzle.clues.rows.map((row) => [...row]),
      cols: puzzle.clues.cols.map((col) => [...col]),
    },
  }
}

const TIER_PROFILES: Record<DifficultyTier, TierProfile> = {
  1: {
    size: 10,
    fillRatio: 0.54,
    fillRatioJitter: 0.08,
    rounds: 4,
    beamWidth: 4,
    freshCandidates: 6,
    shortlistSize: 6,
    mutationEdits: 2,
    targetScore: 1.1,
    targetRevealBalance: 0.46,
    symmetryFloor: 0,
    minimumFunScore: 2.2,
  },
  2: {
    size: 10,
    fillRatio: 0.5,
    fillRatioJitter: 0.1,
    rounds: 5,
    beamWidth: 4,
    freshCandidates: 7,
    shortlistSize: 6,
    mutationEdits: 3,
    targetScore: 2.2,
    targetRevealBalance: 0.5,
    symmetryFloor: 0.02,
    minimumFunScore: 2.3,
  },
  3: {
    size: 15,
    fillRatio: 0.48,
    fillRatioJitter: 0.12,
    rounds: 4,
    beamWidth: 4,
    freshCandidates: 6,
    shortlistSize: 5,
    mutationEdits: 3,
    targetScore: 3.3,
    targetRevealBalance: 0.55,
    symmetryFloor: 0.08,
    minimumFunScore: 2.5,
  },
  4: {
    size: 15,
    fillRatio: 0.45,
    fillRatioJitter: 0.14,
    rounds: 5,
    beamWidth: 4,
    freshCandidates: 7,
    shortlistSize: 6,
    mutationEdits: 4,
    targetScore: 4.2,
    targetRevealBalance: 0.61,
    symmetryFloor: 0.12,
    minimumFunScore: 2.7,
  },
  5: {
    size: 15,
    fillRatio: 0.42,
    fillRatioJitter: 0.14,
    rounds: 6,
    beamWidth: 5,
    freshCandidates: 8,
    shortlistSize: 6,
    mutationEdits: 5,
    targetScore: 5.1,
    targetRevealBalance: 0.67,
    symmetryFloor: 0.16,
    minimumFunScore: 2.85,
  },
  6: {
    size: 15,
    fillRatio: 0.41,
    fillRatioJitter: 0.14,
    rounds: 8,
    beamWidth: 6,
    freshCandidates: 9,
    shortlistSize: 7,
    mutationEdits: 6,
    targetScore: 5.85,
    targetRevealBalance: 0.72,
    symmetryFloor: 0.18,
    minimumFunScore: 2.95,
  },
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

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
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

function gridDifferenceRatio(left: boolean[][], right: boolean[][]): number {
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

function minSymmetryDistance(grid: boolean[][]): number {
  return Math.min(...getSymmetryDistances(grid).map((entry) => entry.distance))
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

function countFilledCells(grid: boolean[][]): number {
  let total = 0
  for (const row of grid) {
    for (const cell of row) {
      if (cell) {
        total += 1
      }
    }
  }
  return total
}

function getTemplateBySize(size: number): boolean[][] {
  return size <= 10 ? TEMPLATE_10 : TEMPLATE_15
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

function stampEllipse(
  grid: boolean[][],
  random: () => number,
  filled: boolean,
): void {
  const size = grid.length
  const centerRow = Math.floor(random() * size)
  const centerCol = Math.floor(random() * size)
  const radiusRow = 1 + Math.floor(random() * Math.max(2, size / 4))
  const radiusCol = 1 + Math.floor(random() * Math.max(2, size / 4))

  for (let row = Math.max(0, centerRow - radiusRow); row <= Math.min(size - 1, centerRow + radiusRow); row += 1) {
    for (let col = Math.max(0, centerCol - radiusCol); col <= Math.min(size - 1, centerCol + radiusCol); col += 1) {
      const normRow = (row - centerRow) / radiusRow
      const normCol = (col - centerCol) / radiusCol
      const distance = normRow * normRow + normCol * normCol
      if (distance <= 1 + (random() - 0.5) * 0.15) {
        grid[row][col] = filled
      }
    }
  }
}

function generateEasyGrid(profile: TierProfile, random: () => number): boolean[][] {
  const grid = Array.from({ length: profile.size }, () =>
    Array.from({ length: profile.size }, () => false),
  )

  const horizontalBands = 1 + Math.floor(random() * 2)
  for (let band = 0; band < horizontalBands; band += 1) {
    const top = Math.floor(random() * Math.max(1, profile.size - 2))
    const height = 1 + Math.floor(random() * Math.max(1, profile.size / 5))
    const left = Math.floor(random() * Math.max(1, profile.size / 5))
    const width = Math.floor(profile.size * (0.55 + random() * 0.3))
    const right = Math.min(profile.size, left + width)
    for (let row = top; row < Math.min(profile.size, top + height); row += 1) {
      for (let col = left; col < right; col += 1) {
        grid[row][col] = true
      }
    }
  }

  if (random() < 0.65) {
    const verticalBands = 1 + Math.floor(random() * 2)
    for (let band = 0; band < verticalBands; band += 1) {
      const left = Math.floor(random() * Math.max(1, profile.size - 2))
      const width = 1 + Math.floor(random() * Math.max(1, profile.size / 6))
      const top = Math.floor(random() * Math.max(1, profile.size / 5))
      const height = Math.floor(profile.size * (0.45 + random() * 0.35))
      const bottom = Math.min(profile.size, top + height)
      for (let row = top; row < bottom; row += 1) {
        for (let col = left; col < Math.min(profile.size, left + width); col += 1) {
          grid[row][col] = true
        }
      }
    }
  }

  return grid
}


function generateVeryEasyGrid(profile: TierProfile, random: () => number): boolean[][] {
  const grid = Array.from({ length: profile.size }, () =>
    Array.from({ length: profile.size }, () => false),
  )

  const fullRows = 1 + Math.floor(random() * 2)
  for (let index = 0; index < fullRows; index += 1) {
    const row = Math.floor(random() * profile.size)
    for (let col = 0; col < profile.size; col += 1) {
      grid[row][col] = true
    }
  }

  const blockTop = Math.floor(random() * Math.max(1, profile.size - 3))
  const blockLeft = Math.floor(random() * Math.max(1, profile.size - 3))
  const blockHeight = 2 + Math.floor(random() * 2)
  const blockWidth = Math.floor(profile.size * (0.45 + random() * 0.25))
  for (let row = blockTop; row < Math.min(profile.size, blockTop + blockHeight); row += 1) {
    for (let col = blockLeft; col < Math.min(profile.size, blockLeft + blockWidth); col += 1) {
      grid[row][col] = true
    }
  }

  if (random() < 0.5) {
    const fullCols = 1 + Math.floor(random() * 2)
    for (let index = 0; index < fullCols; index += 1) {
      const col = Math.floor(random() * profile.size)
      for (let row = 0; row < profile.size; row += 1) {
        grid[row][col] = true
      }
    }
  }

  return grid
}

function generateBlobGrid(profile: TierProfile, random: () => number): boolean[][] {
  const grid = Array.from({ length: profile.size }, () =>
    Array.from({ length: profile.size }, () => false),
  )

  const brushes = profile.size <= 10
    ? 3 + Math.floor(random() * 3)
    : 4 + Math.floor(random() * 4)

  for (let index = 0; index < brushes; index += 1) {
    stampEllipse(grid, random, true)
    if (profile.size > 10 && random() < 0.18) {
      stampEllipse(grid, random, false)
    }
  }

  return smoothGrid(grid, random)
}

function generateRandomGrid(profile: TierProfile, random: () => number): boolean[][] {
  const fillRatio = clamp(
    profile.fillRatio + (random() - 0.5) * profile.fillRatioJitter,
    0.2,
    0.75,
  )

  const initial = Array.from({ length: profile.size }, () =>
    Array.from({ length: profile.size }, () => random() < fillRatio),
  )

  return smoothGrid(initial, random)
}

function mutateGrid(
  grid: boolean[][],
  template: boolean[][],
  random: () => number,
  edits: number,
): boolean[][] {
  const next = cloneGrid(grid)
  const size = next.length

  for (let edit = 0; edit < edits; edit += 1) {
    const roll = random()

    if (roll < 0.35) {
      const row = Math.floor(random() * size)
      const col = Math.floor(random() * size)
      next[row][col] = !next[row][col]
      continue
    }

    if (roll < 0.6) {
      const row = Math.floor(random() * Math.max(1, size - 1))
      const col = Math.floor(random() * Math.max(1, size - 1))
      for (let dRow = 0; dRow < 2; dRow += 1) {
        for (let dCol = 0; dCol < 2; dCol += 1) {
          next[Math.min(size - 1, row + dRow)][Math.min(size - 1, col + dCol)] =
            !next[Math.min(size - 1, row + dRow)][Math.min(size - 1, col + dCol)]
        }
      }
      continue
    }

    if (roll < 0.8) {
      const isRow = random() < 0.5
      const lineIndex = Math.floor(random() * size)
      const start = Math.floor(random() * size)
      const span = 2 + Math.floor(random() * Math.max(2, size / 4))
      const end = Math.min(size, start + span)
      for (let cursor = start; cursor < end; cursor += 1) {
        if (isRow) {
          next[lineIndex][cursor] = !next[lineIndex][cursor]
        } else {
          next[cursor][lineIndex] = !next[cursor][lineIndex]
        }
      }
      continue
    }

    if (roll < 0.92) {
      stampEllipse(next, random, random() < 0.7)
      continue
    }

    const row = Math.floor(random() * size)
    const col = Math.floor(random() * size)
    next[row][col] = template[row][col]
  }

  if (random() < 0.4) {
    return smoothGrid(next, random)
  }

  return next
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

function boardSignature(grid: boolean[][]): string {
  return grid.map((row) => row.map((cell) => (cell ? '1' : '0')).join('')).join('|')
}

function countFilledNeighbors(grid: boolean[][], row: number, col: number): number {
  let total = 0
  for (let dRow = -1; dRow <= 1; dRow += 1) {
    for (let dCol = -1; dCol <= 1; dCol += 1) {
      if (dRow === 0 && dCol === 0) {
        continue
      }
      const nextRow = row + dRow
      const nextCol = col + dCol
      if (
        nextRow < 0 ||
        nextRow >= grid.length ||
        nextCol < 0 ||
        nextCol >= grid.length
      ) {
        continue
      }
      if (grid[nextRow][nextCol]) {
        total += 1
      }
    }
  }
  return total
}

function getFilledComponentSizes(grid: boolean[][]): number[] {
  const size = grid.length
  const visited = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  )
  const components: number[] = []

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!grid[row][col] || visited[row][col]) {
        continue
      }

      let componentSize = 0
      const queue: Array<[number, number]> = [[row, col]]
      visited[row][col] = true

      while (queue.length > 0) {
        const [currentRow, currentCol] = queue.shift() as [number, number]
        componentSize += 1
        for (const [dRow, dCol] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nextRow = currentRow + dRow
          const nextCol = currentCol + dCol
          if (
            nextRow < 0 ||
            nextRow >= size ||
            nextCol < 0 ||
            nextCol >= size ||
            visited[nextRow][nextCol] ||
            !grid[nextRow][nextCol]
          ) {
            continue
          }
          visited[nextRow][nextCol] = true
          queue.push([nextRow, nextCol])
        }
      }

      components.push(componentSize)
    }
  }

  return components.sort((left, right) => right - left)
}

function scoreFilledBalance(grid: boolean[][], profile: TierProfile): number {
  const ratio = countFilledCells(grid) / (grid.length * grid.length)
  return clamp(1 - Math.abs(ratio - profile.fillRatio) / 0.22, 0, 1)
}

function scoreComponentQuality(
  grid: boolean[][],
  tier: DifficultyTier,
): number {
  const filledCells = countFilledCells(grid)
  if (filledCells === 0) {
    return 0
  }

  const componentSizes = getFilledComponentSizes(grid)
  const largestRatio = componentSizes[0] / filledCells
  const tinyRatio =
    componentSizes.filter((size) => size <= 2).reduce((sum, size) => sum + size, 0) / filledCells
  const preferredComponents = tier <= 2 ? 1.6 : tier <= 4 ? 2.8 : 3.8
  const componentScore = clamp(1 - Math.abs(componentSizes.length - preferredComponents) * 0.18, 0, 1)

  return clamp(
    largestRatio * 0.6 + (1 - tinyRatio) * 0.35 + componentScore * 0.45,
    0,
    1.4,
  )
}

function scoreNoiseResistance(grid: boolean[][]): number {
  const filledCells = countFilledCells(grid)
  if (filledCells === 0) {
    return 0
  }

  let noisyCells = 0
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid.length; col += 1) {
      if (!grid[row][col]) {
        continue
      }
      if (countFilledNeighbors(grid, row, col) <= 1) {
        noisyCells += 1
      }
    }
  }

  return clamp(1 - noisyCells / filledCells, 0, 1)
}

function scoreClueRhythm(clues: PuzzleClues): number {
  const lines = [...clues.rows, ...clues.cols]
  const runCounts = lines.map((clue) => (clue.length === 1 && clue[0] === 0 ? 0 : clue.length))
  const fillCounts = lines.map((clue) => (clue.length === 1 && clue[0] === 0 ? 0 : clue.reduce((sum, value) => sum + value, 0)))
  const distinctSignatures = new Set(lines.map((clue) => clue.join(','))).size
  const avgRuns = average(runCounts)
  const avgFill = average(fillCounts)
  const variance = average(runCounts.map((count) => (count - avgRuns) ** 2))

  return clamp(
    clamp(avgRuns / 3.2, 0, 1) * 0.4 +
      clamp(variance / 2.6, 0, 1) * 0.3 +
      clamp(distinctSignatures / Math.max(4, lines.length * 0.4), 0, 1) * 0.2 +
      clamp(avgFill / Math.max(1, lines.length * 0.25), 0, 1) * 0.1,
    0,
    1.2,
  )
}

function scoreSymmetryNovelty(
  grid: boolean[][],
  profile: TierProfile,
  tier: DifficultyTier,
): number {
  const distance = minSymmetryDistance(grid)
  if (tier <= 2) {
    return clamp(1 - Math.abs(distance - 0.08) / 0.2, 0, 1)
  }
  return clamp((distance - profile.symmetryFloor + 0.08) / 0.18, 0, 1.2)
}

function scoreRevelationCurve(
  assessment: DifficultyAssessment,
  profile: TierProfile,
): number {
  return clamp(
    1 - Math.abs(assessment.features.revelationBalance - profile.targetRevealBalance) / 0.35,
    0,
    1,
  )
}

function scoreExactDifficultyProxy(
  exactResult: ExactSolveResult,
  tier: DifficultyTier,
  size: number,
): number {
  let score = 0
  const roughTier = scoreDifficulty(exactResult.trace, size)
  score -= Math.abs(roughTier - tier) * 0.75

  if (tier >= 5 && exactResult.trace.usedPhase3) {
    score += 0.9
  }
  if (tier >= 4 && exactResult.trace.usedPhase2) {
    score += 0.4
  }
  if (tier <= 2 && exactResult.trace.usedPhase3) {
    score -= 1.2
  }

  score += Math.min(1.1, Math.log2(exactResult.trace.branchNodes + 1) * 0.28)
  return score
}

function computeBaseFunScore(
  grid: boolean[][],
  clues: PuzzleClues,
  profile: TierProfile,
  tier: DifficultyTier,
): number {
  const filledBalance = scoreFilledBalance(grid, profile)
  const componentQuality = scoreComponentQuality(grid, tier)
  const noiseResistance = scoreNoiseResistance(grid)
  const clueRhythm = scoreClueRhythm(clues)
  const symmetryNovelty = scoreSymmetryNovelty(grid, profile, tier)

  return (
    filledBalance * 1.2 +
    componentQuality * 1.6 +
    noiseResistance * 0.9 +
    clueRhythm * 1.2 +
    symmetryNovelty * 0.8
  )
}

function makePuzzle(
  tier: DifficultyTier,
  size: number,
  seed: number,
  grid: boolean[][],
  clues: PuzzleClues,
): PuzzleDefinition {
  return {
    id: `tier-${tier}-${seed}-${boardSignature(grid).slice(0, 24)}`,
    seed,
    size,
    tier,
    solution: grid,
    clues,
  }
}

function compareEvaluations(left: CandidateEvaluation, right: CandidateEvaluation): number {
  if (right.objective !== left.objective) {
    return right.objective - left.objective
  }
  if (right.funScore !== left.funScore) {
    return right.funScore - left.funScore
  }
  return left.signature.localeCompare(right.signature)
}

function createSeedGrid(
  tier: DifficultyTier,
  profile: TierProfile,
  random: () => number,
): boolean[][] {
  if (tier === 1) {
    return random() < 0.8
      ? generateVeryEasyGrid(profile, random)
      : generateEasyGrid(profile, random)
  }
  if (tier === 2 && random() < 0.45) {
    return generateEasyGrid(profile, random)
  }
  if (tier === 3 && random() < 0.3) {
    return generateEasyGrid(profile, random)
  }
  if (random() < 0.3) {
    return mutateTemplate(getTemplateBySize(profile.size), random)
  }
  if (random() < 0.65) {
    return generateBlobGrid(profile, random)
  }
  return generateRandomGrid(profile, random)
}

function screenCandidate(
  grid: boolean[][],
  tier: DifficultyTier,
  profile: TierProfile,
  candidateSeed: number,
): ScreenedCandidate | null {
  const signature = boardSignature(grid)
  const clues = extractClues(grid)
  const exactResult = solvePuzzle(clues, {
    estimateGuaranteedLives: tier >= 5,
  })

  if (!exactResult.solved || !exactResult.unique || !exactResult.solution) {
    return null
  }
  if (!sameGrid(exactResult.solution, grid)) {
    return null
  }

  const baseFunScore = computeBaseFunScore(grid, clues, profile, tier)
  const exactProxy = scoreExactDifficultyProxy(exactResult, tier, profile.size)
  const symmetryDistance = minSymmetryDistance(grid)

  if (tier >= 3 && symmetryDistance < profile.symmetryFloor) {
    return null
  }

  return {
    grid,
    signature,
    clues,
    exactTier: scoreDifficulty(exactResult.trace, profile.size),
    exactBranchNodes: exactResult.trace.branchNodes,
    baseFunScore,
    screenScore: baseFunScore + exactProxy,
    candidateSeed,
  }
}

function evaluateCandidate(
  screened: ScreenedCandidate,
  tier: DifficultyTier,
  profile: TierProfile,
): CandidateEvaluation {
  const assessment = assessPuzzleDifficultyV2(screened.clues, profile.size)
  const revelationScore = scoreRevelationCurve(assessment, profile)
  const branchBonus = Math.min(1, Math.log2(screened.exactBranchNodes + 1) * 0.25)
  const funScore = screened.baseFunScore + revelationScore * 0.9 + branchBonus * 0.35

  let objective = funScore
  objective -= Math.abs(assessment.tier - tier) * 4.2
  objective -= Math.abs(assessment.score - profile.targetScore) * 1.2
  objective -= Math.abs(screened.exactTier - tier) * 0.5

  if (tier === 1 && (assessment.features.probeCount > 0 || assessment.features.guessCount > 0)) {
    objective -= 2.5
  }
  if (tier === 2 && assessment.features.guessCount > 0) {
    objective -= 2.2
  }
  if (tier === 5 && assessment.features.probeCount === 0) {
    objective -= 1.4
  }
  if (tier === 6 && assessment.features.guessCount === 0) {
    objective -= 2.3
  }
  if (tier >= 5 && assessment.features.backtrackCount > 0) {
    objective += 0.45
  }
  if (assessment.features.strongestRule === 'line-completion' && tier >= 3) {
    objective -= 2
  }

  const puzzle = makePuzzle(tier, profile.size, screened.candidateSeed, screened.grid, screened.clues)
  return {
    puzzle,
    assessment,
    objective,
    funScore,
    signature: screened.signature,
  }
}

function createVariants(
  base: boolean[][],
  tier: DifficultyTier,
  profile: TierProfile,
  roundSeed: number,
): boolean[][][] {
  const random = mulberry32(roundSeed)
  const template = mutateTemplate(getTemplateBySize(profile.size), random)
  const variants: boolean[][][] = []

  variants.push(base)
  variants.push(mutateGrid(base, template, random, profile.mutationEdits))
  variants.push(mutateGrid(base, template, random, profile.mutationEdits + 1))
  variants.push(smoothGrid(mutateGrid(base, template, random, Math.max(1, profile.mutationEdits - 1)), random))

  if (tier >= 3) {
    variants.push(mutateGrid(template, template, random, profile.mutationEdits + 1))
  }

  if (random() < 0.55) {
    variants.push(createSeedGrid(tier, profile, random))
  }

  return variants
}

function pickBestAcceptable(
  candidates: CandidateEvaluation[],
  tier: DifficultyTier,
  profile: TierProfile,
): CandidateEvaluation | null {
  for (const candidate of candidates) {
    if (candidate.assessment.tier !== tier) {
      continue
    }
    if (candidate.funScore < profile.minimumFunScore) {
      continue
    }
    return candidate
  }
  return null
}

export function generatePuzzle(
  tier: DifficultyTier,
  seed = Math.floor(Math.random() * 1_000_000_000),
): PuzzleDefinition | null {
  const cacheKey = `${tier}|${seed}`
  const cached = generatedPuzzleCache.get(cacheKey)
  if (cached !== undefined) {
    return clonePuzzle(cached)
  }

  const profile = TIER_PROFILES[tier]
  const screenedCache = new Map<string, ScreenedCandidate | null>()
  const evaluationCache = new Map<string, CandidateEvaluation>()

  const getScreenedCandidate = (
    grid: boolean[][],
    candidateSeed: number,
  ): ScreenedCandidate | null => {
    const signature = boardSignature(grid)
    const cached = screenedCache.get(signature)
    if (cached !== undefined) {
      return cached
    }
    const screened = screenCandidate(grid, tier, profile, candidateSeed)
    screenedCache.set(signature, screened)
    return screened
  }

  const getEvaluatedCandidate = (
    screened: ScreenedCandidate,
  ): CandidateEvaluation => {
    const cached = evaluationCache.get(screened.signature)
    if (cached) {
      return cached
    }
    const evaluated = evaluateCandidate(screened, tier, profile)
    evaluationCache.set(screened.signature, evaluated)
    return evaluated
  }

  let beam = Array.from({ length: profile.beamWidth }, (_, index) => {
    const random = mulberry32(seed + index * 1_009)
    return createSeedGrid(tier, profile, random)
  })

  let bestOverall: CandidateEvaluation | null = null
  let bestExactMatch: CandidateEvaluation | null = null

  for (let round = 0; round < profile.rounds; round += 1) {
    const screenedPool: ScreenedCandidate[] = []
    const seenThisRound = new Set<string>()

    for (let beamIndex = 0; beamIndex < beam.length; beamIndex += 1) {
      const base = beam[beamIndex]
      const roundBaseSeed = seed + round * 65_537 + beamIndex * 8_191
      const variants = createVariants(base, tier, profile, roundBaseSeed)

      for (let variantIndex = 0; variantIndex < variants.length; variantIndex += 1) {
        const variant = variants[variantIndex]
        const candidateSeed = roundBaseSeed + variantIndex * 421
        const signature = boardSignature(variant)
        if (seenThisRound.has(signature)) {
          continue
        }
        seenThisRound.add(signature)
        const screened = getScreenedCandidate(variant, candidateSeed)
        if (screened) {
          screenedPool.push(screened)
        }
      }
    }

    for (let freshIndex = 0; freshIndex < profile.freshCandidates; freshIndex += 1) {
      const freshSeed = seed + 1_000_003 + round * 104_729 + freshIndex * 409
      const random = mulberry32(freshSeed)
      const freshGrid = createSeedGrid(tier, profile, random)
      const signature = boardSignature(freshGrid)
      if (seenThisRound.has(signature)) {
        continue
      }
      seenThisRound.add(signature)
      const screened = getScreenedCandidate(freshGrid, freshSeed)
      if (screened) {
        screenedPool.push(screened)
      }
    }

    screenedPool.sort((left, right) =>
      right.screenScore - left.screenScore || left.signature.localeCompare(right.signature),
    )

    const shortlisted = screenedPool.slice(0, profile.shortlistSize).map(getEvaluatedCandidate)
    shortlisted.sort(compareEvaluations)

    if (shortlisted.length > 0) {
      const top = shortlisted[0]
      if (!bestOverall || compareEvaluations(top, bestOverall) < 0) {
        bestOverall = top
      }
    }

    const exactMatch = pickBestAcceptable(shortlisted, tier, profile)
    if (exactMatch && (!bestExactMatch || compareEvaluations(exactMatch, bestExactMatch) < 0)) {
      bestExactMatch = exactMatch
    }
    if (bestExactMatch) {
      generatedPuzzleCache.set(cacheKey, bestExactMatch.puzzle)
      return clonePuzzle(bestExactMatch.puzzle)
    }

    beam = shortlisted.slice(0, profile.beamWidth).map((candidate) => candidate.puzzle.solution)
    if (beam.length === 0) {
      beam = Array.from({ length: profile.beamWidth }, (_, index) => {
        const random = mulberry32(seed + round * 17_123 + index * 911)
        return createSeedGrid(tier, profile, random)
      })
    }
  }

  const result = bestOverall?.puzzle ?? null
  generatedPuzzleCache.set(cacheKey, result)
  return clonePuzzle(result)
}
