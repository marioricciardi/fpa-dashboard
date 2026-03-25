// useTool.js — React hook wrapping broker.callTool
//
// Usage:
//   const { data, loading, error, refetch } = useTool('pnl_get_analysis', { fiscal_year: 25 })
//
// Returns:
//   data    — ToolResult dict, or null while loading
//   loading — boolean
//   error   — Error object or null
//   refetch — call to re-invoke the tool with the same params

import { useState, useEffect, useCallback } from 'react'
import { callTool } from '../api/broker.js'

export function useTool(toolName, params = {}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Stable params key so effect only re-runs when params actually change
  const paramsKey = JSON.stringify(params)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await callTool(toolName, params)
      setData(result)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [toolName, paramsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { run() }, [run])

  return { data, loading, error, refetch: run }
}
