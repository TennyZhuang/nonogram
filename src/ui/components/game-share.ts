import QRCode from 'qrcode'

import { calculateBoardLayout } from '@/canvas/layout'
import { getBoardColorsFromCss, renderBoard } from '@/canvas/renderer'
import { formatElapsed } from '@/core/timer'
import type { Board, DifficultyTier, PuzzleDefinition } from '@/core/types'
import { useSettingsStore } from '@/store/settings-store'

export const NONOGRAM_SHARE_URL = 'https://gh.zhuangty.com/nonogram/'

const PREVIEW_CANVAS_SIZE = 360
const SHARE_BOARD_TARGET_SIZE = 820
const SHARE_CANVAS_WIDTH = 1080
const SHARE_CANVAS_HEIGHT = 1700

function getMaxRowClueLength(puzzle: PuzzleDefinition): number {
  return Math.max(...puzzle.clues.rows.map((clue) => clue.join(' ').length), 1)
}

function getMaxColClueLength(puzzle: PuzzleDefinition): number {
  return Math.max(...puzzle.clues.cols.map((clue) => clue.length), 1)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image-load-failed'))
    image.src = src
  })
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const clampedRadius = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + clampedRadius, y)
  ctx.lineTo(x + width - clampedRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + clampedRadius)
  ctx.lineTo(x + width, y + height - clampedRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height)
  ctx.lineTo(x + clampedRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - clampedRadius)
  ctx.lineTo(x, y + clampedRadius)
  ctx.quadraticCurveTo(x, y, x + clampedRadius, y)
  ctx.closePath()
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
): void {
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.fillStyle = fillStyle
  ctx.fill()
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeStyle: string,
  lineWidth: number,
): void {
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

export function renderResultBoardPreview(
  puzzle: PuzzleDefinition,
  board: Board,
  targetSize = PREVIEW_CANVAS_SIZE,
): HTMLCanvasElement {
  const layout = calculateBoardLayout({
    canvasWidth: targetSize,
    canvasHeight: targetSize,
    gridSize: puzzle.size,
    maxRowClueLength: getMaxRowClueLength(puzzle),
    maxColClueLength: getMaxColClueLength(puzzle),
    padding: 10,
  })

  const canvas = document.createElement('canvas')
  canvas.width = layout.totalWidth
  canvas.height = layout.totalHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('board-preview-context-unavailable')
  }
  const highlightResolvedClues = useSettingsStore.getState().highlightCompletedClues

  renderBoard(ctx, {
    board,
    solution: puzzle.solution,
    clues: puzzle.clues,
    layout,
    colors: getBoardColorsFromCss(document.documentElement),
    highlightResolvedClues,
  })

  return canvas
}

export async function createShareQrDataUrl(size = 220): Promise<string> {
  return QRCode.toDataURL(NONOGRAM_SHARE_URL, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111827',
      light: '#ffffff',
    },
  })
}

export interface ShareImagePayload {
  puzzle: PuzzleDefinition
  board: Board
  elapsedMs: number
  livesRemaining: number
  maxLives: number
  mistakes: number
}

export async function generateResultShareImage(payload: ShareImagePayload): Promise<Blob> {
  const boardCanvas = renderResultBoardPreview(
    payload.puzzle,
    payload.board,
    SHARE_BOARD_TARGET_SIZE,
  )
  const [boardImage, qrImage] = await Promise.all([
    loadImage(boardCanvas.toDataURL('image/png')),
    createShareQrDataUrl(220).then((dataUrl) => loadImage(dataUrl)),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = SHARE_CANVAS_WIDTH
  canvas.height = SHARE_CANVAS_HEIGHT

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('share-context-unavailable')
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, SHARE_CANVAS_HEIGHT)
  gradient.addColorStop(0, '#f8fafc')
  gradient.addColorStop(1, '#e2e8f0')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, SHARE_CANVAS_WIDTH, SHARE_CANVAS_HEIGHT)

  ctx.fillStyle = '#0f172a'
  ctx.font = '700 68px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('NONOGRAM 通关截图', 72, 114)

  ctx.fillStyle = '#475569'
  ctx.font = '500 34px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText(`生命：${payload.livesRemaining}/${payload.maxLives}`, 72, 190)
  ctx.fillText(`时间：${formatElapsed(payload.elapsedMs)}`, 72, 238)
  ctx.fillText(`难度：D${payload.puzzle.tier}`, 72, 286)
  ctx.fillText(`失误：${payload.mistakes}`, 72, 334)

  const boardFrameX = 76
  const boardFrameY = 360
  const boardFrameSize = 928
  fillRoundedRect(ctx, boardFrameX, boardFrameY, boardFrameSize, boardFrameSize, 28, '#ffffff')
  strokeRoundedRect(ctx, boardFrameX, boardFrameY, boardFrameSize, boardFrameSize, 28, '#cbd5e1', 2)

  const boardPadding = 26
  const boardTargetSize = boardFrameSize - boardPadding * 2
  const boardScale = Math.min(
    boardTargetSize / boardImage.width,
    boardTargetSize / boardImage.height,
  )
  const boardDrawWidth = boardImage.width * boardScale
  const boardDrawHeight = boardImage.height * boardScale
  const boardDrawX = boardFrameX + (boardFrameSize - boardDrawWidth) / 2
  const boardDrawY = boardFrameY + (boardFrameSize - boardDrawHeight) / 2
  ctx.drawImage(boardImage, boardDrawX, boardDrawY, boardDrawWidth, boardDrawHeight)

  const qrCardX = 76
  const qrCardY = 1320
  const qrCardSize = 260
  fillRoundedRect(ctx, qrCardX, qrCardY, qrCardSize, qrCardSize, 24, '#ffffff')
  strokeRoundedRect(ctx, qrCardX, qrCardY, qrCardSize, qrCardSize, 24, '#cbd5e1', 2)
  ctx.drawImage(qrImage, qrCardX + 20, qrCardY + 20, 220, 220)

  ctx.fillStyle = '#0f172a'
  ctx.font = '700 46px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('扫码继续挑战', 390, 1408)

  ctx.fillStyle = '#334155'
  ctx.font = '500 28px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(NONOGRAM_SHARE_URL, 390, 1462)

  ctx.fillStyle = '#64748b'
  ctx.font = '500 24px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('终局棋盘与战绩由 Nonogram 自动生成', 390, 1512)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })

  if (!blob) {
    throw new Error('share-blob-unavailable')
  }

  return blob
}

export function getShareFilename(tier: DifficultyTier): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
  return `nonogram-clear-d${tier}-${stamp}.png`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1_000)
}
