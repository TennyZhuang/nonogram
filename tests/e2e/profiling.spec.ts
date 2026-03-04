import { expect, test } from '@playwright/test'
import { skipOnboardingIfVisible } from './helpers'

interface PuzzleData {
  size: number
  solution: boolean[][]
  clues: { rows: number[][]; cols: number[][] }
}

interface PerformanceResult {
  tier: string
  gridSize: number
  filledCells: number
  totalClicks: number
  totalTimeMs: number
  avgClickMs: number
  maxClickMs: number
  p95ClickMs: number
  longTasks: number
  longTaskTotalMs: number
  longestTaskMs: number
  jsHeapUsedMB: number
  jsHeapTotalMB: number
  frameCount: number
  droppedFrames: number
}

async function profileGame(
  page: import('@playwright/test').Page,
  tier: string,
): Promise<PerformanceResult> {
  await page.goto('/')
  await skipOnboardingIfVisible(page)

  // Start game of specified difficulty
  await page.getByRole('button', { name: new RegExp(tier) }).click()

  const canvas = page.getByTestId('game-board-canvas')
  await expect(canvas).toBeVisible()

  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any
      const store = win.__gameStore
      if (!store || !win.__calculateBoardLayout) return false
      const state = store.getState()
      return state.currentPuzzle !== null && state.game !== null
    },
    undefined,
    { timeout: 15000 },
  )

  const puzzleData: PuzzleData = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (window as any).__gameStore
    if (!store) throw new Error('__gameStore not found')
    const state = store.getState()
    if (!state.currentPuzzle) throw new Error('currentPuzzle is null')
    const puzzle = state.currentPuzzle
    return {
      size: puzzle.size as number,
      solution: puzzle.solution as boolean[][],
      clues: puzzle.clues as { rows: number[][]; cols: number[][] },
    }
  })

  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) throw new Error('Canvas bounding box is null')

  const maxRowClueLength = Math.max(
    ...puzzleData.clues.rows.map((clue) => clue.join(' ').length),
    1,
  )
  const maxColClueLength = Math.max(
    ...puzzleData.clues.cols.map((clue) => clue.length),
    1,
  )

  const layout = await page.evaluate(
    ({ width, height, gridSize, maxRowClue, maxColClue }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = (window as any).__calculateBoardLayout
      if (!fn) throw new Error('__calculateBoardLayout not found')
      const result = fn({
        canvasWidth: width,
        canvasHeight: height,
        gridSize,
        maxRowClueLength: maxRowClue,
        maxColClueLength: maxColClue,
      })
      return {
        cellSize: result.cellSize as number,
        gridOriginX: result.gridOriginX as number,
        gridOriginY: result.gridOriginY as number,
      }
    },
    {
      width: box.width,
      height: box.height,
      gridSize: puzzleData.size,
      maxRowClue: maxRowClueLength,
      maxColClue: maxColClueLength,
    },
  )

  // Set up PerformanceObserver for long tasks before gameplay
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    win.__longTasks = []
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        win.__longTasks.push({
          duration: entry.duration,
          startTime: entry.startTime,
        })
      }
    })
    observer.observe({ type: 'longtask', buffered: true })
    win.__perfObserver = observer
  })

  // Collect cells to click
  const cellsToClick: { row: number; col: number }[] = []
  for (let row = 0; row < puzzleData.size; row++) {
    for (let col = 0; col < puzzleData.size; col++) {
      if (puzzleData.solution[row][col]) {
        cellsToClick.push({ row, col })
      }
    }
  }

  // Use CDP to get initial memory metrics
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')

  const initialMetrics = await cdp.send('Performance.getMetrics')
  const getMetricValue = (
    metrics: { metrics: { name: string; value: number }[] },
    name: string,
  ) => metrics.metrics.find((m) => m.name === name)?.value ?? 0

  const initialFrames = getMetricValue(initialMetrics, 'Frames')

  // Play the game and measure each click
  const clickTimings: number[] = []
  for (const cell of cellsToClick) {
    const clickX =
      box.x + layout.gridOriginX + cell.col * layout.cellSize + layout.cellSize / 2
    const clickY =
      box.y + layout.gridOriginY + cell.row * layout.cellSize + layout.cellSize / 2

    const before = performance.now()
    await page.mouse.click(clickX, clickY)
    const after = performance.now()
    clickTimings.push(after - before)
  }

  // Collect final metrics
  const finalMetrics = await cdp.send('Performance.getMetrics')
  const finalFrames = getMetricValue(finalMetrics, 'Frames')
  const jsHeapUsed = getMetricValue(finalMetrics, 'JSHeapUsedSize')
  const jsHeapTotal = getMetricValue(finalMetrics, 'JSHeapTotalSize')

  // Collect long tasks
  const longTasks = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    if (win.__perfObserver) win.__perfObserver.disconnect()
    return (win.__longTasks ?? []) as { duration: number; startTime: number }[]
  })

  await cdp.detach()

  // Calculate stats
  const totalTimeMs = clickTimings.reduce((sum, t) => sum + t, 0)
  const sorted = [...clickTimings].sort((a, b) => a - b)
  const p95Index = Math.floor(sorted.length * 0.95)
  const longTaskDurations = longTasks.map((t) => t.duration)
  const frameCount = finalFrames - initialFrames

  return {
    tier,
    gridSize: puzzleData.size,
    filledCells: cellsToClick.length,
    totalClicks: cellsToClick.length,
    totalTimeMs: Math.round(totalTimeMs),
    avgClickMs: Math.round(totalTimeMs / cellsToClick.length),
    maxClickMs: Math.round(Math.max(...clickTimings)),
    p95ClickMs: Math.round(sorted[p95Index] ?? 0),
    longTasks: longTasks.length,
    longTaskTotalMs: Math.round(
      longTaskDurations.reduce((sum, d) => sum + d, 0),
    ),
    longestTaskMs: Math.round(
      longTaskDurations.length > 0 ? Math.max(...longTaskDurations) : 0,
    ),
    jsHeapUsedMB: Math.round((jsHeapUsed / 1024 / 1024) * 100) / 100,
    jsHeapTotalMB: Math.round((jsHeapTotal / 1024 / 1024) * 100) / 100,
    frameCount,
    droppedFrames: 0, // Chromium doesn't expose this directly
  }
}

for (const tier of ['D5', 'D6']) {
  test(`profile ${tier} high-difficulty gameplay`, async ({ page }) => {
    test.setTimeout(60_000)
    const result = await profileGame(page, tier)

    console.log(`\n===== ${tier} Performance Profile =====`)
    console.log(`Grid: ${result.gridSize}x${result.gridSize}`)
    console.log(`Filled cells clicked: ${result.filledCells}`)
    console.log(`Total gameplay time: ${result.totalTimeMs}ms`)
    console.log(`Avg click latency: ${result.avgClickMs}ms`)
    console.log(`P95 click latency: ${result.p95ClickMs}ms`)
    console.log(`Max click latency: ${result.maxClickMs}ms`)
    console.log(`Long tasks (>50ms): ${result.longTasks}`)
    console.log(`Long task total: ${result.longTaskTotalMs}ms`)
    console.log(`Longest task: ${result.longestTaskMs}ms`)
    console.log(`JS Heap used: ${result.jsHeapUsedMB}MB`)
    console.log(`JS Heap total: ${result.jsHeapTotalMB}MB`)
    console.log(`Frames rendered: ${result.frameCount}`)
    console.log('=====================================\n')

    // Assertions: flag potential issues
    // Main thread should not be blocked for more than 200ms
    expect(
      result.longestTaskMs,
      `Longest task ${result.longestTaskMs}ms exceeds 200ms threshold`,
    ).toBeLessThan(200)

    // JS heap should stay under 100MB for a puzzle game
    expect(
      result.jsHeapUsedMB,
      `JS heap ${result.jsHeapUsedMB}MB exceeds 100MB`,
    ).toBeLessThan(100)

    // Average click-to-render latency should be under 100ms
    expect(
      result.avgClickMs,
      `Average click latency ${result.avgClickMs}ms exceeds 100ms`,
    ).toBeLessThan(100)
  })
}
