import OpenAI from 'openai'
import { TokenAnalysisSchema, type TokenAnalysis } from './analysisSchema'
import type { OnChainMetrics } from './metrics'

const SYSTEM_PROMPT = `You are a skeptical DeFi analyst evaluating startup tokens launched on RobinPump (a bonding curve launchpad on Base). Your job is to provide honest, calibrated scores.

Scoring calibration:
- 0-20: Obvious scam, no effort, plagiarized description
- 21-40: Low quality, vague idea, poor on-chain metrics
- 41-60: Average, decent concept but nothing special, mixed signals
- 61-80: Above average, clear vision, healthy metrics, differentiated
- 81-100: Exceptional, strong fundamentals, innovative idea, great execution

Be skeptical by default. Most tokens on bonding curve launchpads are low quality.
Never give above 80 unless the idea is genuinely innovative AND has strong on-chain health.

For risk flags, only include flags that are actually relevant. Severity levels:
- critical: Immediate danger (creator dumped, 90%+ concentration, obvious scam)
- high: Serious concern (very high concentration, whale manipulation signs)
- medium: Worth noting (moderate concentration, creator sold some, low liquidity)
- low: Minor observation (new token, few holders, low volume)

Comparable projects should reference real projects that are similar in concept.

Also provide a suggested_action with:
- action: "buy" (score >= 65, no critical flags), "hold" (mixed signals), or "avoid" (score < 35 or critical flags)
- confidence: 0-100 how confident you are in this recommendation
- reasoning: one sentence explaining the recommendation`

function buildUserPrompt(
  name: string,
  symbol: string,
  description: string,
  metrics: OnChainMetrics,
): string {
  return `Analyze this RobinPump token:

Token: ${name} ($${symbol})
Description: ${description || 'No description provided'}

On-chain metrics:
- Holders: ${metrics.holderCount}
- Top 10 holder concentration: ${(metrics.top10Concentration * 100).toFixed(1)}%
- Buy/sell ratio (recent 50 trades): ${metrics.buySellRatio.toFixed(2)}
- Volume momentum (last hour vs avg): ${metrics.volumeMomentum.toFixed(2)}x
- Creator sold: ${(metrics.creatorSoldPercent * 100).toFixed(1)}% of their tokens
- Bonding curve progress: ${(metrics.bondingCurveProgress * 100).toFixed(1)}%
- Age: ${metrics.ageHours.toFixed(1)} hours
- Total trades: ${metrics.tradeCount}

Provide your analysis with scores and risk assessment.`
}

export async function analyzeToken(
  name: string,
  symbol: string,
  description: string,
  metrics: OnChainMetrics,
): Promise<TokenAnalysis> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  const baseURL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o'

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const client = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true })

  const response = await client.chat.completions.create({
    model,
    temperature: 0.3,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(name, symbol, description, metrics) },
    ],
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('Empty LLM response')
  }

  const parsed = TokenAnalysisSchema.parse(JSON.parse(content))
  return parsed
}
