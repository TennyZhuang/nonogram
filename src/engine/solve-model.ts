export type SolveCell = -1 | 0 | 1
export type SolveBoard = SolveCell[][]

export const UNKNOWN: SolveCell = -1
export const EMPTY: SolveCell = 0
export const FILLED: SolveCell = 1

export function normalizeClue(clue: number[]): number[] {
  if (clue.length === 1 && clue[0] === 0) {
    return []
  }
  return clue
}

export function sumClue(clue: number[]): number {
  return normalizeClue(clue).reduce((sum, run) => sum + run, 0)
}

export function createUnknownBoard(size: number): SolveBoard {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => UNKNOWN as SolveCell),
  )
}

export function cloneBoard(board: SolveBoard): SolveBoard {
  return board.map((row) => [...row] as SolveCell[])
}

export function isSolved(board: SolveBoard): boolean {
  return board.every((row) => row.every((cell) => cell !== UNKNOWN))
}

export function toBooleanBoard(board: SolveBoard): boolean[][] {
  return board.map((row) => row.map((cell) => cell === FILLED))
}

export function readLine(
  board: SolveBoard,
  axis: 'row' | 'col',
  index: number,
): SolveCell[] {
  if (axis === 'row') {
    return board[index]
  }
  return board.map((row) => row[index]) as SolveCell[]
}

export function applyCell(
  board: SolveBoard,
  row: number,
  col: number,
  value: SolveCell,
): { changed: boolean; contradiction: boolean } {
  const current = board[row][col]
  if (current === UNKNOWN) {
    board[row][col] = value
    return { changed: true, contradiction: false }
  }
  if (current !== value) {
    return { changed: false, contradiction: true }
  }
  return { changed: false, contradiction: false }
}
