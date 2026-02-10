import type { TokenAnalysis } from './analysisSchema'

const demoAnalyses: Record<string, TokenAnalysis> = {
  high_quality: {
    overall_score: 72,
    idea_quality: {
      score: 78,
      reasoning: 'Clear problem statement with identifiable market. The concept of decentralized identity verification for freelancers addresses a real pain point. Execution plan is vague but the direction is sound.',
    },
    onchain_health: {
      score: 68,
      reasoning: 'Healthy holder distribution with 45 holders. Top 10 concentration at 62% is moderate. Buy/sell ratio favors buying at 2.3x. Creator has retained their position.',
    },
    curve_position: {
      score: 70,
      reasoning: 'Bonding curve at 35% progress with steady accumulation. Volume momentum is positive at 1.4x average. Price discovery appears organic.',
    },
    risk_flags: [
      { severity: 'medium', label: 'Moderate Concentration', detail: 'Top 10 holders control 62% of supply' },
      { severity: 'low', label: 'Early Stage', detail: 'Token is only 8 hours old with 45 holders' },
    ],
    one_line_verdict: 'Promising concept with healthy early traction -- watch for holder diversification.',
    comparable_projects: ['Gitcoin Passport', 'Worldcoin', 'BrightID'],
  },
  medium_quality: {
    overall_score: 43,
    idea_quality: {
      score: 38,
      reasoning: 'Generic DeFi aggregator concept with no clear differentiation. The description mentions AI but provides no technical substance. Market is saturated with similar projects.',
    },
    onchain_health: {
      score: 52,
      reasoning: '22 holders with moderate trading activity. Concentration is high at 78% for top 10. Mixed buy/sell signals.',
    },
    curve_position: {
      score: 40,
      reasoning: 'Bonding curve at 12% with declining momentum. Volume has dropped 60% in the last hour compared to average.',
    },
    risk_flags: [
      { severity: 'high', label: 'High Concentration', detail: 'Top 10 holders control 78% of supply' },
      { severity: 'medium', label: 'Declining Momentum', detail: 'Volume dropped 60% vs hourly average' },
      { severity: 'low', label: 'Generic Concept', detail: 'No clear differentiation from existing projects' },
    ],
    one_line_verdict: 'Vague concept in a crowded space with concerning holder concentration.',
    comparable_projects: ['1inch', 'Paraswap', 'Jupiter'],
  },
  low_quality: {
    overall_score: 15,
    idea_quality: {
      score: 8,
      reasoning: 'No meaningful description. Token name is a meme reference with no utility proposition. Zero effort in the pitch.',
    },
    onchain_health: {
      score: 18,
      reasoning: 'Only 5 holders. Creator controls 85% of supply. Single whale dominates all trading volume.',
    },
    curve_position: {
      score: 20,
      reasoning: 'Bonding curve barely started at 2%. Almost no organic interest. Likely to stagnate.',
    },
    risk_flags: [
      { severity: 'critical', label: 'Creator Dominance', detail: 'Creator controls 85% of token supply' },
      { severity: 'critical', label: 'No Real Product', detail: 'No description, no roadmap, no utility' },
      { severity: 'high', label: 'Whale Risk', detail: 'Single address responsible for 90% of volume' },
    ],
    one_line_verdict: 'Avoid -- no substance, extreme concentration, likely a quick flip.',
    comparable_projects: [],
  },
}

export function getDemoAnalysis(curveId: string): TokenAnalysis {
  // Deterministic selection based on curve ID hash
  const hash = curveId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const keys = Object.keys(demoAnalyses)
  const key = keys[hash % keys.length]
  return demoAnalyses[key]
}

export function getAnalysisFromCache(curveId: string): TokenAnalysis | null {
  const cached = localStorage.getItem(`robinlens:analysis:${curveId}`)
  if (!cached) return null
  try {
    return JSON.parse(cached) as TokenAnalysis
  } catch {
    return null
  }
}

export function saveAnalysisToCache(curveId: string, analysis: TokenAnalysis): void {
  localStorage.setItem(`robinlens:analysis:${curveId}`, JSON.stringify(analysis))
}
