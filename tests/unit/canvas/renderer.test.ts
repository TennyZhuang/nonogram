import { collectResolvedSegmentBoundaryCells } from '@/canvas/renderer'
import type { Board, PuzzleClues } from '@/core/types'

const solution = [
  [false, true, true, false, false],
  [false, true, false, false, false],
  [false, false, false, false, false],
  [false, false, false, false, false],
  [false, false, false, false, false],
]

const clues: PuzzleClues = {
  rows: [[2], [1], [0], [0], [0]],
  cols: [[0], [2], [1], [0], [0]],
}

function createUnknownBoard(): Board {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => 'unknown' as const),
  )
}

describe('collectResolvedSegmentBoundaryCells', () => {
  it('collects unknown neighbors around resolved row segments on the active clue line', () => {
    const board = createUnknownBoard()
    board[0][1] = 'filled'
    board[0][2] = 'filled'

    expect(
      collectResolvedSegmentBoundaryCells({
        board,
        solution,
        clues,
        activeCells: [{ row: 0, col: 1 }],
      }),
    ).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 3 },
    ])
  })

  it('includes column-side neighbors when the active column clue segment is resolved', () => {
    const board = createUnknownBoard()
    board[0][1] = 'filled'
    board[0][2] = 'filled'
    board[1][1] = 'filled'

    expect(
      collectResolvedSegmentBoundaryCells({
        board,
        solution,
        clues,
        activeCells: [{ row: 0, col: 1 }],
      }),
    ).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 3 },
      { row: 2, col: 1 },
    ])
  })

  it('collects boundary marks for every touched clue line in a single swipe', () => {
    const board = createUnknownBoard()
    board[0][1] = 'filled'
    board[0][2] = 'filled'

    expect(
      collectResolvedSegmentBoundaryCells({
        board,
        solution,
        clues,
        activeCells: [
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
      }),
    ).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 3 },
      { row: 1, col: 2 },
    ])
  })

  it('skips neighbors that are already known cells', () => {
    const board = createUnknownBoard()
    board[0][0] = 'marked-empty'
    board[0][1] = 'filled'
    board[0][2] = 'filled'
    board[0][3] = 'marked-empty'
    board[1][1] = 'filled'

    expect(
      collectResolvedSegmentBoundaryCells({
        board,
        solution,
        clues,
        activeCells: [{ row: 0, col: 1 }],
      }),
    ).toEqual([{ row: 2, col: 1 }])
  })

  it('returns empty when no active clue is highlighted', () => {
    const board = createUnknownBoard()
    board[0][1] = 'filled'
    board[0][2] = 'filled'

    expect(
      collectResolvedSegmentBoundaryCells({
        board,
        solution,
        clues,
        activeCells: [],
      }),
    ).toEqual([])
  })
})
