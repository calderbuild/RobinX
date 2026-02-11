# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RobinLens is an AI-powered trading terminal for RobinPump (robinpump.fun), a bonding curve token launchpad on Base. It scores every token across three dimensions: Idea Quality (LLM), On-Chain Health (data), and Curve Position (math), producing a RobinScore (0-100). Users can connect a wallet and trade directly on the bonding curve.

**Target Chain**: Base Mainnet (Chain ID: 8453)
**Hackathon**: EasyA Consensus Hong Kong 2026, DeFi Track

## Build & Dev Commands

All commands run from the `frontend/` directory:

```bash
npm run dev          # Dev server at localhost:5173
npm run build        # tsc -b && vite build
npm run lint         # ESLint
npx tsc --noEmit     # Type check only
npx vitest           # Run all tests (watch mode)
npx vitest run       # Run all tests once
npx vitest run src/lib/format.test.ts  # Run a single test file
```

No tests exist yet. Test runner is configured (vitest + happy-dom + @testing-library/react).

## Environment Variables

```bash
# frontend/.env
VITE_OPENAI_API_KEY=your-api-key
VITE_OPENAI_BASE_URL=https://api.openai.com/v1   # optional
VITE_OPENAI_MODEL=gpt-4o                          # optional
```

Without API key, analysis falls back to demo data from `demoAnalysis.ts` with localStorage caching.

## Tech Stack

- **Frontend**: Vite 7 + React 19 + TypeScript 5.9 + Tailwind CSS v4 (CSS-first, no config file)
- **Charts**: lightweight-charts v5 (TradingView)
- **AI**: OpenAI API + Zod v4 (Structured Outputs via `response_format: json_object`)
- **Chain**: ethers.js v6 (read + write, Base Mainnet, MetaMask wallet)
- **Data**: Goldsky Subgraph (GraphQL, public, no auth)
- **Deploy**: Vercel (SPA rewrites)

## Data Sources

| Source | Endpoint |
|--------|----------|
| Goldsky Subgraph | `https://api.goldsky.com/api/public/project_cmjjrebt3mxpt01rm9yi04vqq/subgraphs/pump-charts/v2/gn` |
| IPFS Metadata | `https://olive-defensive-giraffe-83.mypinata.cloud/ipfs/{cid}` |
| RobinPump Price | `https://robinpump.fun/api/prices/{contractAddress}` |
| Base RPC | `https://mainnet.base.org` |

Subgraph rate limit: 50 requests / 10 seconds. Client retries with exponential backoff (3 attempts, 2s base delay) on 429 and network errors.

## Architecture

### Routing (React Router v7)

```
/              -> TokenFeed   (grid of all tokens with scores)
/token/:id     -> TokenDetail (chart + analysis + trades)
/leaderboard   -> Leaderboard (top traders by PnL)
```

### AI Analysis Pipeline

1. Fetch IPFS metadata (token description)
2. Calculate on-chain metrics from subgraph data (holder concentration, buy/sell ratio, volume momentum, creator dump behavior, curve progress)
3. Send to OpenAI with JSON mode; parse response with Zod schema
4. Cache result in localStorage

Schema output: `overall_score`, `idea_quality`, `onchain_health`, `curve_position` (each with score + reasoning), `risk_flags[]`, `one_line_verdict`, `comparable_projects[]`, `suggested_action` (buy/hold/avoid + confidence).

### Data Flow

Custom hooks poll the subgraph at fixed intervals:
- `useCurves` (10s) -- token list
- `useCurveDetail` (5s) -- single token + trades + positions
- `useEthPrice` (30s) -- ETH/USD from Bundle entity

Components consume hooks directly. Wallet state is the only global context (WalletContext in App.tsx).

### Bonding Curve Model

Graduation threshold: ~4.2 ETH collected. Progress = ethCollected / 4.2. After graduation, trades move to Aerodrome DEX (phase: `AERODROME`).

### Trading (Bonding Curve Interaction)

Wallet connection via ethers.js v6 BrowserProvider (MetaMask / injected wallet). Curve contract functions:
- `buy(minTokensOut, deadline) payable` -- send ETH, receive tokens (1% fee)
- `sell(tokensToSell, minEthOut, deadline)` -- requires prior ERC20 approve
- `getTokensForEth(ethAmount) view` -- quote for buy
- `getCurrentPrice() view` -- current token price in ETH
- `trading() view` -- false after graduation

Contract addresses are per-token (curve.id from subgraph = curve contract address). Token address is curve.token.

## Subgraph Entities

- **Curve**: Token data (name, symbol, price, volume, bonding curve state, graduation)
- **Trade**: Individual trades (side BUY/SELL, phase CURVE/AERODROME, amounts, trader)
- **Position**: Per-user-per-token holdings (ETH spent/received, tokens bought/sold)
- **Pool**: Post-graduation Aerodrome LP info
- **Bundle**: Global ETH/USD price

All numeric fields from subgraph are strings; parse with `parseFloat()` / `parseInt()`.

## Key Files

All paths relative to `frontend/src/`:

- `lib/goldsky.ts` -- Subgraph client, TypeScript interfaces, GraphQL queries, retry logic
- `lib/analyzer.ts` -- LLM analysis via OpenAI (skeptical DeFi analyst persona, temp 0.3)
- `lib/analysisSchema.ts` -- Zod v4 schema for TokenAnalysis
- `lib/metrics.ts` -- On-chain metrics calculation (OnChainMetrics interface)
- `lib/metadata.ts` -- IPFS metadata fetcher (Pinata gateway)
- `lib/demoAnalysis.ts` -- Fallback demo analysis + localStorage cache layer
- `lib/format.ts` -- Number/address/time formatting utilities
- `lib/chains.ts` -- Base Mainnet config
- `lib/wallet.ts` -- Wallet connect/disconnect/switchToBase, event listeners
- `lib/contracts.ts` -- Bonding curve ABI, quoteBuy, executeBuy, executeSell
- `hooks/useCurves.ts` -- Polling hook for token list
- `hooks/useCurveDetail.ts` -- Polling hook for single token detail
- `hooks/useEthPrice.ts` -- ETH/USD price polling
- `hooks/useWallet.ts` -- WalletContext + useWallet hook (address, signer, balance)
- `hooks/useTrade.ts` -- Trade execution hook (buy/sell with status tracking)
- `components/PriceChart.tsx` -- lightweight-charts candlestick (has ChartErrorBoundary)
- `components/AnalysisCard.tsx` -- AI analysis display with trade suggestion
- `components/TradePanel.tsx` -- Buy/sell panel with quotes and slippage
- `components/PositionCard.tsx` -- User's position display (holdings, PnL)
- `components/ConnectButton.tsx` -- Wallet connect/disconnect button
- `components/TokenCard.tsx` -- Memoized token card for feed grid
- `components/HolderChart.tsx` -- Top 10 holder distribution bars

## Styling

Tailwind CSS v4 (CSS-first): theme defined in `src/index.css` via `@theme {}` block. No `tailwind.config.js`.

Custom colors use `--color-*` CSS variables. Fonts: Space Grotesk (display), Inter (body), Fira Code (mono).
