import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { Curve } from '../lib/goldsky'
import { formatUsd, formatEth, formatAge, truncateAddress } from '../lib/format'
import { ScoreBadge } from './ScoreBadge'
import { getAnalysisFromCache } from '../lib/demoAnalysis'

export const TokenCard = memo(function TokenCard({ curve }: { curve: Curve }) {
  const cached = getAnalysisFromCache(curve.id)
  const ethCollected = parseFloat(curve.ethCollected)
  const graduationProgress = Math.min(100, (ethCollected / 4.2) * 100)

  return (
    <Link
      to={`/token/${curve.id}`}
      className="group block rounded-xl border border-border bg-bg-card p-4 no-underline transition-all hover:border-border-light hover:bg-bg-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-sm font-semibold text-text-primary">
              {curve.name}
            </h3>
            {curve.graduated && (
              <span className="shrink-0 rounded bg-green/20 px-1.5 py-0.5 text-[10px] font-medium text-green">
                GRAD
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-xs text-text-muted">
            ${curve.symbol}
          </p>
        </div>
        {cached && <ScoreBadge score={cached.overall_score} />}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div>
          <span className="text-text-muted">Price</span>
          <p className="font-mono text-text-primary">
            {formatUsd(curve.lastPriceUsd)}
          </p>
        </div>
        <div>
          <span className="text-text-muted">Volume</span>
          <p className="font-mono text-text-primary">
            {formatEth(curve.totalVolumeEth)} ETH
          </p>
        </div>
        <div>
          <span className="text-text-muted">Trades</span>
          <p className="font-mono text-text-primary">{curve.tradeCount}</p>
        </div>
        <div>
          <span className="text-text-muted">Age</span>
          <p className="text-text-primary">{formatAge(curve.createdAt)}</p>
        </div>
      </div>

      {/* Bonding curve progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-text-muted">Curve Progress</span>
          <span className="font-mono text-text-secondary">{graduationProgress.toFixed(1)}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-primary">
          <div
            className="h-full rounded-full bg-blue transition-all"
            style={{ width: `${graduationProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-text-muted">
        <span>by {truncateAddress(curve.creator)}</span>
        <span className="font-mono">{formatEth(curve.ethCollected)} ETH raised</span>
      </div>
    </Link>
  )
})
