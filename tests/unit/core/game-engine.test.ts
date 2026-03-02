import {
  applyAction,
  applyBatchAction,
  checkWin,
  createGameState,
} from '@/core/game-engine'
import type { PuzzleDefinition } from '@/core/types'

function extractClues(solution: boolean[][]) {
  const size = solution.length
  const rows = solution.map((row) => {
    const runs: number[] = []
    let run = 0
    for (const cell of row) {
      if (cell) {
        run += 1
      } else if (run > 0) {
        runs.push(run)
        run = 0
      }
    }
    if (run > 0) {
      runs.push(run)
    }
    return runs.length > 0 ? runs : [0]
  })

  const cols = Array.from({ length: size }, (_, col) => {
    const runs: number[] = []
    let run = 0
    for (let row = 0; row < size; row += 1) {
      if (solution[row][col]) {
        run += 1
      } else if (run > 0) {
        runs.push(run)
        run = 0
      }
    }
    if (run > 0) {
      runs.push(run)
    }
    return runs.length > 0 ? runs : [0]
  })

  return { rows, cols }
}

function createPuzzle(solution: boolean[][]): PuzzleDefinition {
  return {
    id: 'test-puzzle',
    seed: 42,
    tier: 1,
    size: solution.length,
    solution,
    clues: extractClues(solution),
  }
}

describe('game-engine', () => {
  it('applies correct fill without life loss', () => {
    const puzzle = createPuzzle([[true]])
    const state = createGameState(puzzle)
    const { state: nextState, result } = applyAction(state, {
      type: 'fill',
      row: 0,
      col: 0,
    })

    expect(result.correct).toBe(true)
    expect(nextState.board[0][0]).toBe('filled')
    expect(nextState.livesRemaining).toBe(3)
  })

  it('reveals correct state and consumes life on wrong fill', () => {
    const puzzle = createPuzzle([[false]])
    const state = createGameState(puzzle)
    const { state: nextState, result } = applyAction(state, {
      type: 'fill',
      row: 0,
      col: 0,
    })

    expect(result.correct).toBe(false)
    expect(result.revealed).toBe(true)
    expect(nextState.board[0][0]).toBe('revealed-empty')
    expect(nextState.livesRemaining).toBe(2)
  })

  it('applies correct mark-empty without life loss', () => {
    const puzzle = createPuzzle([[false]])
    const state = createGameState(puzzle)
    const { state: nextState, result } = applyAction(state, {
      type: 'mark-empty',
      row: 0,
      col: 0,
    })

    expect(result.correct).toBe(true)
    expect(nextState.board[0][0]).toBe('marked-empty')
    expect(nextState.livesRemaining).toBe(3)
  })

  it('reveals filled cell on wrong mark-empty and consumes life', () => {
    const puzzle = createPuzzle([[true]])
    const state = createGameState(puzzle)
    const { state: nextState, result } = applyAction(state, {
      type: 'mark-empty',
      row: 0,
      col: 0,
    })

    expect(result.correct).toBe(false)
    expect(nextState.board[0][0]).toBe('revealed-filled')
    expect(nextState.livesRemaining).toBe(2)
  })

  it('marks game failed when lives reach zero', () => {
    const puzzle = createPuzzle([[false]])
    const state = createGameState(puzzle, { lives: 1 })
    const { state: nextState } = applyAction(state, { type: 'fill', row: 0, col: 0 })

    expect(nextState.livesRemaining).toBe(0)
    expect(nextState.status).toBe('failed')
  })

  it('auto-completes directly affected line', () => {
    const puzzle = createPuzzle([
      [true, true, false],
      [false, false, true],
      [true, false, false],
    ])
    const state = createGameState(puzzle)
    const first = applyAction(state, { type: 'fill', row: 0, col: 0 }).state
    const second = applyAction(first, { type: 'fill', row: 0, col: 1 })

    expect(second.result.autoCompleted).toEqual(
      expect.arrayContaining([{ row: 0, col: 2, newState: 'marked-empty' }]),
    )
    expect(second.state.board[0][2]).toBe('marked-empty')
  })

  it('supports cascading auto-completion across row and column', () => {
    const puzzle = createPuzzle([
      [true, true],
      [false, true],
    ])
    const state = createGameState(puzzle)
    const { state: nextState, result } = applyAction(state, {
      type: 'fill',
      row: 0,
      col: 0,
    })

    expect(result.autoCompleted).toHaveLength(3)
    expect(result.autoCompleted).toEqual(
      expect.arrayContaining([
        { row: 1, col: 0, newState: 'marked-empty' },
        { row: 1, col: 1, newState: 'filled' },
        { row: 0, col: 1, newState: 'filled' },
      ]),
    )
    expect(nextState.status).toBe('cleared')
  })

  it('marks game cleared when board matches solution', () => {
    const puzzle = createPuzzle([
      [true, false],
      [false, true],
    ])
    let state = createGameState(puzzle)
    state = applyAction(state, { type: 'fill', row: 0, col: 0 }).state
    state = applyAction(state, { type: 'mark-empty', row: 0, col: 1 }).state
    state = applyAction(state, { type: 'mark-empty', row: 1, col: 0 }).state
    const final = applyAction(state, { type: 'fill', row: 1, col: 1 }).state

    expect(final.status).toBe('cleared')
    expect(checkWin(final.board, puzzle.solution)).toBe(true)
  })

  it('stops batch action at first wrong action', () => {
    const puzzle = createPuzzle([
      [true, true, false, true, false],
      [true, false, false, false, true],
      [false, true, true, false, false],
      [false, false, true, true, false],
      [true, false, false, true, true],
    ])
    const state = createGameState(puzzle)
    const result = applyBatchAction(state, [
      { type: 'fill', row: 0, col: 0 },
      { type: 'fill', row: 0, col: 1 },
      { type: 'fill', row: 0, col: 2 },
      { type: 'fill', row: 0, col: 3 },
      { type: 'fill', row: 0, col: 4 },
    ])

    expect(result.stoppedAt).toBe(2)
    expect(result.results).toHaveLength(3)
    expect(result.state.board[0][0]).toBe('filled')
    expect(result.state.board[0][1]).toBe('filled')
    expect(result.state.board[0][2]).toBe('revealed-empty')
    expect(result.state.board[0][3]).toBe('unknown')
    expect(result.state.board[0][4]).toBe('unknown')
  })

  it('applies all batch actions when all are correct', () => {
    const puzzle = createPuzzle([
      [true, true, false, true, false],
      [true, false, false, false, true],
      [false, true, true, false, false],
      [false, false, true, true, false],
      [true, false, false, true, true],
    ])
    const state = createGameState(puzzle)
    const result = applyBatchAction(state, [
      { type: 'fill', row: 0, col: 0 },
      { type: 'fill', row: 0, col: 1 },
      { type: 'mark-empty', row: 0, col: 2 },
      { type: 'fill', row: 0, col: 3 },
    ])

    expect(result.stoppedAt).toBeNull()
    expect(result.results).toHaveLength(4)
    expect(result.results.every((item) => item.correct)).toBe(true)
    expect(result.state.status).toBe('playing')
  })

  it('ignores actions on already determined cells', () => {
    const puzzle = createPuzzle([[true]])
    const state = createGameState(puzzle)
    const first = applyAction(state, { type: 'fill', row: 0, col: 0 }).state
    const second = applyAction(first, { type: 'fill', row: 0, col: 0 })

    expect(second.result.applied).toBe(false)
    expect(second.state).toBe(first)
  })
})
