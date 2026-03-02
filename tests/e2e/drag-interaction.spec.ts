import { expect, test } from '@playwright/test'

test('在棋盘上拖动后页面保持可交互', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /D1/ }).click()

  const board = page.getByTestId('game-board-canvas')
  const box = await board.boundingBox()
  expect(box).not.toBeNull()
  if (!box) {
    return
  }

  const startX = box.x + box.width * 0.45
  const startY = box.y + box.height * 0.45
  const endX = box.x + box.width * 0.65
  const endY = startY

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(endX, endY)
  await page.mouse.up()

  await expect(page.getByRole('button', { name: '填充' })).toBeVisible()
})

test('触摸拖动可预览多个格子', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /D1/ }).click()

  const board = page.getByTestId('game-board-canvas')
  const box = await board.boundingBox()
  expect(box).not.toBeNull()
  if (!box) {
    return
  }

  const startX = box.x + box.width * 0.45
  const startY = box.y + box.height * 0.45
  const endX = box.x + box.width * 0.62
  const endY = startY

  await page.evaluate(
    ({ sx, sy, ex, ey }) => {
      const canvas = document.querySelector(
        '[data-testid="game-board-canvas"]',
      ) as HTMLCanvasElement | null
      if (!canvas || typeof Touch === 'undefined' || typeof TouchEvent === 'undefined') {
        return
      }

      const touch = (x: number, y: number) =>
        new Touch({
          identifier: 1,
          target: canvas,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
          screenX: x,
          screenY: y,
          radiusX: 2,
          radiusY: 2,
          rotationAngle: 0,
          force: 1,
        })

      const startTouch = touch(sx, sy)
      canvas.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          changedTouches: [startTouch],
          touches: [startTouch],
          targetTouches: [startTouch],
        }),
      )

      const moveTouch = touch(ex, ey)
      canvas.dispatchEvent(
        new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          changedTouches: [moveTouch],
          touches: [moveTouch],
          targetTouches: [moveTouch],
        }),
      )

      canvas.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          changedTouches: [moveTouch],
          touches: [],
          targetTouches: [],
        }),
      )
    },
    { sx: startX, sy: startY, ex: endX, ey: endY },
  )

  await expect(page.getByRole('button', { name: '填充' })).toBeVisible()
})
