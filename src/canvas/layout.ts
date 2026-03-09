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
const DEFAULT_PADDING = 8
const COMPACT_PADDING = 6
const COMPACT_GRID_SIZE = 15
const NARROW_PHONE_CANVAS_WIDTH = 390
const COMPACT_MIN_CLUE_AREA = 18
const COMPACT_CLUE_CHAR_WIDTH = 6
const COMPACT_CLUE_CHAR_HEIGHT = 11

export function calculateBoardLayout(input: BoardLayoutInput): BoardLayout {
  const useCompactMetrics =
    input.gridSize >= COMPACT_GRID_SIZE && input.canvasWidth <= NARROW_PHONE_CANVAS_WIDTH
  const padding = input.padding ?? (useCompactMetrics ? COMPACT_PADDING : DEFAULT_PADDING)
  const minClueArea = useCompactMetrics ? COMPACT_MIN_CLUE_AREA : MIN_CLUE_AREA
  const clueCharWidth = useCompactMetrics ? COMPACT_CLUE_CHAR_WIDTH : CLUE_CHAR_WIDTH
  const clueCharHeight = useCompactMetrics ? COMPACT_CLUE_CHAR_HEIGHT : CLUE_CHAR_HEIGHT

  const clueAreaWidth = Math.max(minClueArea, input.maxRowClueLength * clueCharWidth + padding)
  const clueAreaHeight = Math.max(minClueArea, input.maxColClueLength * clueCharHeight + padding)

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
