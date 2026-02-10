import type { Trade } from '../lib/goldsky'
import { formatEth, truncateAddress, timeAgo } from '../lib/format'
import { basescanTxUrl } from '../lib/chains'

interface TradeFeedProps {
  trades: Trade[]
}

export function TradeFeed({ trades }: TradeFeedProps) {
  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6">
        <h3 className="font-display text-base font-semibold text-text-primary">Trade Feed</h3>
        <p className="mt-2 text-sm text-text-muted">No trades yet</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-display text-base font-semibold text-text-primary">Trade Feed</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-bg-card">
            <tr className="border-b border-border text-left text-text-muted">
              <th className="px-4 py-2 font-medium">Side</th>
              <th className="px-4 py-2 font-medium">ETH</th>
              <th className="px-4 py-2 font-medium">Tokens</th>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">Trader</th>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const isBuy = trade.side === 'BUY'
              return (
                <tr
                  key={trade.id}
                  className="border-b border-border/30 transition-colors hover:bg-bg-hover"
                >
                  <td className="px-4 py-2">
                    <span className={`font-semibold ${isBuy ? 'text-green' : 'text-red'}`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-text-primary">
                    {formatEth(trade.amountEth)}
                  </td>
                  <td className="px-4 py-2 font-mono text-text-secondary">
                    {parseFloat(trade.amountToken).toFixed(0)}
                  </td>
                  <td className="hidden px-4 py-2 font-mono text-text-muted sm:table-cell">
                    {truncateAddress(trade.trader)}
                  </td>
                  <td className="px-4 py-2 text-text-muted">
                    {timeAgo(trade.timestamp)}
                  </td>
                  <td className="px-4 py-2">
                    <a
                      href={basescanTxUrl(trade.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue hover:underline"
                    >
                      View
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
