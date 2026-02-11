import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { getTokenBalance } from '../lib/contracts'
import { fetchUserPosition, type Position, type Curve } from '../lib/goldsky'
import { formatEth, formatNumber } from '../lib/format'

interface PositionCardProps {
  curve: Curve
}

export function PositionCard({ curve }: PositionCardProps) {
  const { address, signer } = useWallet()
  const [position, setPosition] = useState<Position | null>(null)
  const [tokenBalance, setTokenBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) {
      setPosition(null)
      setTokenBalance(null)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const pos = await fetchUserPosition(curve.id, address!)
        if (!cancelled) setPosition(pos)

        if (signer?.provider) {
          const { balance } = await getTokenBalance(curve.token, address!, signer.provider)
          if (!cancelled) setTokenBalance(balance)
        }
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 10_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [address, signer, curve.id, curve.token])

  if (!address) return null
  if (loading && !position && !tokenBalance) return null

  const hasPosition = position || (tokenBalance && parseFloat(tokenBalance) > 0)
  if (!hasPosition) return null

  const currentPrice = parseFloat(curve.lastPriceEth)
  const balance = tokenBalance ? parseFloat(tokenBalance) : 0
  const currentValueEth = balance * currentPrice

  const costBasis = position ? parseFloat(position.totalEthSpent) : 0
  const realizedEth = position ? parseFloat(position.totalEthReceived) : 0
  const unrealizedPnl = currentValueEth - costBasis + realizedEth
  const pnlPercent = costBasis > 0 ? ((currentValueEth + realizedEth - costBasis) / costBasis) * 100 : 0
  const pnlColor = unrealizedPnl >= 0 ? 'text-green' : 'text-red'

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <h3 className="font-display text-sm font-semibold text-text-primary">Your Position</h3>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Holdings</span>
          <span className="font-mono text-text-primary">{formatNumber(balance)} {curve.symbol}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Current value</span>
          <span className="font-mono text-text-primary">{formatEth(currentValueEth)} ETH</span>
        </div>

        {costBasis > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Cost basis</span>
            <span className="font-mono text-text-secondary">{formatEth(costBasis)} ETH</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">PnL</span>
          <span className={`font-mono font-medium ${pnlColor}`}>
            {unrealizedPnl >= 0 ? '+' : ''}{formatEth(unrealizedPnl)} ETH
            {costBasis > 0 && ` (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(1)}%)`}
          </span>
        </div>

        {position && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Trades</span>
            <span className="font-mono text-text-secondary">
              {position.buyCount} buys / {position.sellCount} sells
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
