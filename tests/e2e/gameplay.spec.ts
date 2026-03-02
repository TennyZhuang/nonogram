import { expect, test } from '@playwright/test'

test('可以选择难度并进入游戏', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /D1/ }).click()

  await expect(page.getByTestId('game-board-canvas')).toBeVisible()
  await expect(page.getByLabel('计时器')).toBeVisible()
  await expect(page.getByLabel('生命值')).toContainText('3')
})

test('模式切换按钮可切换为标空', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /D1/ }).click()

  const markEmptyButton = page.getByRole('button', { name: '标空' })
  await markEmptyButton.click()
  await expect(markEmptyButton).toHaveAttribute('aria-pressed', 'true')
})
