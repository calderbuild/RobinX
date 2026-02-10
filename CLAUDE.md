# CLAUDE.md

## Project Overview

RobinLens is an AI-driven analytics engine for RobinPump (robinpump.fun), a bonding curve token launchpad on Base. It scores every token across three dimensions: Idea Quality (LLM), On-Chain Health (data), and Curve Position (math), producing a RobinScore (0-100).

**Target Chain**: Base Mainnet (Chain ID: 8453)
**Hackathon**: EasyA Consensus Hong Kong 2026, DeFi Track

## Tech Stack

- **Frontend**: Vite 7 + React 19 + TypeScript 5.9 + Tailwind CSS v4 (CSS-first, no config file)
- **Charts**: lightweight-charts v5 (TradingView)
- **AI**: OpenAI API + Zod v4 (Structured Outputs)
- **Chain**: ethers.js v6 (read-only, Base Mainnet)
- **Data**: Goldsky Subgraph (GraphQL, public, no auth)
- **Testing**: vitest + happy-dom + @testing-library/react
- **Deploy**: Vercel (SPA rewrites)

## Build Commands

```bash
cd frontend && npm run dev       # Dev server at localhost:5173
cd frontend && npm run build     # tsc -b && vite build
cd frontend && npm run lint      # ESLint
cd frontend && npx tsc --noEmit  # Type check only
```

## Environment Variables

```bash
# frontend/.env
VITE_OPENAI_API_KEY=your-api-key
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_MODEL=gpt-4o
```

Without API key, analysis falls back to demo data from `demoAnalysis.ts`.

## Data Sources

| Source | Endpoint |
|--------|----------|
| Goldsky Subgraph | `https://api.goldsky.com/api/public/project_cmjjrebt3mxpt01rm9yi04vqq/subgraphs/pump-charts/v2/gn` |
| IPFS Metadata | `https://olive-defensive-giraffe-83.mypinata.cloud/ipfs/{cid}` |
| RobinPump Price | `https://robinpump.fun/api/prices/{contractAddress}` |

Subgraph rate limit: 50 requests / 10 seconds. Client retries with backoff on 429.

## Subgraph Entities

- **Curve**: Token data (name, symbol, price, volume, bonding curve state, graduation)
- **Trade**: Individual trades (side BUY/SELL, phase CURVE/AERODROME, amounts, trader)
- **Position**: Per-user-per-token holdings (ETH spent/received, tokens bought/sold)
- **Pool**: Post-graduation Aerodrome LP info
- **Bundle**: Global ETH/USD price

## Key Architecture

### Frontend Routing (React Router v7)

```
/              -> TokenFeed (grid of all tokens with scores)
/token/:id     -> TokenDetail (chart + analysis + trades)
/leaderboard   -> Leaderboard (top traders by PnL)
```

### AI Analysis Pipeline

```
1. Fetch IPFS metadata (description)
2. Calculate on-chain metrics (holder concentration, buy/sell ratio, volume momentum, creator behavior)
3. Send to LLM with structured output (Zod schema)
4. Cache result in localStorage
```

Analysis schema: overall_score, idea_quality, onchain_health, curve_position (each with score + reasoning), risk_flags[], one_line_verdict, comparable_projects[].

### Bonding Curve

Graduation threshold: ~4.2 ETH collected. Progress = ethCollected / 4.2. After graduation, trades move to Aerodrome DEX (phase: AERODROME).

## Key Files

- `src/lib/goldsky.ts` -- Subgraph client, types, queries
- `src/lib/metadata.ts` -- IPFS metadata fetcher with Pinata gateway
- `src/lib/analyzer.ts` -- LLM analysis with OpenAI chat completions
- `src/lib/analysisSchema.ts` -- Zod v4 schema for TokenAnalysis
- `src/lib/metrics.ts` -- On-chain metrics calculator
- `src/lib/demoAnalysis.ts` -- Fallback demo analysis data + localStorage cache
- `src/lib/format.ts` -- Number/address/time formatting
- `src/lib/chains.ts` -- Base Mainnet config
- `src/hooks/useCurves.ts` -- Polling hook for token list (10s interval)
- `src/hooks/useCurveDetail.ts` -- Polling hook for single token + trades + positions (5s)
- `src/hooks/useEthPrice.ts` -- ETH/USD price from Bundle entity (30s)
- `src/components/AnalysisCard.tsx` -- AI analysis display with expandable sub-scores
- `src/components/PriceChart.tsx` -- lightweight-charts v5 candlestick chart
- `src/components/TokenCard.tsx` -- Token card for feed grid
- `src/components/TradeFeed.tsx` -- Trade history table
- `src/components/HolderChart.tsx` -- Top 10 holder distribution bars

## Tailwind v4 (CSS-first)

Theme defined in `src/index.css` via `@theme {}`. No `tailwind.config.js`. Custom colors use `--color-*` naming. Fonts: Space Grotesk (display), Inter (body), Fira Code (mono).

## Base Mainnet

```
Chain ID: 8453
RPC: https://mainnet.base.org
Explorer: https://basescan.org
```
