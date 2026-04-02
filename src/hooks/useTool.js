// useTool.js — React hook wrapping broker.callTool
//
// Usage:
//   const { data, loading, error, refetch } = useTool('pnl_get_analysis', { fiscal_year: 25 })
//
// Returns:
//   data    — ToolResult dict, or null while loading
//   loading — boolean
//   error   — Error object or null
//   refetch — call to re-invoke the tool (bypasses cache)

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react'
import { callTool } from '../api/broker.js'

// Module-level cache so data survives tab unmount/remount
const _cache = new Map()

// ── Global loading tracker ──────────────────────────────────
let _inflight = 0
const _listeners = new Set()
function _notify() { for (const fn of _listeners) fn() }
function _inc() { _inflight++; _notify() }
function _dec() { _inflight = Math.max(0, _inflight - 1); _notify() }
function _subscribe(cb) { _listeners.add(cb); return () => _listeners.delete(cb) }
function _getSnapshot() { return _inflight > 0 }

/** Returns true while any useTool call is in-flight. */
export function useGlobalLoading() {
  return useSyncExternalStore(_subscribe, _getSnapshot)
}

export function useTool(toolName, params = {}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const paramsKey = JSON.stringify(params)
  const cacheKey  = `${toolName}|${paramsKey}`
  const cacheKeyRef = useRef(cacheKey)
  cacheKeyRef.current = cacheKey

  const applyResult = useCallback((result) => {
    // Always expose the response as data so charts can render zeros.
    // Only set error as an informational flag — never null-out data
    // when the broker actually returned a response body.
    if (result?.result?.error || result?.result?.type === 'DatabaseError') {
      setError(new Error(result.result.error || 'Tool returned an error'))
    } else {
      setError(null)
    }
    setData(result)
  }, [])

  const fetchFromServer = useCallback(async () => {
    setLoading(true)
    setError(null)
    _inc()
    try {
      const result = await callTool(toolName, params)
      const key = cacheKeyRef.current
      _cache.set(key, { result, err: null })
      applyResult(result)
    } catch (e) {
      setError(e)
      setData(null)
    } finally {
      setLoading(false)
      _dec()
    }
  }, [toolName, paramsKey, applyResult]) // eslint-disable-line react-hooks/exhaustive-deps

  // On mount / param change: use cache if available, else fetch
  useEffect(() => {
    const cached = _cache.get(cacheKey)
    if (cached) {
      applyResult(cached.result)
      setLoading(false)
    } else {
      fetchFromServer()
    }
  }, [cacheKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // refetch always bypasses cache
  const refetch = useCallback(() => fetchFromServer(), [fetchFromServer])

  return { data, loading, error, refetch }
}
