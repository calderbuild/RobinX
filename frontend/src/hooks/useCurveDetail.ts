import { useCallback, useEffect, useState } from 'react'
import { type Curve, type Trade, type Position, fetchCurve, fetchTrades, fetchPositions } from '../lib/goldsky'

interface UseCurveDetailResult {
  curve: Curve | null
  trades: Trade[]
  positions: Position[]
  loading: boolean
  error: string | null
  refetch: () => void
}

const POLL_INTERVAL = 5_000

export function useCurveDetail(id: string): UseCurveDetailResult {
  const [curve, setCurve] = useState<Curve | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [curveData, tradeData, positionData] = await Promise.all([
        fetchCurve(id),
        fetchTrades(id),
        fetchPositions(id),
      ])
      setCurve(curveData)
      setTrades(tradeData)
      setPositions(positionData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch curve details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    load()
    const interval = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [load])

  return { curve, trades, positions, loading, error, refetch: load }
}
