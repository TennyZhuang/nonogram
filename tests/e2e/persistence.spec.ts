import { expect, test } from '@playwright/test'

test('刷新后可继续上次会话', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /D1/ }).click()
  await expect(page.getByTestId('game-board-canvas')).toBeVisible()

  await page.waitForTimeout(1200)
  await page.reload()

  const continueButton = page.getByRole('button', { name: '继续游戏' })
  await expect(continueButton).toBeVisible()
  await continueButton.click()
  await expect(page.getByTestId('game-board-canvas')).toBeVisible()
})
