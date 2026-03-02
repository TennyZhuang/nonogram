import { generatePuzzle } from '@/engine/generator'
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
  it('generates a valid D1 puzzle with unique solution', () => {
    const puzzle = generatePuzzle(1, 101)
    expect(puzzle).not.toBeNull()
    expect(puzzle?.size).toBe(10)
    const solved = solvePuzzle(puzzle!.clues)
    expect(solved.solved).toBe(true)
    expect(solved.unique).toBe(true)
  })

  it('generates a valid D3 puzzle with unique solution', () => {
    const puzzle = generatePuzzle(3, 303)
    expect(puzzle).not.toBeNull()
    expect(puzzle?.size).toBe(15)
    const solved = solvePuzzle(puzzle!.clues)
    expect(solved.solved).toBe(true)
    expect(solved.unique).toBe(true)
  })

  it('generates a valid D5 puzzle with unique solution', () => {
    const puzzle = generatePuzzle(5, 505)
    expect(puzzle).not.toBeNull()
    expect(puzzle?.size).toBe(15)
    const solved = solvePuzzle(puzzle!.clues)
    expect(solved.solved).toBe(true)
    expect(solved.unique).toBe(true)
  })

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
  })

  it('keeps high-tier boards away from near-perfect symmetry', () => {
    const targets = {
      3: 0.12,
      4: 0.16,
      5: 0.2,
    } as const

    const samples = [
      { tier: 3 as const, seeds: [303] },
      { tier: 4 as const, seeds: [4040] },
      { tier: 5 as const, seeds: [505] },
    ]

    for (const { tier, seeds } of samples) {
      for (const seed of seeds) {
        const puzzle = generatePuzzle(tier, seed)
        expect(puzzle).not.toBeNull()
        const distance = minSymmetryDistance(puzzle!.solution)
        expect(distance).toBeGreaterThanOrEqual(targets[tier])
      }
    }
  })
})
