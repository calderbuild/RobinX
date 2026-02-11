---
title: "feat: AI Startup Analyst for RobinPump"
type: feat
date: 2026-02-10
hackathon: EasyA Consensus Hong Kong 2026
track: DeFi Track ($55K prize pool)
deadline: 2026-02-12 (48 hours)
---

# AI Startup Analyst for RobinPump

## Overview

Build an AI-driven analytics engine that evaluates startup ideas launched on RobinPump (robinpump.fun), combining on-chain signal analysis with LLM-powered project assessment. Users input a token address or browse the feed, and get instant, structured investment analysis.

**Project Name**: RobinLens -- "See through the noise"

**One-sentence pitch**: "AI that reads the chain and the pitch deck so you don't have to."

## Problem Statement

RobinPump is a bonding curve launchpad on Base where anyone can tokenize a startup idea. The problem: there are 48+ live tokens with no filtering, no risk assessment, and no way to distinguish signal from noise. Traders buy blindly based on names and market cap rankings.

## Proposed Solution

A real-time analytics dashboard that scores every RobinPump token across three dimensions:

1. **Idea Quality** (LLM) -- AI evaluates the startup description for feasibility, market fit, and originality
2. **On-Chain Health** (Data) -- Holder concentration, whale detection, buy/sell ratio, volume momentum
3. **Curve Position** (Math) -- Bonding curve progress, graduation probability, price impact simulation

Combined into a single **RobinScore (0-100)** with risk flags and a one-line verdict.

## Technical Architecture

```
                          RobinLens Architecture

  ┌──────────────────────────────────────────────────────────────┐
  │                        Frontend (React + Tailwind)           │
  │                                                              │
  │  Token Feed ──→ Token Detail ──→ AI Analysis Card           │
  │       │              │               │                       │
  │       ▼              ▼               ▼                       │
  │  [Live Grid]   [Price Chart]   [Score + Verdict]            │
  │  [Filters]     [Trade Feed]    [Risk Flags]                 │
  │  [Search]      [Holders]       [Holder Distribution]        │
  └──────────┬───────────┬───────────────┬──────────────────────┘
             │           │               │
    ┌────────▼───┐ ┌─────▼──────┐ ┌─────▼──────┐
    │  Goldsky   │ │   Base     │ │  OpenAI    │
    │  Subgraph  │ │  Mainnet   │ │    API     │
    │  (GraphQL) │ │  (Alchemy) │ │  (GPT-4o)  │
    └────────────┘ └────────────┘ └────────────┘
         │                              │
    Token data                    Structured
    Trade history                 analysis with
    User positions                Zod schema
    Curve state
```

### Data Sources

| Source | What | How |
|--------|------|-----|
| **Goldsky Subgraph** | All token data, trades, users, positions, bonding curve state | GraphQL POST, public, no auth, 50 req/10s |
| **RobinPump Price API** | Real-time ETH price per token | `GET /api/prices/{contractAddress}` |
| **IPFS (Pinata)** | Token name, description, logo | Fetch metadata URI from Curve entity |
| **OpenAI API** | Startup idea evaluation | Structured Outputs + Zod schema |
| **CoinGecko API** | ETH/USD price, market context | Free tier, 30 calls/min |
| **Base Mainnet (Alchemy)** | On-chain reads if needed | ethers.js v6, Chain ID 8453 |

### Goldsky Subgraph Schema (Confirmed via Introspection)

Endpoint: `https://api.goldsky.com/api/public/project_cmjjrebt3mxpt01rm9yi04vqq/subgraphs/pump-charts/v2/gn`

**Curve** (token): id, token, name, symbol, uri, creator, createdAt, graduated, graduatedAt, pool, trades, lastPriceEth, lastPriceUsd, totalVolumeEth, ethCollected, tradeCount, athPriceEth, athPriceUsd, athTimestamp

**Trade**: id, curve, phase (CURVE|AERODROME), side (BUY|SELL), amountEth, amountToken, priceEth, priceUsd, trader, timestamp, txHash

**User**: id, positions, totalTradeCount, firstTradeAt, lastTradeAt

**Position**: id, user, curve, totalEthSpent, totalEthReceived, totalTokensBought, totalTokensSold, buyCount, sellCount

**Pool** (post-graduation Aerodrome LP): id, curve, token0, token1, wethIsToken0, createdAt

**Bundle**: ethUsd (global ETH/USD price)

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Vite 7 + React 19 + TypeScript 5.9 | JSX transform, no React import needed |
| Styling | Tailwind CSS v4 (CSS-first) | Dark theme, crypto aesthetic |
| Charts | lightweight-charts (TradingView) | 50KB, candlestick + area charts |
| Data | Goldsky GraphQL + fetch | No GraphQL client needed, plain fetch |
| AI | OpenAI API + Zod (Structured Outputs) | Type-safe LLM responses |
| Chain | ethers.js v6 + Alchemy (Base Mainnet) | Read-only, no wallet needed for core features |
| Wallet | MetaMask (optional, for future trading) | Privy as alternative |
| Deploy | Vercel | SPA with API routes |

## Implementation Phases

### Phase 1: Foundation (Hours 0-6)

**Goal**: Scaffold project, establish data layer, basic types.

**Tasks**:

- [x] Initialize Vite + React + TypeScript + Tailwind v4 project
  - `frontend/` directory structure matching SafeReceipt pattern
  - Dark theme CSS variables in `index.css` via `@theme {}`
  - Fonts: Space Grotesk (display), Inter (body), Fira Code (mono)
  - Files: `vite.config.ts`, `tsconfig.app.json`, `postcss.config.cjs`, `index.css`

- [x] Create Goldsky subgraph client
  - File: `src/lib/goldsky.ts`
  - Generic `querySubgraph<T>(query, variables)` function
  - Rate limit handling (429 retry with backoff)
  - TypeScript types for all entities (Curve, Trade, User, Position, Pool)

- [x] Create data fetching hooks
  - File: `src/hooks/useCurves.ts` -- fetch all curves sorted by volume/newest/market cap
  - File: `src/hooks/useCurveDetail.ts` -- fetch single curve with trades and positions
  - File: `src/hooks/useEthPrice.ts` -- ETH/USD from Bundle entity
  - Polling interval: 10s for lists, 5s for detail page

- [x] Create IPFS metadata fetcher
  - File: `src/lib/metadata.ts`
  - Fetch and cache token metadata (name, description, image) from IPFS URIs
  - Use Pinata gateway: `olive-defensive-giraffe-83.mypinata.cloud`

- [x] Create chain config
  - File: `src/lib/chains.ts`
  - Base Mainnet: Chain ID 8453, RPC, block explorer

**Acceptance Criteria**:
- Can query subgraph and log all curves to console
- TypeScript compiles with no errors
- Dev server runs at localhost:5173

### Phase 2: AI Analysis Engine (Hours 6-14)

**Goal**: LLM-powered token analysis with structured output.

**Tasks**:

- [x] Define Zod schema for token analysis
  - File: `src/lib/analysisSchema.ts`
  - Fields: overall_score (0-100), idea_quality, onchain_health, curve_position, risk_flags[], one_line_verdict, comparable_projects[]
  - Each sub-score has: score (0-100) + reasoning (string)

- [x] Implement LLM analysis function
  - File: `src/lib/analyzer.ts`
  - System prompt: skeptical DeFi analyst, calibrated scoring (0-20 scam, 21-40 low quality, 41-60 average, 61-80 above average, 81-100 strong)
  - Input: IPFS description + on-chain metrics (holder count, top-10 concentration, bonding curve progress, buy/sell ratio, age)
  - Output: TokenAnalysis (Zod-validated)
  - Temperature: 0.3 for consistency

- [x] Implement on-chain metrics calculator
  - File: `src/lib/metrics.ts`
  - Holder concentration: top-10 holders as % of total from Position data
  - Buy/sell ratio: from Trade data in rolling windows
  - Volume momentum: compare last-hour volume to average
  - Creator behavior: did creator sell? how much?
  - Bonding curve progress: from ethCollected relative to graduation threshold

- [x] Create demo fallback scenarios
  - File: `src/lib/demoAnalysis.ts`
  - 3-4 hardcoded analysis results for demo when API keys unavailable
  - Pattern: same as SafeReceipt's `demoScenarios.ts`

**Acceptance Criteria**:
- Given a curve ID, produces a structured TokenAnalysis with scores and risk flags
- Analysis completes in < 5 seconds
- Works without API key (fallback mode)

### Phase 3: Core UI (Hours 14-28)

**Goal**: Build the main dashboard and token detail pages. Use /ui-ux-pro-max and /frontend-design skills for high-quality UI.

**Routes**:
```
/              -> TokenFeed (grid of all tokens with scores)
/token/:id     -> TokenDetail (chart + analysis + trades)
/leaderboard   -> Leaderboard (top traders by PnL)
```

**Tasks**:

- [x] Token Feed page (`src/pages/TokenFeed.tsx`)
  - Grid of token cards (3 columns desktop, 1 mobile)
  - Each card: logo, name, ticker, market cap, 24h change, RobinScore badge
  - Sort: by RobinScore / Market Cap / Newest / Volume
  - Filter: graduated / active / high-risk
  - Search by name/symbol
  - Real-time "Live" indicator

- [x] Token Card component (`src/components/TokenCard.tsx`)
  - Compact display: logo, name ($TICKER), creator (truncated), age
  - Market cap + price change with green/red coloring
  - RobinScore as colored badge (green >60, yellow 40-60, red <40)
  - Bonding curve mini progress bar
  - Click navigates to detail page

- [x] Token Detail page (`src/pages/TokenDetail.tsx`)
  - **Header**: Logo, name, ticker, contract address (copy), share button
  - **Stats bar**: Market Cap, ATH, Volume 24h, Bonding Curve Progress %
  - **Price Chart**: Candlestick using lightweight-charts, area chart toggle
  - **AI Analysis Card**: Overall score (big), sub-scores expandable, risk flags as badges, verdict
  - **Holder Distribution**: Horizontal bar chart of top 10 holders
  - **Trade Feed**: Scrolling table (side, amount ETH, amount token, trader, time, tx link)
  - **Creator Profile**: Address, other tokens created, behavior summary

- [x] Analysis Card component (`src/components/AnalysisCard.tsx`)
  - Overall score as large circular gauge (0-100)
  - Color: gradient from red (0) through yellow (50) to green (100)
  - Sub-scores in expandable accordion
  - Risk flags as colored chips: critical=red, high=orange, medium=yellow, low=gray
  - One-line verdict in bold
  - "Analyze" button to trigger LLM (with loading spinner)
  - Cache analysis results in localStorage

- [x] Price Chart component (`src/components/PriceChart.tsx`)
  - File: uses `lightweight-charts` library
  - Dark theme matching dashboard
  - Candlestick with green (#3fb68b) up / red (#ff5252) down
  - Volume histogram overlay
  - Time range selector: 1H / 4H / 1D / All

- [x] Trade Feed component (`src/components/TradeFeed.tsx`)
  - Table with columns: Side (BUY/SELL), ETH Amount, Token Amount, Trader (truncated), Time (relative), Tx (link to BaseScan)
  - Color-coded rows: green for buys, red for sells
  - Highlight whale trades (> threshold)
  - Auto-scroll as new trades appear

- [x] Navbar (`src/components/Navbar.tsx`)
  - Logo + project name
  - Navigation: Feed / Leaderboard
  - Optional: Connect Wallet button (future)

- [x] Layout (`src/components/Layout.tsx`)
  - Dark background, max-width container
  - Responsive sidebar or top nav

**Design Direction** (for /ui-ux-pro-max and /frontend-design):
- Style: Dark crypto dashboard, similar to DEX Screener / Dextools
- Palette: Deep navy/charcoal background (#0d1117), green (#3fb68b) for positive, red (#ff5252) for negative, electric blue (#3b82f6) for primary actions, muted grays for text
- Typography: Space Grotesk for headings, Inter for body, Fira Code for numbers/addresses
- Animations: Subtle glow on score badges, smooth data transitions
- Layout: Dense but not cluttered, every pixel earns its place

**Acceptance Criteria**:
- Token feed loads all tokens with RobinScores
- Token detail page shows chart, analysis, holder distribution, trade feed
- Mobile responsive (1 column layout)
- No layout shifts during data loading

### Phase 4: Polish + Demo Prep (Hours 28-40)

**Tasks**:

- [x] Error handling and loading states
  - Skeleton loaders for cards and charts
  - Error boundaries with retry buttons
  - Empty state for "no tokens found"

- [x] Performance optimization
  - React.memo for TokenCard list
  - Debounce search input
  - Cache subgraph responses (5s TTL)
  - Lazy load analysis (only trigger on user action or when visible)

- [x] Leaderboard page (`src/pages/Leaderboard.tsx`)
  - Top traders by realized PnL (from Position data: totalEthReceived - totalEthSpent)
  - Columns: rank, address, total PnL, trade count, win rate
  - Click to see trader's positions

- [x] Landing / About section
  - Brief hero explaining what RobinLens does
  - "Try it" CTA that scrolls to token feed
  - How it works: 3-step illustration

- [ ] Deploy to Vercel
  - File: `vercel.json` with SPA rewrites
  - Environment variables: VITE_OPENAI_API_KEY, VITE_OPENAI_BASE_URL, VITE_OPENAI_MODEL

### Phase 5: Presentation Prep (Hours 40-48)

**Tasks**:

- [ ] Demo script (3 minutes max)
  - 0:00-0:30 -- Team intro slide (Canva, required by hackathon)
  - 0:30-1:00 -- Problem: "48 tokens, zero signal. Traders are blind."
  - 1:00-1:30 -- Solution: Live demo - open RobinLens, click a token, show AI analysis generating in real-time
  - 1:30-2:00 -- How we use Base: Goldsky subgraph for data, on-chain metrics, Aerodrome graduation tracking
  - 2:00-2:30 -- Show holder distribution, risk flags, trade feed
  - 2:30-3:00 -- Roadmap: trading integration, portfolio alerts, API for other builders

- [ ] Canva presentation slides (REQUIRED by hackathon rules)
  - Team slide with backgrounds
  - Problem → Solution → Demo → Tech → Roadmap

- [ ] Demo video (Loom, REQUIRED for submission)
  - Full walkthrough of the app
  - Show GitHub repo structure
  - Explain how Base blockchain is used
  - Show code architecture briefly

- [ ] README.md with:
  - Demo video embed
  - Screenshots of UI
  - How Base blockchain interaction works
  - Setup instructions
  - Architecture diagram

## Submission Requirements Checklist

From hackathon doc:
- [x] Built using relevant blockchain technology (Base, via Goldsky subgraph + on-chain reads)
- [ ] Open source on GitHub
- [ ] Short summary (<150 chars): "AI-powered analytics for RobinPump tokens: scores startup ideas using on-chain signals and LLM analysis"
- [ ] Full description of problems solved and tech used
- [ ] Technical description of SDKs and Base features used
- [ ] Canva presentation link
- [ ] README with: demo video, screenshots, blockchain interaction description, Loom video

## Judging Criteria Alignment

| Criteria | How We Score |
|----------|-------------|
| **Execution** | Fully functional app: live data, AI analysis, real-time charts, polished UI |
| **Usefulness** | Directly solves the information asymmetry problem on RobinPump |
| **Learning** | AI x Web3 intersection, Goldsky subgraph integration, bonding curve math |
| **Use of blockchain** | Deep Base chain integration: subgraph queries, on-chain metrics, Aerodrome graduation tracking, BaseScan links |
| **Deployment** | Deployed on Vercel with live data from Base Mainnet |

## Risk Analysis

| Risk | Mitigation |
|------|-----------|
| Goldsky subgraph goes down | Cache last-known data in localStorage; show stale data indicator |
| OpenAI API rate limit / cost | Demo mode with hardcoded analysis; low token count means low API usage |
| RobinPump has <10 active tokens | Still works -- smaller dataset makes analysis more interesting per token |
| Subgraph rate limit (50/10s) | Debounce queries, cache aggressively, batch requests |
| No wallet needed for MVP | Core features are read-only; wallet is future enhancement |

## Environment Variables

```bash
# frontend/.env
VITE_OPENAI_API_KEY=your-api-key
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_MODEL=gpt-4o
VITE_ALCHEMY_API_KEY=your-alchemy-key           # optional, for direct chain reads
VITE_COINGECKO_API_KEY=your-coingecko-demo-key   # optional, for market context
```

## Key File Structure

```
RobinX/
├── docs/
│   ├── plans/
│   │   └── 2026-02-10-feat-ai-startup-analyst-plan.md
│   └── 赛程doc.md
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── goldsky.ts          # Subgraph client + types
│   │   │   ├── metadata.ts         # IPFS metadata fetcher
│   │   │   ├── analyzer.ts         # LLM analysis with Zod
│   │   │   ├── analysisSchema.ts   # Zod schema for TokenAnalysis
│   │   │   ├── metrics.ts          # On-chain metrics calculator
│   │   │   ├── chains.ts           # Base Mainnet config
│   │   │   ├── demoAnalysis.ts     # Fallback demo data
│   │   │   └── format.ts           # Number/address formatting utils
│   │   ├── hooks/
│   │   │   ├── useCurves.ts        # Fetch + poll token list
│   │   │   ├── useCurveDetail.ts   # Fetch single token + trades
│   │   │   └── useEthPrice.ts      # ETH/USD price
│   │   ├── components/
│   │   │   ├── TokenCard.tsx        # Token card in feed grid
│   │   │   ├── AnalysisCard.tsx     # AI analysis display
│   │   │   ├── PriceChart.tsx       # lightweight-charts wrapper
│   │   │   ├── TradeFeed.tsx        # Trade history table
│   │   │   ├── HolderChart.tsx      # Holder distribution bar chart
│   │   │   ├── Navbar.tsx           # Top navigation
│   │   │   └── Layout.tsx           # Page layout wrapper
│   │   ├── pages/
│   │   │   ├── TokenFeed.tsx        # Main feed (/)
│   │   │   ├── TokenDetail.tsx      # Token detail (/token/:id)
│   │   │   └── Leaderboard.tsx      # Trader rankings (/leaderboard)
│   │   ├── App.tsx                  # Router + layout
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Tailwind v4 theme
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── postcss.config.cjs
│   └── vercel.json
├── CLAUDE.md
├── README.md
└── .gitignore
```

## References

### Data Sources
- Goldsky Subgraph: `https://api.goldsky.com/api/public/project_cmjjrebt3mxpt01rm9yi04vqq/subgraphs/pump-charts/v2/gn`
- RobinPump Price API: `https://robinpump.fun/api/prices/{contractAddress}`
- IPFS Gateway: `https://olive-defensive-giraffe-83.mypinata.cloud/ipfs/{cid}`
- CoinGecko API: `https://api.coingecko.com/api/v3`

### Base Mainnet
- Chain ID: 8453
- RPC: `https://mainnet.base.org` (public) / `https://base-mainnet.g.alchemy.com/v2/{key}` (Alchemy)
- Explorer: `https://basescan.org`
- Gas: < $0.01 per transaction

### Libraries
- [lightweight-charts](https://github.com/nicholasgasior/lightweight-charts) -- TradingView charting (50KB)
- [OpenAI Node SDK](https://github.com/openai/openai-node) -- Structured Outputs with Zod
- [ethers.js v6](https://docs.ethers.org/v6/) -- Base chain interaction
- [react-router-dom v7](https://reactrouter.com/) -- SPA routing
