import { solvePuzzle } from '@/engine/solver'
import { puzzle5x5, puzzle10x10 } from '@/test-fixtures/puzzles'

describe('solver', () => {
  it('solves a known unique 5x5 puzzle', () => {
    const result = solvePuzzle(puzzle5x5.clues)
    expect(result.solved).toBe(true)
    expect(result.unique).toBe(true)
    expect(result.solution).toEqual(puzzle5x5.solution)
  })

  it('detects non-unique puzzles', () => {
    const result = solvePuzzle({
      rows: [[1], [1]],
      cols: [[1], [1]],
    })
    expect(result.solved).toBe(true)
    expect(result.unique).toBe(false)
  })

  it('solves empty grid clues as a unique empty solution', () => {
    const result = solvePuzzle({
      rows: [[0], [0], [0]],
      cols: [[0], [0], [0]],
    })
    expect(result.solved).toBe(true)
    expect(result.unique).toBe(true)
    expect(result.solution).toEqual([
      [false, false, false],
      [false, false, false],
      [false, false, false],
    ])
  })

  it('solves full grid clues as a unique full solution', () => {
    const result = solvePuzzle({
      rows: [[3], [3], [3]],
      cols: [[3], [3], [3]],
    })
    expect(result.solved).toBe(true)
    expect(result.unique).toBe(true)
    expect(result.solution).toEqual([
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ])
  })

  it('reports phase1-only trace for simple puzzle', () => {
    const result = solvePuzzle({
      rows: [[3], [0], [0]],
      cols: [[1], [1], [1]],
    })
    expect(result.solved).toBe(true)
    expect(result.trace.usedPhase1).toBe(true)
    expect(result.trace.usedPhase2).toBe(false)
  })

  it('uses phase2 overlap on overlap-driven puzzle', () => {
    const result = solvePuzzle(puzzle10x10.clues)
    expect(result.solved).toBe(true)
    expect(result.trace.usedPhase2 || result.trace.usedPhase3).toBe(true)
  })

  it('matches ground truth solution for known fixture', () => {
    const result = solvePuzzle(puzzle10x10.clues)
    expect(result.solved).toBe(true)
    expect(result.solution).toEqual(puzzle10x10.solution)
  })
})
