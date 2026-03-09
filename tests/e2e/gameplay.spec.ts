import { expect, test } from '@playwright/test'
import { skipOnboardingIfVisible } from './helpers'

test('可以选择难度并进入游戏', async ({ page }) => {
  await page.goto('/')
  await skipOnboardingIfVisible(page)
  await page.getByRole('button', { name: /D1/ }).click()

  await expect(page.getByTestId('game-board-canvas')).toBeVisible()
  await expect(page.getByLabel('计时器')).toBeVisible()
  await expect(page.getByLabel('生命值')).toContainText('3')
})

test('模式切换按钮可切换为标空', async ({ page }) => {
  await page.goto('/')
  await skipOnboardingIfVisible(page)
  await page.getByRole('button', { name: /D1/ }).click()

  const markEmptyButton = page.getByRole('button', { name: '标空' })
  await markEmptyButton.click()
  await expect(markEmptyButton).toHaveAttribute('aria-pressed', 'true')
})


test('移动端底部主操作不会被音效按钮遮挡', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 })
  await page.goto('/')

  const floatingSoundButton = page.locator('button[title="关闭音效"], button[title="开启音效"]')
  await expect(floatingSoundButton).toHaveCount(1)
  await expect(floatingSoundButton).toBeHidden()

  const nextButton = page.getByRole('button', { name: '下一步' })
  const nextBox = await nextButton.boundingBox()
  expect(nextBox).not.toBeNull()
  if (!nextBox) {
    return
  }

  await page.mouse.click(nextBox.x + nextBox.width - 4, nextBox.y + nextBox.height - 4)
  await expect(page.getByText('第 2 / 4 步')).toBeVisible()

  await page.getByRole('button', { name: '跳过引导' }).click()
  await page.getByRole('button', { name: /D1/ }).click()

  const markEmptyButton = page.getByRole('button', { name: '标空' })
  const markEmptyBox = await markEmptyButton.boundingBox()
  expect(markEmptyBox).not.toBeNull()
  if (!markEmptyBox) {
    return
  }

  await page.mouse.click(
    markEmptyBox.x + markEmptyBox.width - 4,
    markEmptyBox.y + markEmptyBox.height - 4,
  )
  await expect(markEmptyButton).toHaveAttribute('aria-pressed', 'true')
})
