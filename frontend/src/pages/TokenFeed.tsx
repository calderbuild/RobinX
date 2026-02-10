import { useState, useMemo } from 'react'
import { useCurves } from '../hooks/useCurves'
import { useEthPrice } from '../hooks/useEthPrice'
import { TokenCard } from '../components/TokenCard'
import type { CurveSortField } from '../lib/goldsky'

const SORT_OPTIONS: { value: CurveSortField; label: string }[] = [
  { value: 'totalVolumeEth', label: 'Volume' },
  { value: 'createdAt', label: 'Newest' },
  { value: 'lastPriceUsd', label: 'Price' },
  { value: 'tradeCount', label: 'Trades' },
]

type FilterType = 'all' | 'active' | 'graduated'

export function TokenFeed() {
  const [sortBy, setSortBy] = useState<CurveSortField>('totalVolumeEth')
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const { curves, loading, error } = useCurves(sortBy)
  const { ethUsd } = useEthPrice()

  const filtered = useMemo(() => {
    let result = curves

    if (filter === 'active') result = result.filter((c) => !c.graduated)
    if (filter === 'graduated') result = result.filter((c) => c.graduated)

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
      )
    }

    return result
  }, [curves, filter, search])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Token Feed</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {curves.length} tokens on RobinPump
            {ethUsd > 0 && (
              <span className="ml-2 font-mono text-text-muted">
                ETH ${ethUsd.toFixed(0)}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-40 rounded-lg border border-border bg-bg-secondary px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-blue focus:outline-none"
            />
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="flex h-2 w-2 rounded-full bg-green animate-pulse" title="Live data" />
          <span className="text-xs text-text-muted">Live</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* Sort */}
        {SORT_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setSortBy(value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              sortBy === value
                ? 'bg-blue/20 text-blue'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="h-4 w-px bg-border" />

        {/* Filter */}
        {(['all', 'active', 'graduated'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-bg-tertiary text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading && curves.length === 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-bg-card" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-8 rounded-xl border border-red/30 bg-red-dim p-6 text-center">
          <p className="text-sm text-red">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-bg-card p-8 text-center">
          <p className="text-sm text-text-muted">No tokens found</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((curve) => (
            <TokenCard key={curve.id} curve={curve} />
          ))}
        </div>
      )}
    </div>
  )
}
