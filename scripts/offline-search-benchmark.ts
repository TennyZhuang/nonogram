import type { DifficultyTier } from '@/core/types'
import { searchPuzzleWithTiming } from '@/engine/search-service'

const ALL_TIERS: DifficultyTier[] = [1, 2, 3, 4, 5, 6]

interface CliOptions {
  count: number
  tiers: DifficultyTier[]
  baseSeed: number
}

interface TierTimingSummary {
  tier: DifficultyTier
  successCount: number
  failureCount: number
  elapsedMsList: number[]
}

function readArgValue(args: string[], flag: string): string | null {
  const exact = `${flag}=`
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index]
    if (current.startsWith(exact)) {
      return current.slice(exact.length)
    }
    if (current === flag) {
      return args[index + 1] ?? null
    }
  }
  return null
}

function parseTiers(value: string | null): DifficultyTier[] {
  if (!value) {
    return ALL_TIERS
  }

  const raw = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
  if (raw.length === 0) {
    return ALL_TIERS
  }

  const tiers: DifficultyTier[] = []
  for (const item of raw) {
    const parsed = Number(item)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 6) {
      throw new Error(`Invalid tier: ${item}`)
    }
    const tier = parsed as DifficultyTier
    if (!tiers.includes(tier)) {
      tiers.push(tier)
    }
  }

  return tiers
}

function parsePositiveInt(value: string | null, fallback: number, label: string): number {
  if (!value) {
    return fallback
  }
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`)
  }
  return parsed
}

function parseInteger(value: string | null, fallback: number, label: string): number {
  if (!value) {
    return fallback
  }
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${label}: ${value}`)
  }
  return parsed
}

function parseOptions(args: string[]): CliOptions {
  return {
    count: parsePositiveInt(readArgValue(args, '--count'), 3, 'count'),
    tiers: parseTiers(readArgValue(args, '--tiers')),
    baseSeed: parseInteger(readArgValue(args, '--base-seed'), 100_000, 'base-seed'),
  }
}

function toMs(value: number): string {
  return `${value.toFixed(1)}ms`
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((sum, item) => sum + item, 0) / values.length
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((left, right) => left - right)
  const idx = Math.min(sorted.length - 1, Math.ceil((sorted.length - 1) * p))
  return sorted[idx]
}

function runTier(tier: DifficultyTier, count: number, baseSeed: number): TierTimingSummary {
  const summary: TierTimingSummary = {
    tier,
    successCount: 0,
    failureCount: 0,
    elapsedMsList: [],
  }

  for (let index = 0; index < count; index += 1) {
    const seed = baseSeed + tier * 1_000_000 + index * 7_919
    const result = searchPuzzleWithTiming({ tier, seed })
    if (result.puzzle) {
      summary.successCount += 1
      summary.elapsedMsList.push(result.elapsedMs)
      console.log(
        `tier ${tier} #${index + 1}: ok seed=${seed} id=${result.puzzle.id} time=${toMs(result.elapsedMs)}`,
      )
      continue
    }

    summary.failureCount += 1
    console.log(`tier ${tier} #${index + 1}: fail seed=${seed} time=${toMs(result.elapsedMs)}`)
  }

  return summary
}

function printSummary(results: TierTimingSummary[]): void {
  console.log('\n== Offline search timing summary ==')
  for (const item of results) {
    const avgMs = average(item.elapsedMsList)
    const p95Ms = percentile(item.elapsedMsList, 0.95)
    const maxMs = item.elapsedMsList.length > 0 ? Math.max(...item.elapsedMsList) : 0
    console.log(
      `tier ${item.tier}: success=${item.successCount} fail=${item.failureCount} avg=${toMs(avgMs)} p95=${toMs(p95Ms)} max=${toMs(maxMs)}`,
    )
  }
}

function main(): void {
  const options = parseOptions(process.argv.slice(2))
  console.log(
    `Running local offline puzzle search: count=${options.count}, tiers=${options.tiers.join(',')}, baseSeed=${options.baseSeed}`,
  )
  const startedAt = Date.now()
  const results = options.tiers.map((tier) => runTier(tier, options.count, options.baseSeed))
  const totalMs = Date.now() - startedAt
  printSummary(results)
  console.log(`total elapsed: ${toMs(totalMs)}`)
}

main()
