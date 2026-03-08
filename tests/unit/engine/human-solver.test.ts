import { solvePuzzleHuman } from '@/engine/human-solver'
import { puzzle5x5, puzzle15x15 } from '@/test-fixtures/puzzles'

describe('human solver', () => {
  it('solves a simple puzzle using only line-completion reasoning', () => {
    const result = solvePuzzleHuman({
      rows: [[3], [0], [0]],
      cols: [[1], [1], [1]],
    })

    expect(result.solved).toBe(true)
    expect(result.solution).toEqual([
      [true, true, true],
      [false, false, false],
      [false, false, false],
    ])
    expect(result.trace.summary.strongestRule).toBe('line-completion')
    expect(result.trace.summary.totalGuesses).toBe(0)
    expect(result.trace.summary.totalProbes).toBe(0)
  })

  it('solves the 5x5 fixture without guessing and records overlap steps', () => {
    const result = solvePuzzleHuman(puzzle5x5.clues, {
      allowGuessing: false,
      enableProbing: false,
    })

    expect(result.solved).toBe(true)
    expect(result.solution).toEqual(puzzle5x5.solution)
    expect(result.trace.summary.strongestRule).toBe('overlap-consensus')
    expect(result.trace.summary.totalGuesses).toBe(0)
    expect(result.trace.steps.some((step) => step.ruleId === 'overlap-consensus')).toBe(true)
  })

  it('escalates to harder reasoning on the 15x15 fixture', () => {
    const result = solvePuzzleHuman(puzzle15x15.clues, {
      allowGuessing: true,
      enableProbing: true,
      maxGuessDepth: 32,
    })

    expect(result.solved).toBe(true)
    expect(result.solution).toEqual(puzzle15x15.solution)
    expect(['single-cell-probe', 'guess']).toContain(result.trace.summary.strongestRule)
    expect(
      result.trace.summary.totalProbes + result.trace.summary.totalGuesses,
    ).toBeGreaterThan(0)
  })
})
