import { useCallback, useEffect, useState } from 'react'
import { type Curve, type CurveSortField, fetchCurves } from '../lib/goldsky'

interface UseCurvesResult {
  curves: Curve[]
  loading: boolean
  error: string | null
  refetch: () => void
}

const POLL_INTERVAL = 10_000

export function useCurves(
  orderBy: CurveSortField = 'totalVolumeEth',
  first = 50,
): UseCurvesResult {
  const [curves, setCurves] = useState<Curve[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchCurves(orderBy, first)
      setCurves(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch curves')
    } finally {
      setLoading(false)
    }
  }, [orderBy, first])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [load])

  return { curves, loading, error, refetch: load }
}
