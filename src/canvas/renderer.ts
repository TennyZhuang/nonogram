import type { BoardLayout } from '@/canvas/layout'
import type { CellCoord } from '@/canvas/hit-map'
import { resolveClueProgress, type ClueProgress } from '@/canvas/clue-progress'
import type { Board, CellState, PuzzleClues } from '@/core/types'

interface RenderOptions {
  board: Board
  solution: boolean[][]
  clues: PuzzleClues
  layout: BoardLayout
  previewCells?: CellCoord[]
  activeCell?: CellCoord | null
}

const COLORS = {
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
) {
  if (state === 'filled') {
    ctx.fillStyle = COLORS.fill
    ctx.fillRect(x, y, size, size)
    return
  }

  if (state === 'marked-empty') {
    drawMarkedEmpty(ctx, x, y, size, COLORS.emptyMark)
    return
  }

  if (state === 'revealed-filled') {
    ctx.fillStyle = COLORS.revealedFill
    ctx.fillRect(x, y, size, size)
    return
  }

  if (state === 'revealed-empty') {
    ctx.fillStyle = COLORS.revealedEmpty
    ctx.fillRect(x, y, size, size)
    drawMarkedEmpty(ctx, x, y, size, COLORS.revealedFill)
  }
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  activeCell: CellCoord,
) {
  const x = layout.gridOriginX + activeCell.col * layout.cellSize
  const y = layout.gridOriginY + activeCell.row * layout.cellSize
  ctx.fillStyle = COLORS.crosshair
  ctx.fillRect(layout.gridOriginX, y, layout.gridWidth, layout.cellSize)
  ctx.fillRect(x, layout.gridOriginY, layout.cellSize, layout.gridHeight)
}

function drawClues(
  ctx: CanvasRenderingContext2D,
  clues: PuzzleClues,
  clueProgress: ClueProgress,
  layout: BoardLayout,
  activeCell: CellCoord | null,
) {
  const fontSize = Math.max(10, Math.floor(layout.cellSize * 0.45))
  const numberGap = Math.max(3, Math.floor(fontSize * 0.35))
  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`
  ctx.textBaseline = 'middle'

  const getClueColor = (resolved: boolean, active: boolean): string => {
    if (resolved) {
      return active ? COLORS.clueResolvedActive : COLORS.clueResolved
    }
    return active ? COLORS.clueActive : COLORS.clueText
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

export function renderBoard(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  const { board, solution, clues, layout } = options
  const previewCells = options.previewCells ?? []
  const activeCell = options.activeCell ?? null
  const size = layout.gridSize
  const clueProgress = resolveClueProgress(board, solution, clues)

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  if (activeCell) {
    drawCrosshair(ctx, layout, activeCell)
  }

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const x = layout.gridOriginX + col * layout.cellSize
      const y = layout.gridOriginY + row * layout.cellSize
      drawCell(ctx, board[row][col], x, y, layout.cellSize)
    }
  }

  if (previewCells.length > 0) {
    ctx.fillStyle = COLORS.preview
    for (const cell of previewCells) {
      const x = layout.gridOriginX + cell.col * layout.cellSize
      const y = layout.gridOriginY + cell.row * layout.cellSize
      ctx.fillRect(x, y, layout.cellSize, layout.cellSize)
    }
  }

  ctx.strokeStyle = COLORS.gridMinor
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

  ctx.strokeStyle = COLORS.gridMajor
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

  drawClues(ctx, clues, clueProgress, layout, activeCell)
}
