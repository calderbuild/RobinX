function scoreColor(score: number): string {
  if (score >= 60) return 'bg-green/20 text-green border-green/30'
  if (score >= 40) return 'bg-yellow/20 text-yellow border-yellow/30'
  return 'bg-red/20 text-red border-red/30'
}

export function ScoreBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  if (size === 'lg') {
    return (
      <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full border-2 font-mono text-xl font-bold ${scoreColor(score)}`}>
        {score}
      </div>
    )
  }

  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-xs font-semibold ${scoreColor(score)}`}>
      {score}
    </span>
  )
}
