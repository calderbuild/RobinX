import { z } from 'zod/v4'

export const SubScoreSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string(),
})

export const RiskFlagSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  label: z.string(),
  detail: z.string(),
})

export const SuggestedActionSchema = z.object({
  action: z.enum(['buy', 'hold', 'avoid']),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
})

export const TokenAnalysisSchema = z.object({
  overall_score: z.number().min(0).max(100),
  idea_quality: SubScoreSchema,
  onchain_health: SubScoreSchema,
  curve_position: SubScoreSchema,
  risk_flags: z.array(RiskFlagSchema),
  one_line_verdict: z.string(),
  comparable_projects: z.array(z.string()),
  suggested_action: SuggestedActionSchema.optional(),
})

export type SubScore = z.infer<typeof SubScoreSchema>
export type RiskFlag = z.infer<typeof RiskFlagSchema>
export type SuggestedAction = z.infer<typeof SuggestedActionSchema>
export type TokenAnalysis = z.infer<typeof TokenAnalysisSchema>
