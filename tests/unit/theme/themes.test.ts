import {
  DEFAULT_THEME,
  getThemeUnlockRequirement,
  isThemeUnlocked,
  THEME_OPTIONS,
  normalizeThemeId,
} from '@/theme/themes'

describe('theme presets', () => {
  it('falls back to default theme for unknown values', () => {
    expect(normalizeThemeId(undefined)).toBe(DEFAULT_THEME)
    expect(normalizeThemeId('light')).toBe(DEFAULT_THEME)
    expect(normalizeThemeId('dark')).toBe(DEFAULT_THEME)
    expect(normalizeThemeId('unknown')).toBe(DEFAULT_THEME)
  })

  it('accepts all declared theme ids', () => {
    for (const option of THEME_OPTIONS) {
      expect(normalizeThemeId(option.id)).toBe(option.id)
    }
  })

  it('requires achievements for locked themes', () => {
    expect(isThemeUnlocked('ink', [])).toBe(true)
    expect(isThemeUnlocked('jade', [])).toBe(false)
    expect(isThemeUnlocked('jade', ['first-clear'])).toBe(true)
    expect(isThemeUnlocked('sunset', ['first-d5'])).toBe(true)
    expect(isThemeUnlocked('plum', ['first-d6'])).toBe(true)
  })

  it('exposes unlock requirement copy', () => {
    expect(getThemeUnlockRequirement('ink')).toBeNull()
    expect(getThemeUnlockRequirement('jade')?.description).toBe('通关任意一局后解锁')
  })
})
