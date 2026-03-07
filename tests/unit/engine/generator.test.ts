import { generatePuzzle } from '@/engine/generator'
import { assessPuzzleDifficultyV2 } from '@/engine/difficulty-v2'
import { solvePuzzle } from '@/engine/solver'

function flipHorizontal(grid: boolean[][]): boolean[][] {
  return grid.map((row) => [...row].reverse())
}

function flipVertical(grid: boolean[][]): boolean[][] {
  return [...grid].reverse().map((row) => [...row])
}

function rotate180(grid: boolean[][]): boolean[][] {
  return [...grid].reverse().map((row) => [...row].reverse())
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

function minSymmetryDistance(grid: boolean[][]): number {
  return Math.min(
    gridDifferenceRatio(grid, flipHorizontal(grid)),
    gridDifferenceRatio(grid, flipVertical(grid)),
    gridDifferenceRatio(grid, rotate180(grid)),
  )
}

describe('generator', () => {
  it('generates a valid D1 puzzle that matches the v2 difficulty model', () => {
    const puzzle = generatePuzzle(1, 1)
    expect(puzzle).not.toBeNull()
    expect(puzzle?.size).toBe(10)
    const solved = solvePuzzle(puzzle!.clues)
    expect(solved.solved).toBe(true)
    expect(solved.unique).toBe(true)
    const assessment = assessPuzzleDifficultyV2(puzzle!.clues, puzzle!.size)
    expect(assessment.tier).toBe(1)
  })

  it('generates a valid D3 puzzle that matches the v2 difficulty model', () => {
    const puzzle = generatePuzzle(3, 303)
    expect(puzzle).not.toBeNull()
    expect(puzzle?.size).toBe(15)
    const solved = solvePuzzle(puzzle!.clues)
    expect(solved.solved).toBe(true)
    expect(solved.unique).toBe(true)
    const assessment = assessPuzzleDifficultyV2(puzzle!.clues, puzzle!.size)
    expect(assessment.tier).toBe(3)
  })

  it('generates a valid D5 puzzle that matches the v2 difficulty model', () => {
    const puzzle = generatePuzzle(5, 505)
    expect(puzzle).not.toBeNull()
    expect(puzzle?.size).toBe(15)
    const solved = solvePuzzle(puzzle!.clues)
    expect(solved.solved).toBe(true)
    expect(solved.unique).toBe(true)
    const assessment = assessPuzzleDifficultyV2(puzzle!.clues, puzzle!.size)
    expect(assessment.tier).toBe(5)
    expect(assessment.features.probeCount).toBeGreaterThan(0)
  }, 15_000)

  it('generates a valid D6 puzzle with sustained hard reasoning', () => {
    const puzzle = generatePuzzle(6, 2)
    expect(puzzle).not.toBeNull()
    expect(puzzle?.size).toBe(15)
    const solved = solvePuzzle(puzzle!.clues)
    expect(solved.solved).toBe(true)
    expect(solved.unique).toBe(true)
    const assessment = assessPuzzleDifficultyV2(puzzle!.clues, puzzle!.size)
    expect(assessment.tier).toBe(6)
    expect(
      assessment.features.guessCount > 0 || assessment.features.probeCount >= 10,
    ).toBe(true)
  }, 20_000)

  it('returns deterministic output for the same seed', () => {
    const first = generatePuzzle(2, 2026)
    const second = generatePuzzle(2, 2026)
    expect(first).toEqual(second)
  })

  it('passes clue-to-solver reverse validation', () => {
    const puzzle = generatePuzzle(4, 4040)
    expect(puzzle).not.toBeNull()
    const solved = solvePuzzle(puzzle!.clues)
    expect(solved.solved).toBe(true)
    expect(solved.solution).toEqual(puzzle!.solution)
    const assessment = assessPuzzleDifficultyV2(puzzle!.clues, puzzle!.size)
    expect(assessment.tier).toBe(4)
  }, 15_000)

  it('keeps higher tiers away from near-perfect symmetry', () => {
    const targets = {
      3: 0.08,
      4: 0.12,
      5: 0.16,
      6: 0.18,
    } as const

    const samples = [
      { tier: 3 as const, seed: 303 },
      { tier: 4 as const, seed: 4040 },
      { tier: 5 as const, seed: 505 },
      { tier: 6 as const, seed: 2 },
    ]

    for (const { tier, seed } of samples) {
      const puzzle = generatePuzzle(tier, seed)
      expect(puzzle).not.toBeNull()
      const distance = minSymmetryDistance(puzzle!.solution)
      expect(distance).toBeGreaterThanOrEqual(targets[tier])
    }
  }, 30_000)
})
