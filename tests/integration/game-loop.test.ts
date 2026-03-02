import { resetGameStoreForTests, useGameStore } from '@/store/game-store'
import { puzzle5x5, puzzle10x10 } from '@/test-fixtures/puzzles'
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
    id: 'integration-custom',
    seed: 7,
    tier: 2,
    size: solution.length,
    solution,
    clues: extractClues(solution),
  }
}

describe('integration game loop', () => {
  beforeEach(() => {
    resetGameStoreForTests()
  })

  it('reaches cleared state when playing correct solution', () => {
    const store = useGameStore.getState()
    store.startGame(puzzle5x5)

    for (let row = 0; row < puzzle5x5.size; row += 1) {
      for (let col = 0; col < puzzle5x5.size; col += 1) {
        useGameStore.getState().act({
          row,
          col,
          type: puzzle5x5.solution[row][col] ? 'fill' : 'mark-empty',
        })
      }
    }

    expect(useGameStore.getState().game?.status).toBe('cleared')
  })

  it('reaches failed state after three wrong actions', () => {
    const store = useGameStore.getState()
    store.startGame(puzzle5x5)

    store.act({ row: 0, col: 2, type: 'fill' })
    store.act({ row: 0, col: 4, type: 'fill' })
    store.act({ row: 3, col: 0, type: 'fill' })

    expect(useGameStore.getState().game?.status).toBe('failed')
    expect(useGameStore.getState().game?.livesRemaining).toBe(0)
  })

  it('applies auto-completion after a triggering action', () => {
    const store = useGameStore.getState()
    store.startGame(puzzle5x5)

    store.act({ row: 0, col: 0, type: 'fill' })
    store.act({ row: 0, col: 1, type: 'fill' })
    store.act({ row: 0, col: 3, type: 'fill' })

    const board = useGameStore.getState().game?.board
    expect(board?.[0][2]).toBe('marked-empty')
    expect(board?.[0][4]).toBe('marked-empty')
  })

  it('batch action stops at first wrong cell', () => {
    const puzzle = createPuzzle([
      [true, true, false, true, false],
      [true, false, false, false, true],
      [false, true, true, false, false],
      [false, false, true, true, false],
      [true, false, false, true, true],
    ])

    const store = useGameStore.getState()
    store.startGame(puzzle)
    store.setMode('fill')
    store.batchAct([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ])

    const game = useGameStore.getState().game
    expect(game?.board[0][0]).toBe('filled')
    expect(game?.board[0][1]).toBe('filled')
    expect(game?.board[0][2]).toBe('revealed-empty')
    expect(game?.board[0][3]).toBe('unknown')
    expect(game?.livesRemaining).toBe(2)
  })

  it('switchPuzzle resets to a new playable puzzle', () => {
    const store = useGameStore.getState()
    store.startGame(puzzle5x5)
    store.act({ row: 0, col: 2, type: 'fill' })
    store.act({ row: 0, col: 4, type: 'fill' })
    store.act({ row: 3, col: 0, type: 'fill' })
    expect(useGameStore.getState().game?.status).toBe('failed')

    store.switchPuzzle(puzzle10x10)

    const next = useGameStore.getState()
    expect(next.currentPuzzle?.id).toBe(puzzle10x10.id)
    expect(next.game?.status).toBe('playing')
    expect(next.game?.board[0][0]).toBe('unknown')
  })

  it('restart resets current puzzle after failure', () => {
    const store = useGameStore.getState()
    store.startGame(puzzle5x5)
    store.act({ row: 0, col: 2, type: 'fill' })
    store.act({ row: 0, col: 4, type: 'fill' })
    store.act({ row: 3, col: 0, type: 'fill' })
    expect(useGameStore.getState().game?.status).toBe('failed')

    store.restart()

    const next = useGameStore.getState()
    expect(next.currentPuzzle?.id).toBe(puzzle5x5.id)
    expect(next.game?.status).toBe('playing')
    expect(next.game?.board.every((row) => row.every((cell) => cell === 'unknown'))).toBe(
      true,
    )
  })
})
