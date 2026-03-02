import { extractClues } from '@/engine/clue-extractor'
import { puzzle5x5 } from '@/test-fixtures/puzzles'

describe('clue-extractor', () => {
  it('extracts [0] clues for an empty grid', () => {
    const grid = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => false),
    )
    const clues = extractClues(grid)
    expect(clues.rows).toEqual(Array.from({ length: 5 }, () => [0]))
    expect(clues.cols).toEqual(Array.from({ length: 5 }, () => [0]))
  })

  it('extracts [N] clues for a full grid', () => {
    const grid = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => true),
    )
    const clues = extractClues(grid)
    expect(clues.rows).toEqual([[4], [4], [4], [4]])
    expect(clues.cols).toEqual([[4], [4], [4], [4]])
  })

  it('matches the known 5x5 fixture clues', () => {
    const clues = extractClues(puzzle5x5.solution)
    expect(clues).toEqual(puzzle5x5.clues)
  })

  it('keeps symmetric row/column clues for symmetric grids', () => {
    const grid = [
      [false, true, true, true, false],
      [true, false, false, false, true],
      [true, false, true, false, true],
      [true, false, false, false, true],
      [false, true, true, true, false],
    ]
    const clues = extractClues(grid)
    expect(clues.rows).toEqual(clues.cols)
  })
})
