export interface BoardLayoutInput {
  canvasWidth: number
  canvasHeight: number
  gridSize: number
  maxRowClueLength: number
  maxColClueLength: number
  padding?: number
}

export interface BoardLayout {
  cellSize: number
  gridSize: number
  gridOriginX: number
  gridOriginY: number
  gridWidth: number
  gridHeight: number
  clueAreaWidth: number
  clueAreaHeight: number
  totalWidth: number
  totalHeight: number
}

const MIN_CLUE_AREA = 20
const CLUE_CHAR_WIDTH = 7
const CLUE_CHAR_HEIGHT = 12

export function calculateBoardLayout(input: BoardLayoutInput): BoardLayout {
  const padding = input.padding ?? 8
  const clueAreaWidth = Math.max(
    MIN_CLUE_AREA,
    input.maxRowClueLength * CLUE_CHAR_WIDTH + padding,
  )
  const clueAreaHeight = Math.max(
    MIN_CLUE_AREA,
    input.maxColClueLength * CLUE_CHAR_HEIGHT + padding,
  )

  const usableWidth = Math.max(1, input.canvasWidth - padding * 2 - clueAreaWidth)
  const usableHeight = Math.max(1, input.canvasHeight - padding * 2 - clueAreaHeight)
  const cellSize = Math.max(
    1,
    Math.floor(Math.min(usableWidth / input.gridSize, usableHeight / input.gridSize)),
  )

  const gridWidth = cellSize * input.gridSize
  const gridHeight = cellSize * input.gridSize
  const gridOriginX = padding + clueAreaWidth
  const gridOriginY = padding + clueAreaHeight

  return {
    cellSize,
    gridSize: input.gridSize,
    gridOriginX,
    gridOriginY,
    gridWidth,
    gridHeight,
    clueAreaWidth,
    clueAreaHeight,
    totalWidth: gridOriginX + gridWidth + padding,
    totalHeight: gridOriginY + gridHeight + padding,
  }
}
