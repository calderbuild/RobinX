import { useEffect, useRef, Component, type ReactNode } from 'react'
import { createChart, type IChartApi, type ISeriesApi, ColorType, CandlestickSeries, type CandlestickData, type UTCTimestamp } from 'lightweight-charts'
import type { Trade } from '../lib/goldsky'

interface PriceChartProps {
  trades: Trade[]
}

interface CandleBucket {
  time: number
  open: number
  high: number
  low: number
  close: number
}

function tradesToCandles(trades: Trade[], intervalSeconds = 3600): CandlestickData<UTCTimestamp>[] {
  if (trades.length === 0) return []

  const sorted = [...trades].reverse()
  const candles = new Map<number, CandleBucket>()

  for (const trade of sorted) {
    const ts = parseInt(trade.timestamp)
    if (isNaN(ts) || ts <= 0) continue

    const price = parseFloat(trade.priceUsd)
    if (isNaN(price) || price <= 0) {
      // Try ETH price as fallback
      const ethPrice = parseFloat(trade.priceEth)
      if (isNaN(ethPrice) || ethPrice <= 0) continue
    }

    const priceVal = parseFloat(trade.priceUsd) > 0
      ? parseFloat(trade.priceUsd)
      : parseFloat(trade.priceEth)

    if (priceVal <= 0) continue

    const bucket = Math.floor(ts / intervalSeconds) * intervalSeconds
    const existing = candles.get(bucket)
    if (existing) {
      existing.high = Math.max(existing.high, priceVal)
      existing.low = Math.min(existing.low, priceVal)
      existing.close = priceVal
    } else {
      candles.set(bucket, { time: bucket, open: priceVal, high: priceVal, low: priceVal, close: priceVal })
    }
  }

  return Array.from(candles.values())
    .sort((a, b) => a.time - b.time)
    .map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
}

// Error boundary to prevent chart crashes from taking down the page
class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-bg-card">
          <p className="text-sm text-text-muted">Chart unavailable</p>
        </div>
      )
    }
    return this.props.children
  }
}

function PriceChartInner({ trades }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8b949e',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1c2333' },
        horzLines: { color: '#1c2333' },
      },
      timeScale: {
        borderColor: '#30363d',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#30363d',
      },
      crosshair: {
        vertLine: { color: '#3b82f6', width: 1, style: 2 },
        horzLine: { color: '#3b82f6', width: 1, style: 2 },
      },
      handleScroll: true,
      handleScale: true,
    })

    chartRef.current = chart

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        chart.applyOptions({ width, height })
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    // Remove previous series
    if (seriesRef.current) {
      try { chart.removeSeries(seriesRef.current) } catch { /* ignore */ }
      seriesRef.current = null
    }

    const candles = tradesToCandles(trades)
    if (candles.length === 0) return

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#3fb68b',
      downColor: '#ff5252',
      borderUpColor: '#3fb68b',
      borderDownColor: '#ff5252',
      wickUpColor: '#3fb68b',
      wickDownColor: '#ff5252',
    })

    series.setData(candles)
    seriesRef.current = series
    chart.timeScale().fitContent()
  }, [trades])

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
      <div ref={containerRef} className="h-72 w-full" />
    </div>
  )
}

export function PriceChart({ trades }: PriceChartProps) {
  if (trades.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-bg-card">
        <p className="text-sm text-text-muted">No trade data available</p>
      </div>
    )
  }

  return (
    <ChartErrorBoundary>
      <PriceChartInner trades={trades} />
    </ChartErrorBoundary>
  )
}
