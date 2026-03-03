import { expect, test } from '@playwright/test'
import { skipOnboardingIfVisible } from './helpers'

interface PuzzleData {
  size: number
  solution: boolean[][]
  clues: { rows: number[][]; cols: number[][] }
}

test('用求解器完整打通一盘 D1 游戏', async ({ page }) => {
  await page.goto('/')
  await skipOnboardingIfVisible(page)

  // Start a D1 game
  await page.getByRole('button', { name: /D1/ }).click()

  // Wait for game board to be visible
  const canvas = page.getByTestId('game-board-canvas')
  await expect(canvas).toBeVisible()

  // Wait for the game store to have a puzzle ready (deterministic wait)
  await page.waitForFunction(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (window as any).__gameStore
    if (!store) return false
    const state = store.getState()
    return state.currentPuzzle !== null && state.game !== null
  }, undefined, { timeout: 10000 })

  // Extract puzzle data from the Zustand store
  const puzzleData: PuzzleData = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (window as any).__gameStore
    if (!store) throw new Error('__gameStore not found on window')
    const state = store.getState()
    if (!state.currentPuzzle) throw new Error('currentPuzzle is null')
    const puzzle = state.currentPuzzle
    return {
      size: puzzle.size as number,
      solution: puzzle.solution as boolean[][],
      clues: puzzle.clues as { rows: number[][]; cols: number[][] },
    }
  })

  expect(puzzleData.size).toBeGreaterThan(0)
  expect(puzzleData.solution.length).toBe(puzzleData.size)

  // Get canvas bounding box
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  // Compute board layout using the app's own calculateBoardLayout (no duplication)
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
      if (!fn) throw new Error('__calculateBoardLayout not found on window')
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

  // Click each cell that should be filled according to the solution
  for (let row = 0; row < puzzleData.size; row++) {
    for (let col = 0; col < puzzleData.size; col++) {
      if (puzzleData.solution[row][col]) {
        const clickX = box.x + layout.gridOriginX + col * layout.cellSize + layout.cellSize / 2
        const clickY = box.y + layout.gridOriginY + row * layout.cellSize + layout.cellSize / 2
        await page.mouse.click(clickX, clickY)
      }
    }
  }

  // Verify the game is cleared
  await expect(page.getByText('通关成功')).toBeVisible({ timeout: 5000 })

  // Verify zero mistakes
  const gameState = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (window as any).__gameStore
    if (!store) throw new Error('__gameStore not found on window')
    const state = store.getState()
    if (!state.game) throw new Error('game state is null')
    return {
      status: state.game.status as string,
      mistakes: state.game.mistakes as number,
    }
  })
  expect(gameState.status).toBe('cleared')
  expect(gameState.mistakes).toBe(0)
})
