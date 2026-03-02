import {
  applyLineAutoCompletion,
  isLineConsistentWithSolution,
} from '@/core/line-solver'
import type { CellState } from '@/core/types'

describe('line-solver', () => {
  it('applies rule 1 when filled count reaches clue total', () => {
    const line: CellState[] = ['filled', 'filled', 'filled', 'unknown', 'unknown']
    const result = applyLineAutoCompletion({
      line,
      solution: [true, true, true, false, false],
      clue: [3],
    })
    expect(result).toEqual([
      { index: 3, newState: 'marked-empty' },
      { index: 4, newState: 'marked-empty' },
    ])
  })

  it('applies rule 2 when empty count reaches N-S', () => {
    const line: CellState[] = [
      'marked-empty',
      'unknown',
      'marked-empty',
      'unknown',
      'unknown',
    ]
    const result = applyLineAutoCompletion({
      line,
      solution: [false, true, false, true, true],
      clue: [3],
    })
    expect(result).toEqual([
      { index: 1, newState: 'filled' },
      { index: 3, newState: 'filled' },
      { index: 4, newState: 'filled' },
    ])
  })

  it('does not auto-complete if the line is contradictory', () => {
    const result = applyLineAutoCompletion({
      line: ['filled', 'filled', 'filled', 'unknown', 'unknown'],
      solution: [true, false, true, false, false],
      clue: [3],
    })
    expect(result).toEqual([])
    expect(
      isLineConsistentWithSolution(
        ['filled', 'filled', 'filled', 'unknown', 'unknown'],
        [true, false, true, false, false],
      ),
    ).toBe(false)
  })

  it('returns empty changes when all cells are already known', () => {
    const result = applyLineAutoCompletion({
      line: ['filled', 'marked-empty', 'filled', 'marked-empty', 'marked-empty'],
      solution: [true, false, true, false, false],
      clue: [1, 1],
    })
    expect(result).toEqual([])
  })

  it('handles empty clue [0]', () => {
    const result = applyLineAutoCompletion({
      line: ['unknown', 'unknown', 'unknown', 'unknown', 'unknown'],
      solution: [false, false, false, false, false],
      clue: [0],
    })
    expect(result).toEqual([
      { index: 0, newState: 'marked-empty' },
      { index: 1, newState: 'marked-empty' },
      { index: 2, newState: 'marked-empty' },
      { index: 3, newState: 'marked-empty' },
      { index: 4, newState: 'marked-empty' },
    ])
  })

  it('handles full clue [N]', () => {
    const result = applyLineAutoCompletion({
      line: ['unknown', 'unknown', 'unknown', 'unknown', 'unknown'],
      solution: [true, true, true, true, true],
      clue: [5],
    })
    expect(result).toEqual([
      { index: 0, newState: 'filled' },
      { index: 1, newState: 'filled' },
      { index: 2, newState: 'filled' },
      { index: 3, newState: 'filled' },
      { index: 4, newState: 'filled' },
    ])
  })

  it('does not trigger when neither rule is satisfied', () => {
    const result = applyLineAutoCompletion({
      line: ['filled', 'unknown', 'unknown', 'unknown', 'unknown'],
      solution: [true, true, false, true, false],
      clue: [3],
    })
    expect(result).toEqual([])
  })

  it('supports multi-run clues by total count', () => {
    const line: CellState[] = [
      'filled',
      'unknown',
      'filled',
      'unknown',
      'filled',
      'unknown',
      'filled',
      'unknown',
      'filled',
      'unknown',
    ]
    const result = applyLineAutoCompletion({
      line,
      solution: [true, false, true, false, true, false, true, false, true, false],
      clue: [2, 3],
    })
    expect(result).toEqual([
      { index: 1, newState: 'marked-empty' },
      { index: 3, newState: 'marked-empty' },
      { index: 5, newState: 'marked-empty' },
      { index: 7, newState: 'marked-empty' },
      { index: 9, newState: 'marked-empty' },
    ])
  })
})
