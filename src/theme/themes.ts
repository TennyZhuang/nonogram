export const THEME_OPTIONS = [
  {
    id: 'ink',
    name: '墨韵',
    description: '米白纸面与朱砂点缀，古雅沉稳。',
    swatches: ['#faf7ef', '#7a2d22', '#2b1a0f'],
  },
  {
    id: 'jade',
    name: '竹青',
    description: '清润青绿配色，轻盈耐看。',
    swatches: ['#f2f7f1', '#2f6f4f', '#1a3a2a'],
  },
  {
    id: 'sunset',
    name: '赤金',
    description: '暖调夕霞与金砂，明快有层次。',
    swatches: ['#fff4ec', '#b6492d', '#5c2f22'],
  },
  {
    id: 'plum',
    name: '夜梅',
    description: '深夜绛紫基底，低饱和高对比。',
    swatches: ['#1f1b2b', '#c188e5', '#f4edf9'],
  },
] as const

export type ThemeId = (typeof THEME_OPTIONS)[number]['id']

export const DEFAULT_THEME: ThemeId = 'ink'

const VALID_THEME_IDS = new Set<string>(THEME_OPTIONS.map((item) => item.id))

export function normalizeThemeId(value: string | null | undefined): ThemeId {
  if (value && VALID_THEME_IDS.has(value)) {
    return value as ThemeId
  }
  return DEFAULT_THEME
}
