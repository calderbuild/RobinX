import { useState, useCallback } from 'react'
import type { Curve, Trade, Position } from '../lib/goldsky'
import type { TokenAnalysis, RiskFlag, SuggestedAction } from '../lib/analysisSchema'
import { analyzeToken } from '../lib/analyzer'
import { calculateMetrics } from '../lib/metrics'
import { fetchTokenMetadata } from '../lib/metadata'
import { getDemoAnalysis, getAnalysisFromCache, saveAnalysisToCache } from '../lib/demoAnalysis'
import { ScoreBadge } from './ScoreBadge'

interface AnalysisCardProps {
  curve: Curve
  trades: Trade[]
  positions: Position[]
}

function severityColor(severity: RiskFlag['severity']): string {
  switch (severity) {
    case 'critical': return 'bg-red/20 text-red border-red/30'
    case 'high': return 'bg-orange/20 text-orange border-orange/30'
    case 'medium': return 'bg-yellow/20 text-yellow border-yellow/30'
    case 'low': return 'bg-bg-tertiary text-text-secondary border-border'
  }
}

function actionStyle(action: SuggestedAction['action']): { bg: string; text: string; label: string } {
  switch (action) {
    case 'buy': return { bg: 'bg-green/10 border-green/30', text: 'text-green', label: 'Consider buying' }
    case 'hold': return { bg: 'bg-yellow/10 border-yellow/30', text: 'text-yellow', label: 'Research more' }
    case 'avoid': return { bg: 'bg-red/10 border-red/30', text: 'text-red', label: 'Proceed with caution' }
  }
}

function TradeSuggestion({ action }: { action: SuggestedAction }) {
  const style = actionStyle(action.action)
  return (
    <div className={`mt-4 rounded-lg border ${style.bg} px-4 py-3`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${style.text}`}>{style.label}</span>
        <span className="text-xs text-text-muted">{action.confidence}% confidence</span>
      </div>
      <p className="mt-1 text-xs text-text-secondary">{action.reasoning}</p>
    </div>
  )
}

function FallbackSuggestion({ score, hasCritical }: { score: number; hasCritical: boolean }) {
  let action: SuggestedAction['action']
  let reasoning: string

  if (hasCritical || score < 35) {
    action = 'avoid'
    reasoning = 'Critical risk flags detected or very low overall score.'
  } else if (score >= 65) {
    action = 'buy'
    reasoning = 'Above-average score with no critical risks.'
  } else {
    action = 'hold'
    reasoning = 'Mixed signals -- do more research before committing.'
  }

  const style = actionStyle(action)
  return (
    <div className={`mt-4 rounded-lg border ${style.bg} px-4 py-3`}>
      <span className={`text-sm font-semibold ${style.text}`}>{style.label}</span>
      <p className="mt-1 text-xs text-text-secondary">{reasoning}</p>
    </div>
  )
}

function SubScore({ label, score, reasoning }: { label: string; score: number; reasoning: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-0 py-2.5 text-left"
      >
        <span className="text-sm text-text-secondary">{label}</span>
        <div className="flex items-center gap-2">
          <ScoreBadge score={score} />
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>
      {open && (
        <p className="pb-3 text-xs leading-relaxed text-text-muted">{reasoning}</p>
      )}
    </div>
  )
}

export function AnalysisCard({ curve, trades, positions }: AnalysisCardProps) {
  const [analysis, setAnalysis] = useState<TokenAnalysis | null>(
    () => getAnalysisFromCache(curve.id),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const metrics = calculateMetrics(curve, trades, positions)
      let result: TokenAnalysis

      try {
        const metadata = await fetchTokenMetadata(curve.uri)
        result = await analyzeToken(curve.name, curve.symbol, metadata.description, metrics)
      } catch {
        // Fallback to demo analysis when API is unavailable
        result = getDemoAnalysis(curve.id)
      }

      setAnalysis(result)
      saveAnalysisToCache(curve.id, result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [curve, trades, positions])

  if (!analysis) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6">
        <h3 className="font-display text-base font-semibold text-text-primary">AI Analysis</h3>
        <p className="mt-2 text-sm text-text-muted">
          Get an AI-powered evaluation of this token's idea quality, on-chain health, and curve position.
        </p>
        {error && (
          <p className="mt-2 text-sm text-red">{error}</p>
        )}
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="mt-4 rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue/80 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" fill="currentColor" className="opacity-75" />
              </svg>
              Analyzing...
            </span>
          ) : (
            'Analyze Token'
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card p-6">
      <div className="flex items-start justify-between">
        <h3 className="font-display text-base font-semibold text-text-primary">AI Analysis</h3>
        <ScoreBadge score={analysis.overall_score} size="lg" />
      </div>

      {/* Verdict */}
      <p className="mt-3 text-sm font-medium text-text-primary">
        {analysis.one_line_verdict}
      </p>

      {/* Risk Flags */}
      {analysis.risk_flags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {analysis.risk_flags.map((flag, i) => (
            <span
              key={i}
              className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${severityColor(flag.severity)}`}
              title={flag.detail}
            >
              {flag.label}
            </span>
          ))}
        </div>
      )}

      {/* Sub-scores */}
      <div className="mt-4">
        <SubScore label="Idea Quality" score={analysis.idea_quality.score} reasoning={analysis.idea_quality.reasoning} />
        <SubScore label="On-Chain Health" score={analysis.onchain_health.score} reasoning={analysis.onchain_health.reasoning} />
        <SubScore label="Curve Position" score={analysis.curve_position.score} reasoning={analysis.curve_position.reasoning} />
      </div>

      {/* Comparable Projects */}
      {analysis.comparable_projects.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-text-muted">Similar to</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {analysis.comparable_projects.map((p) => (
              <span key={p} className="rounded bg-bg-tertiary px-2 py-0.5 text-xs text-text-secondary">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trade Suggestion */}
      {analysis.suggested_action && (
        <TradeSuggestion action={analysis.suggested_action} />
      )}
      {!analysis.suggested_action && (
        <FallbackSuggestion score={analysis.overall_score} hasCritical={analysis.risk_flags.some(f => f.severity === 'critical')} />
      )}

      {/* Re-analyze */}
      <button
        onClick={runAnalysis}
        disabled={loading}
        className="mt-4 text-xs text-text-muted hover:text-text-secondary"
      >
        {loading ? 'Re-analyzing...' : 'Re-analyze'}
      </button>
    </div>
  )
}
