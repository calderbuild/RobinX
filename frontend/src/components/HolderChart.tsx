import type { Position } from '../lib/goldsky'
import { truncateAddress } from '../lib/format'

interface HolderChartProps {
  positions: Position[]
}

export function HolderChart({ positions }: HolderChartProps) {
  const holdings = positions
    .map((p) => ({
      address: p.user.id,
      held: Math.max(0, parseFloat(p.totalTokensBought) - parseFloat(p.totalTokensSold)),
    }))
    .filter((h) => h.held > 0)
    .sort((a, b) => b.held - a.held)
    .slice(0, 10)

  const total = holdings.reduce((s, h) => s + h.held, 0)

  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6">
        <h3 className="font-display text-base font-semibold text-text-primary">Holder Distribution</h3>
        <p className="mt-2 text-sm text-text-muted">No holder data</p>
      </div>
    )
  }

  const colors = [
    '#3b82f6', '#3fb68b', '#f0b90b', '#ff5252', '#a78bfa',
    '#ff9800', '#06b6d4', '#ec4899', '#84cc16', '#6366f1',
  ]

  return (
    <div className="rounded-xl border border-border bg-bg-card p-6">
      <h3 className="font-display text-base font-semibold text-text-primary">Top 10 Holders</h3>

      <div className="mt-4 space-y-2.5">
        {holdings.map((h, i) => {
          const pct = total > 0 ? (h.held / total) * 100 : 0
          return (
            <div key={h.address}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-text-secondary">
                  {truncateAddress(h.address)}
                </span>
                <span className="font-mono text-text-muted">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-primary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: colors[i % colors.length],
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-text-muted">Top 10 Concentration</span>
        <span className="font-mono font-semibold text-text-primary">
          {total > 0 ? ((holdings.reduce((s, h) => s + h.held, 0) / total) * 100).toFixed(1) : 0}%
        </span>
      </div>
    </div>
  )
}
