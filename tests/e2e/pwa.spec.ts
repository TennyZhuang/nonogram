import { expect, test } from '@playwright/test'

test('manifest 可访问', async ({ page }) => {
  await page.goto('/')
  const response = await page.request.get('/manifest.webmanifest')
  expect(response.status()).toBe(200)
})

test('service worker 可注册', async ({ page }) => {
  await page.goto('/')
  const hasController = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) {
      return false
    }
    await navigator.serviceWorker.ready
    return true
  })
  expect(hasController).toBe(true)
})
