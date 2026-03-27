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

import { useState, useEffect, useCallback, useRef } from 'react'
import { callTool } from '../api/broker.js'

// Module-level cache so data survives tab unmount/remount
const _cache = new Map()

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
