import type { CellCoord } from '@/canvas/hit-map'

type LockDirection = 'horizontal' | 'vertical' | null

export interface PointerPoint {
  x: number
  y: number
}

export interface InputControllerSnapshot {
  previewCells: CellCoord[]
  activeCell: CellCoord | null
  startCell: CellCoord | null
  lockedDirection: LockDirection
  phase: 'idle' | 'previewing'
}

export interface InputControllerOptions {
  movementThreshold?: number
  mapPointToCell: (point: PointerPoint) => CellCoord | null
  onCommit: (cells: CellCoord[]) => void
}

export interface InputController {
  pointerDown: (point: PointerPoint) => InputControllerSnapshot
  pointerMove: (point: PointerPoint) => InputControllerSnapshot
  pointerUp: (point: PointerPoint) => InputControllerSnapshot
  pointerCancel: () => InputControllerSnapshot
  pointerAbort: () => InputControllerSnapshot
  getSnapshot: () => InputControllerSnapshot
}

interface State {
  phase: 'idle' | 'previewing'
  startCell: CellCoord | null
  lastValidCell: CellCoord | null
  activeCell: CellCoord | null
  previewCells: CellCoord[]
  downPoint: PointerPoint | null
  lockedDirection: LockDirection
}

function buildLinearPreview(
  start: CellCoord,
  end: CellCoord,
  direction: LockDirection,
): CellCoord[] {
  if (direction === 'vertical') {
    const min = Math.min(start.row, end.row)
    const max = Math.max(start.row, end.row)
    return Array.from({ length: max - min + 1 }, (_, index) => ({
      row: min + index,
      col: start.col,
    }))
  }

  const min = Math.min(start.col, end.col)
  const max = Math.max(start.col, end.col)
  return Array.from({ length: max - min + 1 }, (_, index) => ({
    row: start.row,
    col: min + index,
  }))
}

function toSnapshot(state: State): InputControllerSnapshot {
  return {
    previewCells: [...state.previewCells],
    activeCell: state.activeCell,
    startCell: state.startCell,
    lockedDirection: state.lockedDirection,
    phase: state.phase,
  }
}

function createInitialState(): State {
  return {
    phase: 'idle',
    startCell: null,
    lastValidCell: null,
    activeCell: null,
    previewCells: [],
    downPoint: null,
    lockedDirection: null,
  }
}

export function createInputController(options: InputControllerOptions): InputController {
  const threshold = options.movementThreshold ?? 8
  const state = createInitialState()

  const reset = (): InputControllerSnapshot => {
    const next = createInitialState()
    state.phase = next.phase
    state.startCell = next.startCell
    state.lastValidCell = next.lastValidCell
    state.activeCell = next.activeCell
    state.previewCells = next.previewCells
    state.downPoint = next.downPoint
    state.lockedDirection = next.lockedDirection
    return toSnapshot(state)
  }

  return {
    pointerDown(point) {
      const startCell = options.mapPointToCell(point)
      if (!startCell) {
        return reset()
      }

      state.phase = 'previewing'
      state.startCell = startCell
      state.lastValidCell = startCell
      state.activeCell = startCell
      state.previewCells = [startCell]
      state.downPoint = point
      state.lockedDirection = null
      return toSnapshot(state)
    },

    pointerMove(point) {
      if (state.phase !== 'previewing' || !state.startCell) {
        return toSnapshot(state)
      }

      const mappedCell = options.mapPointToCell(point)
      if (mappedCell) {
        state.lastValidCell = mappedCell
        state.activeCell = mappedCell
      } else {
        state.activeCell = null
      }

      const targetCell = state.lastValidCell ?? state.startCell
      const dx = state.downPoint ? point.x - state.downPoint.x : 0
      const dy = state.downPoint ? point.y - state.downPoint.y : 0

      if (!state.lockedDirection) {
        const crossedThreshold = Math.abs(dx) >= threshold || Math.abs(dy) >= threshold
        if (crossedThreshold) {
          state.lockedDirection =
            Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical'
        } else if (
          targetCell.row !== state.startCell.row ||
          targetCell.col !== state.startCell.col
        ) {
          state.lockedDirection =
            Math.abs(targetCell.col - state.startCell.col) >=
            Math.abs(targetCell.row - state.startCell.row)
              ? 'horizontal'
              : 'vertical'
        }
      }

      const direction = state.lockedDirection ?? 'horizontal'
      state.previewCells = buildLinearPreview(state.startCell, targetCell, direction)
      return toSnapshot(state)
    },

    pointerUp(point) {
      if (state.phase !== 'previewing') {
        return toSnapshot(state)
      }

      const releaseCell = options.mapPointToCell(point)
      if (!releaseCell && state.previewCells.length === 0) {
        return reset()
      }

      const committedCells =
        state.previewCells.length > 0
          ? [...state.previewCells]
          : [releaseCell as CellCoord]
      options.onCommit(committedCells)
      return reset()
    },

    pointerCancel() {
      if (state.phase !== 'previewing') {
        return toSnapshot(state)
      }
      if (state.previewCells.length > 0) {
        options.onCommit([...state.previewCells])
      }
      return reset()
    },

    pointerAbort() {
      if (state.phase !== 'previewing') {
        return toSnapshot(state)
      }
      return reset()
    },

    getSnapshot() {
      return toSnapshot(state)
    },
  }
}
