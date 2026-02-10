import { useEffect, useState, useCallback } from 'react'
import { fetchTopTraders } from '../lib/goldsky'
import { truncateAddress, formatEth } from '../lib/format'
import { basescanAddressUrl } from '../lib/chains'

interface TraderRow {
  address: string
  pnlEth: number
  totalSpent: number
  totalReceived: number
  buyCount: number
  sellCount: number
}

export function Leaderboard() {
  const [traders, setTraders] = useState<TraderRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const positions = await fetchTopTraders(200)

      // Aggregate by user
      const byUser = new Map<string, TraderRow>()
      for (const p of positions) {
        const addr = p.user.id
        const existing = byUser.get(addr)
        if (existing) {
          existing.pnlEth += p.pnlEth
          existing.totalSpent += parseFloat(p.totalEthSpent)
          existing.totalReceived += parseFloat(p.totalEthReceived)
          existing.buyCount += parseInt(p.buyCount)
          existing.sellCount += parseInt(p.sellCount)
        } else {
          byUser.set(addr, {
            address: addr,
            pnlEth: p.pnlEth,
            totalSpent: parseFloat(p.totalEthSpent),
            totalReceived: parseFloat(p.totalEthReceived),
            buyCount: parseInt(p.buyCount),
            sellCount: parseInt(p.sellCount),
          })
        }
      }

      const sorted = Array.from(byUser.values()).sort((a, b) => b.pnlEth - a.pnlEth)
      setTraders(sorted.slice(0, 50))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-text-primary">Leaderboard</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Top traders by realized PnL on RobinPump
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-bg-hover" />
            ))}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Trader</th>
                <th className="px-4 py-3 font-medium text-right">PnL (ETH)</th>
                <th className="hidden px-4 py-3 font-medium text-right sm:table-cell">Spent</th>
                <th className="hidden px-4 py-3 font-medium text-right sm:table-cell">Received</th>
                <th className="px-4 py-3 font-medium text-right">Trades</th>
              </tr>
            </thead>
            <tbody>
              {traders.map((t, i) => {
                const isPositive = t.pnlEth >= 0
                return (
                  <tr key={t.address} className="border-b border-border/30 hover:bg-bg-hover">
                    <td className="px-4 py-2.5 font-mono text-text-muted">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <a
                        href={basescanAddressUrl(t.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue hover:underline"
                      >
                        {truncateAddress(t.address, 6)}
                      </a>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${isPositive ? 'text-green' : 'text-red'}`}>
                      {isPositive ? '+' : ''}{formatEth(t.pnlEth)}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right font-mono text-text-secondary sm:table-cell">
                      {formatEth(t.totalSpent)}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right font-mono text-text-secondary sm:table-cell">
                      {formatEth(t.totalReceived)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-text-muted">
                      {t.buyCount + t.sellCount}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
