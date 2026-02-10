import type { Curve, Trade, Position } from './goldsky'

export interface OnChainMetrics {
  holderCount: number
  top10Concentration: number
  buySellRatio: number
  volumeMomentum: number
  creatorSoldPercent: number
  bondingCurveProgress: number
  ageHours: number
  tradeCount: number
}

const GRADUATION_THRESHOLD_ETH = 4.2

export function calculateMetrics(
  curve: Curve,
  trades: Trade[],
  positions: Position[],
): OnChainMetrics {
  const holderCount = positions.length

  // Top 10 holder concentration
  const totalTokensHeld = positions.reduce((sum, p) => {
    const held = parseFloat(p.totalTokensBought) - parseFloat(p.totalTokensSold)
    return sum + Math.max(0, held)
  }, 0)

  const sortedHoldings = positions
    .map((p) => Math.max(0, parseFloat(p.totalTokensBought) - parseFloat(p.totalTokensSold)))
    .sort((a, b) => b - a)

  const top10Sum = sortedHoldings.slice(0, 10).reduce((s, v) => s + v, 0)
  const top10Concentration = totalTokensHeld > 0 ? top10Sum / totalTokensHeld : 0

  // Buy/sell ratio from recent trades
  const recentTrades = trades.slice(0, 50)
  const buyCount = recentTrades.filter((t) => t.side === 'BUY').length
  const sellCount = recentTrades.filter((t) => t.side === 'SELL').length
  const buySellRatio = sellCount > 0 ? buyCount / sellCount : buyCount > 0 ? 10 : 1

  // Volume momentum: last hour vs average
  const now = Math.floor(Date.now() / 1000)
  const oneHourAgo = now - 3600
  const lastHourTrades = trades.filter((t) => parseInt(t.timestamp) > oneHourAgo)
  const lastHourVolume = lastHourTrades.reduce((s, t) => s + parseFloat(t.amountEth), 0)

  const ageSeconds = now - parseInt(curve.createdAt)
  const ageHours = Math.max(1, ageSeconds / 3600)
  const totalVolume = parseFloat(curve.totalVolumeEth)
  const avgHourlyVolume = totalVolume / ageHours
  const volumeMomentum = avgHourlyVolume > 0 ? lastHourVolume / avgHourlyVolume : 0

  // Creator behavior
  const creatorPos = positions.find(
    (p) => p.user.id.toLowerCase() === curve.creator.toLowerCase(),
  )
  let creatorSoldPercent = 0
  if (creatorPos) {
    const bought = parseFloat(creatorPos.totalTokensBought)
    if (bought > 0) {
      creatorSoldPercent = parseFloat(creatorPos.totalTokensSold) / bought
    }
  }

  // Bonding curve progress
  const ethCollected = parseFloat(curve.ethCollected)
  const bondingCurveProgress = Math.min(1, ethCollected / GRADUATION_THRESHOLD_ETH)

  return {
    holderCount,
    top10Concentration,
    buySellRatio,
    volumeMomentum,
    creatorSoldPercent,
    bondingCurveProgress,
    ageHours,
    tradeCount: parseInt(curve.tradeCount),
  }
}
