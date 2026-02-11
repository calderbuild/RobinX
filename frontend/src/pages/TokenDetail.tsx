import { useParams, Link } from 'react-router-dom'
import { useCurveDetail } from '../hooks/useCurveDetail'
import { useEthPrice } from '../hooks/useEthPrice'
import { formatUsd, formatEth, formatAge, truncateAddress } from '../lib/format'
import { basescanAddressUrl } from '../lib/chains'
import { AnalysisCard } from '../components/AnalysisCard'
import { PriceChart } from '../components/PriceChart'
import { TradeFeed } from '../components/TradeFeed'
import { HolderChart } from '../components/HolderChart'
import { TradePanel } from '../components/TradePanel'
import { PositionCard } from '../components/PositionCard'

export function TokenDetail() {
  const { id } = useParams<{ id: string }>()
  const { curve, trades, positions, loading, error, refetch } = useCurveDetail(id ?? '')
  const { ethUsd } = useEthPrice()

  if (loading && !curve) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-bg-card" />
        <div className="h-72 animate-pulse rounded-xl bg-bg-card" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-96 animate-pulse rounded-xl bg-bg-card" />
          <div className="h-96 animate-pulse rounded-xl bg-bg-card" />
        </div>
      </div>
    )
  }

  if (error || !curve) {
    return (
      <div className="rounded-xl border border-red/30 bg-red-dim p-6 text-center">
        <p className="text-sm text-red">{error ?? 'Token not found'}</p>
        <Link to="/" className="mt-2 inline-block text-sm text-blue hover:underline">
          Back to feed
        </Link>
      </div>
    )
  }

  const ethCollected = parseFloat(curve.ethCollected)
  const graduationProgress = Math.min(100, (ethCollected / 4.2) * 100)
  const marketCapUsd = parseFloat(curve.lastPriceUsd) * 1_000_000_000

  return (
    <div>
      {/* Breadcrumb */}
      <Link to="/" className="text-xs text-text-muted hover:text-text-secondary">
        Feed
      </Link>
      <span className="mx-1 text-xs text-text-muted">/</span>
      <span className="text-xs text-text-secondary">{curve.name}</span>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-text-primary">{curve.name}</h1>
            <span className="font-mono text-lg text-text-muted">${curve.symbol}</span>
            {curve.graduated && (
              <span className="rounded bg-green/20 px-2 py-0.5 text-xs font-medium text-green">
                Graduated
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
            <a
              href={basescanAddressUrl(curve.token)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-blue hover:underline"
            >
              {truncateAddress(curve.token, 6)}
            </a>
            <span>by {truncateAddress(curve.creator)}</span>
            <span>{formatAge(curve.createdAt)}</span>
          </div>
        </div>

        <div className="font-mono text-right">
          <p className="text-xl font-bold text-text-primary">{formatUsd(curve.lastPriceUsd)}</p>
          {curve.athPriceUsd && (
            <p className="text-xs text-text-muted">ATH {formatUsd(curve.athPriceUsd)}</p>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Market Cap', value: formatUsd(marketCapUsd) },
          { label: 'Volume', value: `${formatEth(curve.totalVolumeEth)} ETH` },
          { label: 'Trades', value: curve.tradeCount },
          { label: 'ETH Raised', value: `${formatEth(curve.ethCollected)} ETH` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-bg-card px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Curve progress */}
      <div className="mt-3 rounded-lg border border-border bg-bg-card px-4 py-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Bonding Curve Progress</span>
          <span className="font-mono text-text-secondary">{graduationProgress.toFixed(1)}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-primary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue to-green transition-all"
            style={{ width: `${graduationProgress}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[10px] text-text-muted">
          {formatEth(curve.ethCollected)} / 4.2 ETH
          {ethUsd > 0 && ` (~${formatUsd(ethCollected * ethUsd)})`}
        </p>
      </div>

      {/* Main content */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column: Chart + Trades */}
        <div className="space-y-6 lg:col-span-3">
          <PriceChart trades={trades} />
          <TradeFeed trades={trades} />
        </div>

        {/* Right column: Trade + Position + Analysis + Holders */}
        <div className="space-y-6 lg:col-span-2">
          <TradePanel curve={curve} onTradeSuccess={refetch} />
          <PositionCard curve={curve} />
          <AnalysisCard curve={curve} trades={trades} positions={positions} />
          <HolderChart positions={positions} />
        </div>
      </div>
    </div>
  )
}
