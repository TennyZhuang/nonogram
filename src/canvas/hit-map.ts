import type { BoardLayout } from '@/canvas/layout'

export interface CellCoord {
  row: number
  col: number
}

export interface CellRect {
  x: number
  y: number
  width: number
  height: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function pixelToCell(
  x: number,
  y: number,
  layout: BoardLayout,
): CellCoord | null {
  const relX = x - layout.gridOriginX
  const relY = y - layout.gridOriginY

  if (relX < 0 || relY < 0 || relX > layout.gridWidth || relY > layout.gridHeight) {
    return null
  }

  const rawCol = Math.floor(relX / layout.cellSize)
  const rawRow = Math.floor(relY / layout.cellSize)
  const col = clamp(rawCol, 0, layout.gridSize - 1)
  const row = clamp(rawRow, 0, layout.gridSize - 1)

  return { row, col }
}

export function cellToPixel(
  row: number,
  col: number,
  layout: BoardLayout,
): CellRect {
  return {
    x: layout.gridOriginX + col * layout.cellSize,
    y: layout.gridOriginY + row * layout.cellSize,
    width: layout.cellSize,
    height: layout.cellSize,
  }
}
