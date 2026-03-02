export type CellState =
  | 'unknown'
  | 'filled'
  | 'marked-empty'
  | 'revealed-filled'
  | 'revealed-empty'

export type Board = CellState[][]

export type InputMode = 'fill' | 'mark-empty'
export type GameStatus = 'playing' | 'failed' | 'cleared'
export type DifficultyTier = 1 | 2 | 3 | 4 | 5

export interface PuzzleClues {
  rows: number[][]
  cols: number[][]
}

export interface PuzzleDefinition {
  id: string
  seed: number
  size: number
  tier: DifficultyTier
  solution: boolean[][]
  clues: PuzzleClues
}

export interface GameState {
  puzzle: PuzzleDefinition
  board: Board
  status: GameStatus
  livesRemaining: number
  maxLives: number
  livesEnabled: boolean
  mistakes: number
  mode: InputMode
}

export interface Action {
  type: InputMode
  row: number
  col: number
}

export interface AutoCompletedCell {
  row: number
  col: number
  newState: Extract<CellState, 'filled' | 'marked-empty'>
}

export interface ActionResult {
  applied: boolean
  correct: boolean
  row: number
  col: number
  livesRemaining: number
  revealed: boolean
  autoCompleted: AutoCompletedCell[]
}

export interface BatchActionResult {
  state: GameState
  results: ActionResult[]
  stoppedAt: number | null
}

export const FILLED_STATES: readonly CellState[] = ['filled', 'revealed-filled']
export const EMPTY_STATES: readonly CellState[] = ['marked-empty', 'revealed-empty']

export function createUnknownBoard(size: number): Board {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 'unknown' as CellState),
  )
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row])
}

export function isFilledState(cell: CellState): boolean {
  return FILLED_STATES.includes(cell)
}

export function isEmptyState(cell: CellState): boolean {
  return EMPTY_STATES.includes(cell)
}
