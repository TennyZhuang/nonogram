import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createInputController, type InputControllerSnapshot } from '@/canvas/input-controller'
import { cellToPixel, pixelToCell, type CellCoord } from '@/canvas/hit-map'
import { calculateBoardLayout, type BoardLayout } from '@/canvas/layout'
import {
  collectResolvedSegmentBoundaryCells,
  getBoardColorsFromCss,
  renderBoard,
  type BoardColors,
} from '@/canvas/renderer'
import {
  isFilledState,
  type Board as BoardState,
  type InputMode,
  type PuzzleDefinition,
} from '@/core/types'
import { useSound } from '@/hooks/useSound'
import { readDebugInputEnabled } from '@/lib/debug-input'
import { useSettingsStore } from '@/store/settings-store'

interface BoardProps {
  puzzle: PuzzleDefinition
  board: BoardState
  mode: InputMode
  onBatchCommit: (cells: CellCoord[], mode: InputMode) => void
}

interface CanvasSize {
  width: number
  height: number
}

interface CancelActionZone {
  centerX: number
  centerY: number
  radius: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function buildCancelActionZone(
  startCell: CellCoord,
  layout: BoardLayout,
  canvasSize: CanvasSize,
): CancelActionZone {
  const startRect = cellToPixel(startCell.row, startCell.col, layout)
  const radius = Math.round(clamp(layout.cellSize * 0.42, 15, 22))
  const gap = Math.max(6, Math.round(layout.cellSize * 0.22))
  const minX = radius + 4
  const maxX = canvasSize.width - radius - 4
  const minY = radius + 4
  const maxY = canvasSize.height - radius - 4

  const leftX = startRect.x - radius - gap
  const rightX = startRect.x + startRect.width + radius + gap
  const hasLeftRoom = leftX >= minX
  const preferredX = hasLeftRoom ? leftX : rightX

  const aboveY = startRect.y - radius - gap
  const belowY = startRect.y + startRect.height + radius + gap
  const preferredY = aboveY >= minY ? aboveY : belowY

  return {
    centerX: clamp(preferredX, minX, maxX),
    centerY: clamp(preferredY, minY, maxY),
    radius,
  }
}

function isPointInsideCancelActionZone(
  point: { x: number; y: number },
  zone: CancelActionZone,
  hitScale = 1,
): boolean {
  const dx = point.x - zone.centerX
  const dy = point.y - zone.centerY
  const hitRadius = zone.radius * hitScale
  return dx * dx + dy * dy <= hitRadius * hitRadius
}

const CANCEL_ZONE_HOVER_HIT_SCALE = 1.35
const CANCEL_ZONE_RELEASE_HIT_SCALE = 1.35

function getMaxRowClueLength(puzzle: PuzzleDefinition): number {
  return Math.max(...puzzle.clues.rows.map((clue) => clue.join(' ').length), 1)
}

function getMaxColClueLength(puzzle: PuzzleDefinition): number {
  return Math.max(...puzzle.clues.cols.map((clue) => clue.length), 1)
}

function pointFromClient(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

function findTouchById(touchList: TouchList, id: number): Touch | null {
  for (let index = 0; index < touchList.length; index += 1) {
    const touch = touchList.item(index)
    if (touch && touch.identifier === id) {
      return touch
    }
  }
  return null
}

function collectFilledDiffAnchors(previousBoard: BoardState, nextBoard: BoardState): CellCoord[] {
  const anchors: CellCoord[] = []
  const rowCount = Math.min(previousBoard.length, nextBoard.length)

  for (let row = 0; row < rowCount; row += 1) {
    const previousRow = previousBoard[row] ?? []
    const nextRow = nextBoard[row] ?? []
    const colCount = Math.min(previousRow.length, nextRow.length)
    for (let col = 0; col < colCount; col += 1) {
      if (previousRow[col] === nextRow[col]) {
        continue
      }
      if (isFilledState(nextRow[col])) {
        anchors.push({ row, col })
      }
    }
  }

  return anchors
}

export function Board({ puzzle, board, mode, onBatchCommit }: BoardProps) {
  const theme = useSettingsStore((state) => state.theme)
  const highlightCompletedClues = useSettingsStore((state) => state.highlightCompletedClues)
  const { play } = useSound()
  const playRef = useRef(play)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controllerRef = useRef<ReturnType<typeof createInputController> | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const activeTouchIdRef = useRef<number | null>(null)
  const interactionLockedRef = useRef(false)
  const cancelActionZoneRef = useRef<CancelActionZone | null>(null)
  const cancelZoneHighlightedRef = useRef(false)
  const autoMarkAnchorsRef = useRef<CellCoord[]>([])
  const previousBoardRef = useRef<BoardState>(board)
  const debugIndexRef = useRef(0)

  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 360, height: 620 })
  const [previewCells, setPreviewCells] = useState<CellCoord[]>([])
  const [activeCell, setActiveCell] = useState<CellCoord | null>(null)
  const [previewStartCell, setPreviewStartCell] = useState<CellCoord | null>(null)
  const [previewPhase, setPreviewPhase] = useState<InputControllerSnapshot['phase']>('idle')
  const [cancelZoneHighlighted, setCancelZoneHighlightedState] = useState(false)
  const [impactCount, setImpactCount] = useState(0)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [debugActionTip, setDebugActionTip] = useState('')

  const [debugEnabled] = useState(readDebugInputEnabled)
  const autoMarkEnabled = puzzle.tier >= 4
  const canShareDebug = useMemo(
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    [],
  )

  useEffect(() => {
    playRef.current = play
  }, [play])

  const collectAutoMarkAnchors = useCallback((snapshot: InputControllerSnapshot): CellCoord[] => {
    const unique = new Map<string, CellCoord>()
    for (const cell of snapshot.previewCells) {
      unique.set(`${cell.row}:${cell.col}`, cell)
    }
    if (snapshot.activeCell) {
      unique.set(`${snapshot.activeCell.row}:${snapshot.activeCell.col}`, snapshot.activeCell)
    }
    return [...unique.values()]
  }, [])

  const appendDebugLog = useCallback(
    (label: string, details?: Record<string, unknown>) => {
      if (!debugEnabled) {
        return
      }

      const timestamp = new Date().toISOString().slice(11, 23)
      debugIndexRef.current += 1
      const detailText = details ? ` ${JSON.stringify(details)}` : ''
      const line = `${debugIndexRef.current.toString().padStart(3, '0')} ${timestamp} ${label}${detailText}`
      setDebugLogs((prev) => [...prev.slice(-119), line])
    },
    [debugEnabled],
  )

  const layout = useMemo<BoardLayout>(() => {
    return calculateBoardLayout({
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      gridSize: puzzle.size,
      maxRowClueLength: getMaxRowClueLength(puzzle),
      maxColClueLength: getMaxColClueLength(puzzle),
    })
  }, [canvasSize.height, canvasSize.width, puzzle])

  const boardColors = useMemo<BoardColors>(() => {
    if (typeof document === 'undefined') {
      return getBoardColorsFromCss(null)
    }
    const themedRoot = document.querySelector(`:root[data-theme='${theme}']`)
    return getBoardColorsFromCss(themedRoot ?? document.documentElement)
  }, [theme])

  const cancelActionZone = useMemo<CancelActionZone | null>(() => {
    if (previewPhase !== 'previewing' || !previewStartCell) {
      return null
    }
    return buildCancelActionZone(previewStartCell, layout, canvasSize)
  }, [canvasSize, layout, previewPhase, previewStartCell])

  useEffect(() => {
    cancelActionZoneRef.current = cancelActionZone
  }, [cancelActionZone])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return undefined
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }
      const width = Math.max(280, Math.floor(entry.contentRect.width))
      const height = Math.max(420, Math.floor(entry.contentRect.height))
      setCanvasSize({ width, height })
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    // iOS Safari can still surface system gestures or callouts on long press.
    const preventDefault = (event: Event) => {
      appendDebugLog(`native-${event.type}`, {
        cancelable: 'cancelable' in event ? event.cancelable : undefined,
      })
      event.preventDefault()
    }

    canvas.addEventListener('selectstart', preventDefault)
    canvas.addEventListener('dragstart', preventDefault)
    canvas.addEventListener('contextmenu', preventDefault)
    canvas.addEventListener('gesturestart', preventDefault as EventListener, {
      passive: false,
    })
    canvas.addEventListener('gesturechange', preventDefault as EventListener, {
      passive: false,
    })
    canvas.addEventListener('gestureend', preventDefault as EventListener, {
      passive: false,
    })

    return () => {
      canvas.removeEventListener('selectstart', preventDefault)
      canvas.removeEventListener('dragstart', preventDefault)
      canvas.removeEventListener('contextmenu', preventDefault)
      canvas.removeEventListener('gesturestart', preventDefault as EventListener)
      canvas.removeEventListener('gesturechange', preventDefault as EventListener)
      canvas.removeEventListener('gestureend', preventDefault as EventListener)
    }
  }, [appendDebugLog])

  useEffect(() => {
    controllerRef.current = createInputController({
      movementThreshold: 8,
      mapPointToCell: (point) => pixelToCell(point.x, point.y, layout),
      onCommit: (cells) => {
        playRef.current('click')
        onBatchCommit(cells, mode)
        setPreviewCells([])
        setActiveCell(null)
        setPreviewStartCell(null)
        setPreviewPhase('idle')
        setImpactCount(0)
      },
    })
  }, [layout, mode, onBatchCommit])

  useEffect(() => {
    autoMarkAnchorsRef.current = []
  }, [puzzle.id])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(canvasSize.width * dpr)
    canvas.height = Math.floor(canvasSize.height * dpr)
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    renderBoard(ctx, {
      board,
      solution: puzzle.solution,
      clues: puzzle.clues,
      layout,
      mode,
      colors: boardColors,
      previewCells,
      activeCell,
      highlightResolvedClues: highlightCompletedClues,
    })
  }, [
    activeCell,
    board,
    boardColors,
    canvasSize.height,
    canvasSize.width,
    highlightCompletedClues,
    layout,
    mode,
    previewCells,
    puzzle,
  ])

  const updateFromSnapshot = useCallback(
    (snapshot: InputControllerSnapshot) => {
      setPreviewCells(snapshot.previewCells)
      setActiveCell(snapshot.activeCell)
      setPreviewStartCell(snapshot.startCell)
      setPreviewPhase(snapshot.phase)
      setImpactCount(snapshot.previewCells.length)
    },
    [],
  )

  const setInteractionLock = useCallback((locked: boolean) => {
    if (typeof document === 'undefined' || interactionLockedRef.current === locked) {
      return
    }
    interactionLockedRef.current = locked
    document.body.classList.toggle('board-dragging', locked)
    appendDebugLog('interaction-lock', { locked })
  }, [appendDebugLog])

  const setCancelZoneHighlighted = useCallback((highlighted: boolean) => {
    if (cancelZoneHighlightedRef.current === highlighted) {
      return
    }
    cancelZoneHighlightedRef.current = highlighted
    setCancelZoneHighlightedState(highlighted)
  }, [])

  const updateCancelZoneHighlight = useCallback(
    (point: { x: number; y: number }) => {
      const zone = cancelActionZoneRef.current
      const highlighted = zone
        ? isPointInsideCancelActionZone(point, zone, CANCEL_ZONE_HOVER_HIT_SCALE)
        : false
      setCancelZoneHighlighted(highlighted)
      return highlighted
    },
    [setCancelZoneHighlighted],
  )

  const startPreview = useCallback(
    (point: { x: number; y: number }) => {
      const controller = controllerRef.current
      if (!controller) {
        return false
      }
      setCancelZoneHighlighted(false)
      const snapshot = controller.pointerDown(point)
      updateFromSnapshot(snapshot)
      const started = snapshot.phase === 'previewing'
      setInteractionLock(started)
      appendDebugLog('preview-start', {
        started,
        x: Math.round(point.x),
        y: Math.round(point.y),
      })
      return started
    },
    [appendDebugLog, setCancelZoneHighlighted, setInteractionLock, updateFromSnapshot],
  )

  const updatePreview = useCallback(
    (point: { x: number; y: number }) => {
      const controller = controllerRef.current
      if (!controller) {
        return
      }
      updateCancelZoneHighlight(point)
      updateFromSnapshot(controller.pointerMove(point))
      appendDebugLog('preview-move', {
        x: Math.round(point.x),
        y: Math.round(point.y),
      })
    },
    [appendDebugLog, updateCancelZoneHighlight, updateFromSnapshot],
  )

  const commitPreview = useCallback(
    (point: { x: number; y: number }) => {
      const controller = controllerRef.current
      if (!controller) {
        return
      }
      const snapshot = controller.getSnapshot()
      autoMarkAnchorsRef.current = collectAutoMarkAnchors(snapshot)
      updateFromSnapshot(controller.pointerUp(point))
      setCancelZoneHighlighted(false)
      setInteractionLock(false)
      appendDebugLog('preview-commit', {
        x: Math.round(point.x),
        y: Math.round(point.y),
      })
    },
    [
      appendDebugLog,
      collectAutoMarkAnchors,
      setCancelZoneHighlighted,
      setInteractionLock,
      updateFromSnapshot,
    ],
  )

  const cancelPreview = useCallback(() => {
    const controller = controllerRef.current
    if (!controller) {
      return
    }
    const snapshot = controller.getSnapshot()
    autoMarkAnchorsRef.current = collectAutoMarkAnchors(snapshot)
    updateFromSnapshot(controller.pointerCancel())
    setCancelZoneHighlighted(false)
    setInteractionLock(false)
    appendDebugLog('preview-cancel')
  }, [
    appendDebugLog,
    collectAutoMarkAnchors,
    setCancelZoneHighlighted,
    setInteractionLock,
    updateFromSnapshot,
  ])

  const abortPreview = useCallback(
    (reason: string) => {
      const controller = controllerRef.current
      if (!controller) {
        return
      }
      autoMarkAnchorsRef.current = []
      updateFromSnapshot(controller.pointerAbort())
      setCancelZoneHighlighted(false)
      setInteractionLock(false)
      appendDebugLog('preview-abort', { reason })
    },
    [appendDebugLog, setCancelZoneHighlighted, setInteractionLock, updateFromSnapshot],
  )

  const shouldAbortOnReleaseAtPoint = useCallback((point: { x: number; y: number }): boolean => {
    const zone = cancelActionZoneRef.current
    return zone
      ? isPointInsideCancelActionZone(point, zone, CANCEL_ZONE_RELEASE_HIT_SCALE)
      : false
  }, [])

  useEffect(() => {
    if (!autoMarkEnabled) {
      autoMarkAnchorsRef.current = []
      return
    }

    const anchorCells = autoMarkAnchorsRef.current
    if (anchorCells.length === 0) {
      return
    }
    autoMarkAnchorsRef.current = []

    const mergedAnchors = new Map<string, CellCoord>()
    for (const anchorCell of anchorCells) {
      mergedAnchors.set(`${anchorCell.row}:${anchorCell.col}`, anchorCell)
    }
    const diffAnchors = collectFilledDiffAnchors(previousBoardRef.current, board)
    for (const diffAnchor of diffAnchors) {
      mergedAnchors.set(`${diffAnchor.row}:${diffAnchor.col}`, diffAnchor)
    }
    if (mergedAnchors.size === 0) {
      return
    }

    const autoMarkCells = collectResolvedSegmentBoundaryCells({
      board,
      solution: puzzle.solution,
      clues: puzzle.clues,
      activeCells: [...mergedAnchors.values()],
    })
    if (autoMarkCells.length === 0) {
      return
    }

    onBatchCommit(autoMarkCells, 'mark-empty')
  }, [autoMarkEnabled, board, onBatchCommit, puzzle.clues, puzzle.solution])

  useEffect(() => {
    previousBoardRef.current = board
  }, [board])

  useEffect(() => {
    return () => {
      setInteractionLock(false)
    }
  }, [setInteractionLock])

  useEffect(() => {
    if (!debugEnabled) {
      return
    }
    appendDebugLog('debug-enabled', {
      pointerEvent: typeof window !== 'undefined' && 'PointerEvent' in window,
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'unknown',
    })
  }, [appendDebugLog, debugEnabled])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    const supportsPointer = typeof window !== 'undefined' && 'PointerEvent' in window

    if (supportsPointer) {
      const releaseCapture = (pointerId: number) => {
        if (!canvas.releasePointerCapture) {
          return
        }
        try {
          if (!canvas.hasPointerCapture || canvas.hasPointerCapture(pointerId)) {
            canvas.releasePointerCapture(pointerId)
          }
        } catch {
          // Ignore capture release errors from stale pointers.
        }
      }

      const onPointerDown = (event: PointerEvent) => {
        if (activePointerIdRef.current !== null) {
          return
        }

        // Primary button only, but keep touch/pen flexible.
        if (
          event.pointerType === 'mouse' &&
          (event.button !== 0 || (typeof event.buttons === 'number' && event.buttons === 0))
        ) {
          return
        }

        const started = startPreview(pointFromClient(event.clientX, event.clientY, canvas))
        appendDebugLog('pointer-down', {
          id: event.pointerId,
          pointerType: event.pointerType,
          button: event.button,
          buttons: event.buttons,
          started,
        })
        if (!started) {
          return
        }
        activePointerIdRef.current = event.pointerId
        if (canvas.setPointerCapture) {
          try {
            canvas.setPointerCapture(event.pointerId)
          } catch {
            // Ignore capture failures and continue with window-level listeners.
          }
        }
      }

      const onPointerMove = (event: PointerEvent) => {
        if (activePointerIdRef.current !== event.pointerId) {
          return
        }
        event.preventDefault()
        const point = pointFromClient(event.clientX, event.clientY, canvas)
        appendDebugLog('pointer-move', {
          id: event.pointerId,
          pointerType: event.pointerType,
        })
        updatePreview(point)
      }

      const onPointerUp = (event: PointerEvent) => {
        if (activePointerIdRef.current !== event.pointerId) {
          return
        }
        activePointerIdRef.current = null
        releaseCapture(event.pointerId)
        event.preventDefault()
        const point = pointFromClient(event.clientX, event.clientY, canvas)
        const shouldAbort = shouldAbortOnReleaseAtPoint(point)
        appendDebugLog('pointer-up', {
          id: event.pointerId,
          pointerType: event.pointerType,
          cancelByZone: shouldAbort,
        })
        if (shouldAbort) {
          abortPreview('cancel-zone-release')
          return
        }
        commitPreview(point)
      }

      const onPointerCancel = (event: PointerEvent) => {
        if (activePointerIdRef.current !== event.pointerId) {
          return
        }
        activePointerIdRef.current = null
        releaseCapture(event.pointerId)
        event.preventDefault()
        appendDebugLog('pointer-cancel', {
          id: event.pointerId,
          pointerType: event.pointerType,
        })
        cancelPreview()
      }

      canvas.addEventListener('pointerdown', onPointerDown)
      window.addEventListener('pointermove', onPointerMove, { passive: false })
      window.addEventListener('pointerup', onPointerUp, { passive: false })
      window.addEventListener('pointercancel', onPointerCancel, { passive: false })

      return () => {
        activePointerIdRef.current = null
        canvas.removeEventListener('pointerdown', onPointerDown)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerCancel)
      }
    }

    // Touch Events fallback for legacy browsers without Pointer Events support.
    const onTouchStart = (event: TouchEvent) => {
      if (activeTouchIdRef.current !== null) {
        event.preventDefault()
        return
      }

      const touch = event.changedTouches.item(0)
      if (!touch) {
        return
      }

      event.preventDefault()
      const started = startPreview(pointFromClient(touch.clientX, touch.clientY, canvas))
      appendDebugLog('touch-start', {
        id: touch.identifier,
        started,
      })
      if (!started) {
        return
      }
      activeTouchIdRef.current = touch.identifier
    }

    const onTouchMove = (event: TouchEvent) => {
      const activeTouchId = activeTouchIdRef.current
      if (activeTouchId === null) {
        return
      }

      const touch = findTouchById(event.touches, activeTouchId)
      if (!touch) {
        return
      }

      event.preventDefault()
      const point = pointFromClient(touch.clientX, touch.clientY, canvas)
      appendDebugLog('touch-move', {
        id: touch.identifier,
      })
      updatePreview(point)
    }

    const onTouchEnd = (event: TouchEvent) => {
      const activeTouchId = activeTouchIdRef.current
      if (activeTouchId === null) {
        return
      }

      const touch = findTouchById(event.changedTouches, activeTouchId)
      if (!touch) {
        return
      }

      activeTouchIdRef.current = null
      event.preventDefault()
      const point = pointFromClient(touch.clientX, touch.clientY, canvas)
      const shouldAbort = shouldAbortOnReleaseAtPoint(point)
      appendDebugLog('touch-end', {
        id: touch.identifier,
        cancelByZone: shouldAbort,
      })
      if (shouldAbort) {
        abortPreview('cancel-zone-release')
        return
      }
      commitPreview(point)
    }

    const onTouchCancel = (event: TouchEvent) => {
      if (activeTouchIdRef.current === null) {
        return
      }
      activeTouchIdRef.current = null
      event.preventDefault()
      appendDebugLog('touch-cancel')
      cancelPreview()
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: false })
    window.addEventListener('touchcancel', onTouchCancel, { passive: false })

    return () => {
      activeTouchIdRef.current = null
      canvas.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [
    abortPreview,
    appendDebugLog,
    cancelPreview,
    commitPreview,
    startPreview,
    shouldAbortOnReleaseAtPoint,
    updatePreview,
  ])

  const buildDebugPayload = useCallback(() => {
    const header = [
      `build=${__APP_BUILD_TIME__}`,
      `ua=${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
      `url=${typeof window !== 'undefined' ? window.location.href : 'unknown'}`,
      `now=${new Date().toISOString()}`,
    ]
    return [...header, '---', ...debugLogs].join('\n')
  }, [debugLogs])

  const copyText = useCallback(async (text: string): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        // Fallback to execCommand path below.
      }
    }

    if (typeof document === 'undefined') {
      return false
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  }, [])

  const copyDebugLogs = useCallback(() => {
    const content = buildDebugPayload()
    if (!content.trim()) {
      return
    }

    setDebugActionTip('')
    void copyText(content).then((copied) => {
      if (copied) {
        setDebugActionTip('已复制到剪贴板')
        return
      }
      if (typeof window !== 'undefined') {
        setDebugActionTip('复制失败，已弹窗显示内容')
        window.prompt('复制以下日志并发给开发者', content)
      }
    })
  }, [buildDebugPayload, copyText])

  const shareDebugLogs = useCallback(() => {
    const content = buildDebugPayload()
    if (!content.trim() || typeof navigator === 'undefined' || !navigator.share) {
      return
    }

    setDebugActionTip('')
    void navigator
      .share({
        title: 'Nonogram 输入调试日志',
        text: content,
      })
      .then(() => {
        setDebugActionTip('已打开分享面板')
      })
      .catch(() => {
        setDebugActionTip('分享取消或失败')
      })
  }, [buildDebugPayload])

  return (
    <div
      ref={containerRef}
      className="game-board-interaction relative h-[72vh] w-full rounded-xl border border-border"
    >
      {impactCount > 1 ? (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
          影响 {impactCount} 格
        </div>
      ) : null}

      {cancelActionZone ? (
        <div
          data-testid="gesture-cancel-zone"
          data-active={cancelZoneHighlighted ? 'true' : 'false'}
          aria-hidden="true"
          className={`pointer-events-none absolute z-20 flex items-center justify-center rounded-full text-white backdrop-blur-[1px] transition-[transform,background-color,border-color,box-shadow] duration-150 ${
            cancelZoneHighlighted
              ? 'border-red-200/90 bg-red-500/65 shadow-lg'
              : 'border-white/70 bg-black/45 shadow-lg'
          }`}
          style={{
            width: `${cancelActionZone.radius * 2}px`,
            height: `${cancelActionZone.radius * 2}px`,
            left: `${cancelActionZone.centerX - cancelActionZone.radius}px`,
            top: `${cancelActionZone.centerY - cancelActionZone.radius}px`,
            transform: cancelZoneHighlighted ? 'scale(1.12)' : 'scale(1)',
            boxShadow: cancelZoneHighlighted
              ? '0 0 0 6px rgba(248, 113, 113, 0.24), 0 10px 28px rgba(0, 0, 0, 0.3)'
              : '0 8px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          <span className="text-base leading-none">×</span>
        </div>
      ) : null}

      {debugEnabled ? (
        <div className="absolute inset-x-2 bottom-2 z-20 rounded-lg bg-black/80 p-2 text-[10px] text-white">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span>输入调试日志（最近 {debugLogs.length} 条）</span>
            <div className="flex gap-1">
              {canShareDebug ? (
                <button
                  type="button"
                  className="rounded border border-white/60 px-2 py-0.5"
                  onClick={shareDebugLogs}
                >
                  分享
                </button>
              ) : null}
              <button
                type="button"
                className="rounded border border-white/60 px-2 py-0.5"
                onClick={copyDebugLogs}
              >
                复制
              </button>
              <button
                type="button"
                className="rounded border border-white/60 px-2 py-0.5"
                onClick={() => {
                  setDebugLogs([])
                  setDebugActionTip('')
                }}
              >
                清空
              </button>
            </div>
          </div>
          {debugActionTip ? (
            <div className="mb-1 text-[9px] text-emerald-300">{debugActionTip}</div>
          ) : null}
          <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all text-[9px]">
            {debugLogs.join('\n') || '（暂无日志）'}
          </pre>
        </div>
      ) : null}

      <canvas
        ref={canvasRef}
        data-testid="game-board-canvas"
        className="h-full w-full touch-none"
      />
    </div>
  )
}
