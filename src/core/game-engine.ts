import {
  cloneBoard,
  createUnknownBoard,
  isEmptyState,
  isFilledState,
  type Action,
  type ActionResult,
  type AutoCompletedCell,
  type BatchActionResult,
  type Board,
  type GameState,
  type InputMode,
  type PuzzleDefinition,
} from '@/core/types'
import { applyLineAutoCompletion } from '@/core/line-solver'

interface CreateGameStateOptions {
  lives?: number
  livesEnabled?: boolean
  mode?: InputMode
}

type Axis = 'row' | 'col'

interface LineTask {
  axis: Axis
  index: number
}

function isInBounds(board: Board, row: number, col: number): boolean {
  return (
    row >= 0 &&
    row < board.length &&
    col >= 0 &&
    board[row] !== undefined &&
    col < board[row].length
  )
}

function lineTaskKey(task: LineTask): string {
  return `${task.axis}:${task.index}`
}

function collectLine(state: GameState, task: LineTask) {
  const size = state.puzzle.size
  if (task.axis === 'row') {
    return {
      cells: state.board[task.index],
      solution: state.puzzle.solution[task.index],
      clue: state.puzzle.clues.rows[task.index],
      toCoord: (lineIndex: number) => ({ row: task.index, col: lineIndex }),
    }
  }

  const cells = Array.from({ length: size }, (_, row) => state.board[row][task.index])
  const solution = Array.from(
    { length: size },
    (_, row) => state.puzzle.solution[row][task.index],
  )
  return {
    cells,
    solution,
    clue: state.puzzle.clues.cols[task.index],
    toCoord: (lineIndex: number) => ({ row: lineIndex, col: task.index }),
  }
}

function runAutoCompletion(
  state: GameState,
  initialTasks: LineTask[],
): AutoCompletedCell[] {
  const queue: LineTask[] = []
  const queued = new Set<string>()

  for (const task of initialTasks) {
    const key = lineTaskKey(task)
    if (!queued.has(key)) {
      queue.push(task)
      queued.add(key)
    }
  }

  const changes: AutoCompletedCell[] = []

  while (queue.length > 0) {
    const task = queue.shift()
    if (!task) {
      continue
    }
    queued.delete(lineTaskKey(task))

    const line = collectLine(state, task)
    const lineChanges = applyLineAutoCompletion({
      line: line.cells,
      solution: line.solution,
      clue: line.clue,
    })

    for (const change of lineChanges) {
      const coord = line.toCoord(change.index)
      if (state.board[coord.row][coord.col] !== 'unknown') {
        continue
      }
      state.board[coord.row][coord.col] = change.newState
      changes.push({
        row: coord.row,
        col: coord.col,
        newState: change.newState,
      })

      const relatedTasks: LineTask[] = [
        { axis: 'row', index: coord.row },
        { axis: 'col', index: coord.col },
      ]
      for (const relatedTask of relatedTasks) {
        const key = lineTaskKey(relatedTask)
        if (!queued.has(key)) {
          queue.push(relatedTask)
          queued.add(key)
        }
      }
    }
  }

  return changes
}

export function createGameState(
  puzzle: PuzzleDefinition,
  options: CreateGameStateOptions = {},
): GameState {
  const maxLives = options.lives ?? 3
  return {
    puzzle,
    board: createUnknownBoard(puzzle.size),
    status: 'playing',
    livesRemaining: maxLives,
    maxLives,
    livesEnabled: options.livesEnabled ?? true,
    mistakes: 0,
    mode: options.mode ?? 'fill',
  }
}

export function checkWin(board: Board, solution: boolean[][]): boolean {
  for (let row = 0; row < solution.length; row += 1) {
    for (let col = 0; col < solution[row].length; col += 1) {
      if (solution[row][col] && !isFilledState(board[row][col])) {
        return false
      }
      if (!solution[row][col] && !isEmptyState(board[row][col])) {
        return false
      }
    }
  }
  return true
}

function makeNoopResult(state: GameState, action: Action): ActionResult {
  return {
    applied: false,
    correct: true,
    row: action.row,
    col: action.col,
    livesRemaining: state.livesRemaining,
    revealed: false,
    autoCompleted: [],
  }
}

export function applyAction(
  state: GameState,
  action: Action,
): { state: GameState; result: ActionResult } {
  if (state.status !== 'playing') {
    return { state, result: makeNoopResult(state, action) }
  }

  if (!isInBounds(state.board, action.row, action.col)) {
    return { state, result: makeNoopResult(state, action) }
  }

  if (state.board[action.row][action.col] !== 'unknown') {
    return { state, result: makeNoopResult(state, action) }
  }

  const nextState: GameState = {
    ...state,
    board: cloneBoard(state.board),
  }

  const expectedFilled = nextState.puzzle.solution[action.row][action.col]
  const requestedFilled = action.type === 'fill'
  const correct = expectedFilled === requestedFilled
  let revealed = false

  if (correct) {
    nextState.board[action.row][action.col] = requestedFilled ? 'filled' : 'marked-empty'
  } else {
    nextState.board[action.row][action.col] = expectedFilled
      ? 'revealed-filled'
      : 'revealed-empty'
    nextState.mistakes += 1
    revealed = true
    if (nextState.livesEnabled) {
      nextState.livesRemaining -= 1
    }
  }

  const autoCompleted = runAutoCompletion(nextState, [
    { axis: 'row', index: action.row },
    { axis: 'col', index: action.col },
  ])

  if (nextState.livesEnabled && nextState.livesRemaining <= 0) {
    nextState.status = 'failed'
  } else if (checkWin(nextState.board, nextState.puzzle.solution)) {
    nextState.status = 'cleared'
  } else {
    nextState.status = 'playing'
  }

  return {
    state: nextState,
    result: {
      applied: true,
      correct,
      row: action.row,
      col: action.col,
      livesRemaining: nextState.livesRemaining,
      revealed,
      autoCompleted,
    },
  }
}

export function applyBatchAction(
  state: GameState,
  actions: Action[],
): BatchActionResult {
  let current = state
  const results: ActionResult[] = []
  let stoppedAt: number | null = null

  for (let index = 0; index < actions.length; index += 1) {
    const { state: nextState, result } = applyAction(current, actions[index])
    results.push(result)
    current = nextState

    if (result.applied && !result.correct) {
      stoppedAt = index
      break
    }

    if (current.status !== 'playing') {
      break
    }
  }

  return { state: current, results, stoppedAt }
}
