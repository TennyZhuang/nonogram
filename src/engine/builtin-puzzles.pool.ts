import { BUILTIN_PUZZLES_D6_RAW } from '@/engine/builtin-puzzles.d6.data'
import { BUILTIN_PUZZLES_RAW as LEGACY_BUILTIN_PUZZLES_RAW } from '@/engine/builtin-puzzles.data'

export const BUILTIN_PUZZLES_RAW = {
  ...LEGACY_BUILTIN_PUZZLES_RAW,
  6: BUILTIN_PUZZLES_D6_RAW,
}
