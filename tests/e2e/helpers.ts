import type { Page } from '@playwright/test'

export async function skipOnboardingIfVisible(page: Page): Promise<void> {
  const skipButton = page.getByRole('button', { name: '跳过引导' })
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click()
  }
}
