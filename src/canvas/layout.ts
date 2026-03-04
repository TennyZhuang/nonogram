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
  rowClueCompact: boolean
  colClueCompact: boolean
  totalWidth: number
  totalHeight: number
}

const MIN_CLUE_AREA = 16
const CLUE_CHAR_WIDTH = 7
const CLUE_CHAR_HEIGHT = 12
const CLUE_WIDTH_SOFT_RATIO = 0.26
const CLUE_HEIGHT_SOFT_RATIO = 0.24

interface TouchTarget {
  comfortable: number
  minimum: number
}

function resolveTouchTarget(gridSize: number): TouchTarget {
  if (gridSize >= 15) {
    return { comfortable: 20, minimum: 18 }
  }
  if (gridSize >= 12) {
    return { comfortable: 22, minimum: 20 }
  }
  return { comfortable: 24, minimum: 22 }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function calculateBoardLayout(input: BoardLayoutInput): BoardLayout {
  const padding = input.padding ?? 8
  const preferredClueAreaWidth = Math.max(
    MIN_CLUE_AREA,
    input.maxRowClueLength * CLUE_CHAR_WIDTH + padding,
  )
  const preferredClueAreaHeight = Math.max(
    MIN_CLUE_AREA,
    input.maxColClueLength * CLUE_CHAR_HEIGHT + padding,
  )
  const touchTarget = resolveTouchTarget(input.gridSize)
  const softClueAreaWidthLimit = Math.max(
    MIN_CLUE_AREA,
    Math.floor(input.canvasWidth * CLUE_WIDTH_SOFT_RATIO),
  )
  const softClueAreaHeightLimit = Math.max(
    MIN_CLUE_AREA,
    Math.floor(input.canvasHeight * CLUE_HEIGHT_SOFT_RATIO),
  )

  let clueAreaWidth = Math.min(preferredClueAreaWidth, softClueAreaWidthLimit)
  let clueAreaHeight = Math.min(preferredClueAreaHeight, softClueAreaHeightLimit)

  const resolveAxisCellSizes = (clueWidth: number, clueHeight: number) => {
    const usableWidth = Math.max(1, input.canvasWidth - padding * 2 - clueWidth)
    const usableHeight = Math.max(1, input.canvasHeight - padding * 2 - clueHeight)
    return {
      widthCellSize: Math.floor(usableWidth / input.gridSize),
      heightCellSize: Math.floor(usableHeight / input.gridSize),
    }
  }

  let { widthCellSize, heightCellSize } = resolveAxisCellSizes(clueAreaWidth, clueAreaHeight)
  let cellSize = Math.max(1, Math.floor(Math.min(widthCellSize, heightCellSize)))

  const constrainClueAreaForTarget = (targetCellSize: number) => {
    if (cellSize >= targetCellSize) {
      return
    }

    const widthIsLimiting = widthCellSize <= heightCellSize
    const heightIsLimiting = heightCellSize <= widthCellSize

    if (widthIsLimiting) {
      const maxClueWidth = input.canvasWidth - padding * 2 - targetCellSize * input.gridSize
      clueAreaWidth = Math.min(clueAreaWidth, Math.max(MIN_CLUE_AREA, maxClueWidth))
    }

    if (heightIsLimiting) {
      const maxClueHeight = input.canvasHeight - padding * 2 - targetCellSize * input.gridSize
      clueAreaHeight = Math.min(clueAreaHeight, Math.max(MIN_CLUE_AREA, maxClueHeight))
    }

    const nextAxis = resolveAxisCellSizes(clueAreaWidth, clueAreaHeight)
    widthCellSize = nextAxis.widthCellSize
    heightCellSize = nextAxis.heightCellSize
    cellSize = Math.max(1, Math.floor(Math.min(widthCellSize, heightCellSize)))
  }

  constrainClueAreaForTarget(touchTarget.comfortable)
  constrainClueAreaForTarget(touchTarget.minimum)

  const maxClueAreaWidthForResolvedCell = Math.max(
    MIN_CLUE_AREA,
    input.canvasWidth - padding * 2 - cellSize * input.gridSize,
  )
  const maxClueAreaHeightForResolvedCell = Math.max(
    MIN_CLUE_AREA,
    input.canvasHeight - padding * 2 - cellSize * input.gridSize,
  )

  clueAreaWidth = clamp(clueAreaWidth, MIN_CLUE_AREA, maxClueAreaWidthForResolvedCell)
  clueAreaHeight = clamp(clueAreaHeight, MIN_CLUE_AREA, maxClueAreaHeightForResolvedCell)

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
    rowClueCompact: clueAreaWidth < preferredClueAreaWidth,
    colClueCompact: clueAreaHeight < preferredClueAreaHeight,
    totalWidth: gridOriginX + gridWidth + padding,
    totalHeight: gridOriginY + gridHeight + padding,
  }
}
