/// <reference lib="webworker" />

import type { DifficultyTier } from '@/core/types'
import { searchPuzzle } from '@/engine/search-service'

interface WorkerRequest {
  requestId: number
  tier: DifficultyTier
  seed?: number
}

interface WorkerResponseSuccess {
  requestId: number
  ok: true
  puzzle: ReturnType<typeof searchPuzzle>
}

interface WorkerResponseFailure {
  requestId: number
  ok: false
  error: string
}

type WorkerResponse = WorkerResponseSuccess | WorkerResponseFailure

self.onmessage = (event: MessageEvent<WorkerRequest>): void => {
  try {
    const { requestId, tier, seed } = event.data
    const puzzle = searchPuzzle({ tier, seed })
    const response: WorkerResponse = { requestId, ok: true, puzzle }
    self.postMessage(response)
  } catch (error) {
    const { requestId } = event.data
    const response: WorkerResponse = {
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown worker error',
    }
    self.postMessage(response)
  }
}

export {}
