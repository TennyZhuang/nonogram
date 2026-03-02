import { DEFAULT_THEME, THEME_OPTIONS, normalizeThemeId } from '@/theme/themes'

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
})
