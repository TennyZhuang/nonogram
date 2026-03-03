import type { BoardLayout } from '@/canvas/layout'
import type { CellCoord } from '@/canvas/hit-map'
import {
  resolveClueProgress,
  resolveLineClueSegments,
  type ClueProgress,
} from '@/canvas/clue-progress'
import type { Board, CellState, PuzzleClues } from '@/core/types'

export interface BoardColors {
  background: string
  gridMinor: string
  gridMajor: string
  clueText: string
  clueActive: string
  clueResolved: string
  clueResolvedActive: string
  fill: string
  emptyMark: string
  revealedFill: string
  revealedEmpty: string
  preview: string
  crosshair: string
}

interface RenderOptions {
  board: Board
  solution: boolean[][]
  clues: PuzzleClues
  layout: BoardLayout
  previewCells?: CellCoord[]
  activeCell?: CellCoord | null
  colors?: BoardColors
}

interface SegmentAutoMarkOptions {
  board: Board
  solution: boolean[][]
  clues: PuzzleClues
  activeCell: CellCoord | null
}

const DEFAULT_COLORS: BoardColors = {
  background: '#ffffff',
  gridMinor: '#d1d5db',
  gridMajor: '#9ca3af',
  clueText: '#4b5563',
  clueActive: '#111827',
  clueResolved: '#16a34a',
  clueResolvedActive: '#15803d',
  fill: '#111827',
  emptyMark: '#6b7280',
  revealedFill: '#ef4444',
  revealedEmpty: '#fde68a',
  preview: 'rgba(59, 130, 246, 0.25)',
  crosshair: 'rgba(17, 24, 39, 0.15)',
}

function readCssColor(
  styles: CSSStyleDeclaration,
  cssVariable: string,
  fallback: string,
): string {
  const value = styles.getPropertyValue(cssVariable).trim()
  return value || fallback
}

export function getBoardColorsFromCss(root: Element | null = null): BoardColors {
  if (!root && typeof document === 'undefined') {
    return DEFAULT_COLORS
  }

  const source = root ?? document.documentElement
  const styles = getComputedStyle(source)

  return {
    background: readCssColor(styles, '--canvas-background', DEFAULT_COLORS.background),
    gridMinor: readCssColor(styles, '--canvas-grid-minor', DEFAULT_COLORS.gridMinor),
    gridMajor: readCssColor(styles, '--canvas-grid-major', DEFAULT_COLORS.gridMajor),
    clueText: readCssColor(styles, '--canvas-clue-text', DEFAULT_COLORS.clueText),
    clueActive: readCssColor(styles, '--canvas-clue-active', DEFAULT_COLORS.clueActive),
    clueResolved: readCssColor(styles, '--canvas-clue-resolved', DEFAULT_COLORS.clueResolved),
    clueResolvedActive: readCssColor(
      styles,
      '--canvas-clue-resolved-active',
      DEFAULT_COLORS.clueResolvedActive,
    ),
    fill: readCssColor(styles, '--canvas-fill', DEFAULT_COLORS.fill),
    emptyMark: readCssColor(styles, '--canvas-empty-mark', DEFAULT_COLORS.emptyMark),
    revealedFill: readCssColor(styles, '--canvas-revealed-fill', DEFAULT_COLORS.revealedFill),
    revealedEmpty: readCssColor(styles, '--canvas-revealed-empty', DEFAULT_COLORS.revealedEmpty),
    preview: readCssColor(styles, '--canvas-preview', DEFAULT_COLORS.preview),
    crosshair: readCssColor(styles, '--canvas-crosshair', DEFAULT_COLORS.crosshair),
  }
}

function drawMarkedEmpty(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  const pad = Math.max(2, Math.floor(size * 0.2))
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, Math.floor(size * 0.08))
  ctx.beginPath()
  ctx.moveTo(x + pad, y + pad)
  ctx.lineTo(x + size - pad, y + size - pad)
  ctx.moveTo(x + size - pad, y + pad)
  ctx.lineTo(x + pad, y + size - pad)
  ctx.stroke()
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  state: CellState,
  x: number,
  y: number,
  size: number,
  colors: BoardColors,
) {
  if (state === 'filled') {
    ctx.fillStyle = colors.fill
    ctx.fillRect(x, y, size, size)
    return
  }

  if (state === 'marked-empty') {
    drawMarkedEmpty(ctx, x, y, size, colors.emptyMark)
    return
  }

  if (state === 'revealed-filled') {
    ctx.fillStyle = colors.revealedFill
    ctx.fillRect(x, y, size, size)
    return
  }

  if (state === 'revealed-empty') {
    ctx.fillStyle = colors.revealedEmpty
    ctx.fillRect(x, y, size, size)
    drawMarkedEmpty(ctx, x, y, size, colors.revealedFill)
  }
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  activeCell: CellCoord,
  colors: BoardColors,
) {
  const x = layout.gridOriginX + activeCell.col * layout.cellSize
  const y = layout.gridOriginY + activeCell.row * layout.cellSize
  ctx.fillStyle = colors.crosshair
  ctx.fillRect(layout.gridOriginX, y, layout.gridWidth, layout.cellSize)
  ctx.fillRect(x, layout.gridOriginY, layout.cellSize, layout.gridHeight)
}

function drawClues(
  ctx: CanvasRenderingContext2D,
  clues: PuzzleClues,
  clueProgress: ClueProgress,
  layout: BoardLayout,
  activeCell: CellCoord | null,
  colors: BoardColors,
) {
  const clueEdgeSafeInset = 4
  const resolveClueFontSize = (): number => {
    const preferred = Math.max(10, Math.floor(layout.cellSize * 0.45))
    const minFontSize = 8

    const maxRowNumberCount = clues.rows.reduce(
      (max, numbers) => Math.max(max, numbers.length),
      0,
    )
    const maxColNumberCount = clues.cols.reduce(
      (max, numbers) => Math.max(max, numbers.length),
      0,
    )

    for (let candidate = preferred; candidate >= minFontSize; candidate -= 1) {
      const candidateGap = Math.max(3, Math.floor(candidate * 0.35))
      ctx.font = `${candidate}px ui-monospace, SFMono-Regular, Menlo, monospace`

      let maxRowWidth = 0
      for (let row = 0; row < clues.rows.length; row += 1) {
        const numbers = clues.rows[row]
        if (numbers.length === 0) {
          continue
        }
        let rowWidth = 0
        for (let index = 0; index < numbers.length; index += 1) {
          rowWidth += ctx.measureText(String(numbers[index])).width
        }
        rowWidth += candidateGap * Math.max(0, numbers.length - 1)
        if (rowWidth > maxRowWidth) {
          maxRowWidth = rowWidth
        }
      }

      const leftMostX = layout.gridOriginX - 6 - maxRowWidth
      const topMostY =
        layout.gridOriginY -
        6 -
        Math.max(0, maxColNumberCount - 1) * (candidate + 2) -
        candidate

      const fitsLeft =
        maxRowNumberCount === 0 || leftMostX >= clueEdgeSafeInset
      const fitsTop =
        maxColNumberCount === 0 || topMostY >= clueEdgeSafeInset
      if (fitsLeft && fitsTop) {
        return candidate
      }
    }

    return minFontSize
  }

  const fontSize = resolveClueFontSize()
  const numberGap = Math.max(3, Math.floor(fontSize * 0.35))
  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`
  ctx.textBaseline = 'middle'

  const getClueColor = (resolved: boolean, active: boolean): string => {
    if (resolved) {
      return active ? colors.clueResolvedActive : colors.clueResolved
    }
    return active ? colors.clueActive : colors.clueText
  }

  for (let row = 0; row < clues.rows.length; row += 1) {
    const isActive = activeCell?.row === row
    const numbers = clues.rows[row]
    const resolved = clueProgress.rows[row] ?? []
    const y = layout.gridOriginY + row * layout.cellSize + layout.cellSize / 2
    let cursorX = layout.gridOriginX - 6
    ctx.textAlign = 'right'
    for (let index = numbers.length - 1; index >= 0; index -= 1) {
      const clueText = String(numbers[index])
      ctx.fillStyle = getClueColor(resolved[index] ?? false, Boolean(isActive))
      ctx.fillText(clueText, cursorX, y)
      cursorX -= ctx.measureText(clueText).width + numberGap
    }
  }

  for (let col = 0; col < clues.cols.length; col += 1) {
    const isActive = activeCell?.col === col
    const numbers = clues.cols[col]
    const resolved = clueProgress.cols[col] ?? []
    const x = layout.gridOriginX + col * layout.cellSize + layout.cellSize / 2
    ctx.textAlign = 'center'
    for (let i = 0; i < numbers.length; i += 1) {
      const y =
        layout.gridOriginY -
        6 -
        (numbers.length - i - 1) * (fontSize + 2) -
        fontSize / 2
      ctx.fillStyle = getClueColor(resolved[i] ?? false, Boolean(isActive))
      ctx.fillText(String(numbers[i]), x, y)
    }
  }
}

function pushLineAutoMarks(
  collection: CellCoord[],
  dedupe: Set<string>,
  options: {
    axis: 'row' | 'col'
    index: number
    board: Board
    solution: boolean[][]
    clues: PuzzleClues
  },
) {
  const size = options.board.length
  if (options.index < 0 || options.index >= size) {
    return
  }

  const line =
    options.axis === 'row'
      ? options.board[options.index]
      : options.board.map((row) => row[options.index])
  const solutionLine =
    options.axis === 'row'
      ? options.solution[options.index]
      : options.solution.map((row) => row[options.index])
  const clue =
    options.axis === 'row'
      ? options.clues.rows[options.index]
      : options.clues.cols[options.index]

  const segments = resolveLineClueSegments(line, solutionLine, clue)

  for (const segment of segments) {
    if (!segment.resolved) {
      continue
    }

    const neighborIndexes = [segment.start - 1, segment.start + segment.length]
    for (const lineIndex of neighborIndexes) {
      if (lineIndex < 0 || lineIndex >= line.length) {
        continue
      }
      if (line[lineIndex] !== 'unknown') {
        continue
      }

      const coord: CellCoord =
        options.axis === 'row'
          ? { row: options.index, col: lineIndex }
          : { row: lineIndex, col: options.index }
      const key = `${coord.row}:${coord.col}`
      if (dedupe.has(key)) {
        continue
      }
      dedupe.add(key)
      collection.push(coord)
    }
  }
}

export function collectResolvedSegmentBoundaryCells(
  options: SegmentAutoMarkOptions,
): CellCoord[] {
  const activeCell = options.activeCell
  if (!activeCell) {
    return []
  }

  const cells: CellCoord[] = []
  const dedupe = new Set<string>()

  pushLineAutoMarks(cells, dedupe, {
    axis: 'row',
    index: activeCell.row,
    board: options.board,
    solution: options.solution,
    clues: options.clues,
  })
  pushLineAutoMarks(cells, dedupe, {
    axis: 'col',
    index: activeCell.col,
    board: options.board,
    solution: options.solution,
    clues: options.clues,
  })

  return cells
}

export function renderBoard(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  const { board, solution, clues, layout } = options
  const previewCells = options.previewCells ?? []
  const activeCell = options.activeCell ?? null
  const colors = options.colors ?? getBoardColorsFromCss()
  const size = layout.gridSize
  const clueProgress = resolveClueProgress(board, solution, clues)

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  if (activeCell) {
    drawCrosshair(ctx, layout, activeCell, colors)
  }

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const x = layout.gridOriginX + col * layout.cellSize
      const y = layout.gridOriginY + row * layout.cellSize
      drawCell(ctx, board[row][col], x, y, layout.cellSize, colors)
    }
  }

  if (previewCells.length > 0) {
    ctx.fillStyle = colors.preview
    for (const cell of previewCells) {
      const x = layout.gridOriginX + cell.col * layout.cellSize
      const y = layout.gridOriginY + cell.row * layout.cellSize
      ctx.fillRect(x, y, layout.cellSize, layout.cellSize)
    }
  }

  ctx.strokeStyle = colors.gridMinor
  ctx.lineWidth = 1
  for (let index = 0; index <= size; index += 1) {
    const x = layout.gridOriginX + index * layout.cellSize
    const y = layout.gridOriginY + index * layout.cellSize

    ctx.beginPath()
    ctx.moveTo(x, layout.gridOriginY)
    ctx.lineTo(x, layout.gridOriginY + layout.gridHeight)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(layout.gridOriginX, y)
    ctx.lineTo(layout.gridOriginX + layout.gridWidth, y)
    ctx.stroke()
  }

  ctx.strokeStyle = colors.gridMajor
  ctx.lineWidth = 1.5
  for (let index = 0; index <= size; index += 5) {
    const x = layout.gridOriginX + index * layout.cellSize
    const y = layout.gridOriginY + index * layout.cellSize

    ctx.beginPath()
    ctx.moveTo(x, layout.gridOriginY)
    ctx.lineTo(x, layout.gridOriginY + layout.gridHeight)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(layout.gridOriginX, y)
    ctx.lineTo(layout.gridOriginX + layout.gridWidth, y)
    ctx.stroke()
  }

  drawClues(ctx, clues, clueProgress, layout, activeCell, colors)
}
