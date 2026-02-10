import { useCallback, useEffect, useState } from 'react'
import { fetchEthUsd } from '../lib/goldsky'

const POLL_INTERVAL = 30_000

export function useEthPrice(): { ethUsd: number; loading: boolean } {
  const [ethUsd, setEthUsd] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const price = await fetchEthUsd()
      setEthUsd(price)
    } catch {
      // keep last known price
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [load])

  return { ethUsd, loading }
}
