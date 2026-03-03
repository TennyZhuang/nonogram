import {
  resolveClueProgress,
  resolveLineClueSegments,
  resolveLineClues,
} from '@/canvas/clue-progress'
import type { Board, CellState, PuzzleClues } from '@/core/types'

describe('clue-progress', () => {
  it('marks each clue as resolved once all cells in that solution run are filled', () => {
    const line: CellState[] = [
      'revealed-filled',
      'filled',
      'marked-empty',
      'filled',
      'revealed-filled',
      'filled',
      'unknown',
    ]
    const solutionLine = [true, true, false, true, true, true, false]

    expect(resolveLineClues(line, solutionLine, [2, 3])).toEqual([true, true])
  })

  it('keeps a clue unresolved until every cell in its run is filled', () => {
    const line: CellState[] = ['filled', 'unknown', 'marked-empty']
    const solutionLine = [true, true, false]

    expect(resolveLineClues(line, solutionLine, [2])).toEqual([false])
  })

  it('resolves the zero clue only when the entire line is confirmed empty', () => {
    const resolvedLine: CellState[] = ['marked-empty', 'revealed-empty']
    const unresolvedLine: CellState[] = ['marked-empty', 'unknown']
    const solutionLine = [false, false]

    expect(resolveLineClues(resolvedLine, solutionLine, [0])).toEqual([true])
    expect(resolveLineClues(unresolvedLine, solutionLine, [0])).toEqual([false])
  })

  it('computes row and column clue progress for the whole board', () => {
    const board: Board = [
      ['filled', 'marked-empty', 'revealed-filled'],
      ['unknown', 'marked-empty', 'unknown'],
      ['marked-empty', 'filled', 'marked-empty'],
    ]
    const solution = [
      [true, false, true],
      [true, false, false],
      [false, true, false],
    ]
    const clues: PuzzleClues = {
      rows: [[1, 1], [1], [1]],
      cols: [[2], [1], [1]],
    }

    expect(resolveClueProgress(board, solution, clues)).toEqual({
      rows: [
        [true, true],
        [false],
        [true],
      ],
      cols: [[false], [true], [true]],
    })
  })

  it('returns resolved segment metadata aligned with each clue run', () => {
    const line: CellState[] = [
      'marked-empty',
      'filled',
      'filled',
      'unknown',
      'filled',
      'marked-empty',
    ]
    const solutionLine = [false, true, true, false, true, false]

    expect(resolveLineClueSegments(line, solutionLine, [2, 1])).toEqual([
      { start: 1, length: 2, resolved: true },
      { start: 4, length: 1, resolved: true },
    ])
  })
})
