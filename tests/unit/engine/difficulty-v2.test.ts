import { scoreDifficultyV2 } from '@/engine/difficulty-v2'
import { solvePuzzleHuman } from '@/engine/human-solver'
import { puzzle5x5, puzzle15x15 } from '@/test-fixtures/puzzles'

describe('difficulty-v2', () => {
  it('rates direct line-completion puzzles as the easiest tier', () => {
    const result = solvePuzzleHuman({
      rows: [[3], [0], [0]],
      cols: [[1], [1], [1]],
    })
    const assessment = scoreDifficultyV2(result.trace, 3)

    expect(assessment.tier).toBe(1)
    expect(assessment.score).toBeGreaterThan(0)
    expect(assessment.rationale[0]).toContain('line-completion')
  })

  it('rates overlap-driven small puzzles above trivial ones', () => {
    const simple = scoreDifficultyV2(
      solvePuzzleHuman({
        rows: [[3], [0], [0]],
        cols: [[1], [1], [1]],
      }).trace,
      3,
    )
    const overlap = scoreDifficultyV2(
      solvePuzzleHuman(puzzle5x5.clues, {
        allowGuessing: false,
        enableProbing: false,
      }).trace,
      puzzle5x5.size,
    )

    expect(overlap.tier).toBe(2)
    expect(overlap.score).toBeGreaterThan(simple.score)
  })

  it('pushes harder 15x15 puzzles into the upper tiers', () => {
    const assessment = scoreDifficultyV2(
      solvePuzzleHuman(puzzle15x15.clues, {
        allowGuessing: true,
        enableProbing: true,
        maxGuessDepth: 32,
      }).trace,
      puzzle15x15.size,
    )

    expect(assessment.tier).toBeGreaterThanOrEqual(5)
    expect(assessment.rationale.length).toBeGreaterThan(0)
  })
})
