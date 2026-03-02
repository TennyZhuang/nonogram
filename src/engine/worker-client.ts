import type { DifficultyTier, PuzzleDefinition } from '@/core/types'

interface WorkerRequest {
  requestId: number
  tier: DifficultyTier
  seed?: number
}

interface WorkerResponse {
  requestId: number
  ok: boolean
  puzzle?: PuzzleDefinition | null
  error?: string
}

let workerInstance: Worker | null = null
let nextRequestId = 1
let workerUnavailable = false

const pending = new Map<
  number,
  {
    resolve: (puzzle: PuzzleDefinition | null) => void
    reject: (reason?: unknown) => void
  }
>()

function getWorker(): Worker | null {
  if (workerUnavailable || typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null
  }

  if (workerInstance) {
    return workerInstance
  }

  try {
    workerInstance = new Worker(new URL('./worker-entry.ts', import.meta.url), {
      type: 'module',
    })
  } catch {
    workerUnavailable = true
    return null
  }

  workerInstance.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const payload = event.data
    const entry = pending.get(payload.requestId)
    if (!entry) {
      return
    }
    pending.delete(payload.requestId)

    if (payload.ok) {
      entry.resolve(payload.puzzle ?? null)
      return
    }

    entry.reject(new Error(payload.error ?? 'Puzzle worker failed'))
  }

  workerInstance.onerror = (error) => {
    for (const [, request] of pending) {
      request.reject(error)
    }
    pending.clear()
    workerInstance?.terminate()
    workerInstance = null
  }

  return workerInstance
}

export function generatePuzzleInWorker(
  tier: DifficultyTier,
  seed?: number,
): Promise<PuzzleDefinition | null> {
  const worker = getWorker()
  if (!worker) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const requestId = nextRequestId
    nextRequestId += 1
    pending.set(requestId, { resolve, reject })
    const payload: WorkerRequest = { requestId, tier, seed }
    worker.postMessage(payload)
  })
}
