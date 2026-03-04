const DEBUG_STORAGE_KEY = 'nonogram_debug_input'

export function readDebugInputEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const params = new URLSearchParams(window.location.search)
  const queryFlag = params.get('debugInput') ?? params.get('dbg_input')

  if (queryFlag === '1') {
    window.localStorage.setItem(DEBUG_STORAGE_KEY, '1')
    return true
  }

  if (queryFlag === '0') {
    window.localStorage.removeItem(DEBUG_STORAGE_KEY)
    return false
  }

  return window.localStorage.getItem(DEBUG_STORAGE_KEY) === '1'
}
