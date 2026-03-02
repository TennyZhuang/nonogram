import { generatePuzzle } from '@/engine/generator'
import { solvePuzzle } from '@/engine/solver'

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
})
