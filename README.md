# RobinLens

AI-powered trading terminal for RobinPump -- see the signal, trade in one click.

**EasyA Consensus Hong Kong 2026 | DeFi Track**

## Problem

RobinPump is a bonding curve token launchpad on Base with 48+ live tokens, but zero filtering, zero risk assessment, and no way to tell signal from noise. Traders buy blind based on names and market cap rankings.

## Solution

RobinLens combines AI analysis with one-click trading:

1. **See** -- Real-time feed of all RobinPump tokens with price, volume, holder distribution, and candlestick charts
2. **Score** -- AI evaluates each token on Idea Quality, On-Chain Health, and Curve Position, producing a RobinScore (0-100) with risk flags and trade suggestions (buy/hold/avoid)
3. **Trade** -- Connect wallet, buy/sell directly on the bonding curve with slippage protection, real-time quote preview, and PnL tracking

## Demo

> TODO: Loom video link

## Screenshots

> TODO: Screenshots of Token Feed, Token Detail with Trading Panel, AI Analysis, Position Tracking

## How It Works with Base Blockchain

### Reading On-Chain Data (Goldsky Subgraph)

RobinLens queries a Goldsky-indexed subgraph of the RobinPump contracts on Base Mainnet via GraphQL. This provides real-time access to:

- **Curve** entities: token metadata, price, volume, bonding curve state, graduation status
- **Trade** entities: every buy/sell with amounts, prices, trader addresses, timestamps
- **Position** entities: per-user-per-token holdings, ETH spent/received, trade counts
- **Pool** entities: post-graduation Aerodrome LP info

Polling intervals: 10s for token list, 5s for token detail, 30s for ETH/USD price.

### Writing to the Blockchain (ethers.js + Bonding Curve Contracts)

Users connect MetaMask (or any injected wallet) via ethers.js v6 BrowserProvider. RobinLens calls the bonding curve contracts directly:

```
buy(minTokensOut, deadline) payable  -- Send ETH, receive tokens (1% protocol fee)
sell(tokensToSell, minEthOut, deadline) -- Sell tokens back for ETH (requires ERC20 approve)
getTokensForEth(ethAmount) view      -- Quote: how many tokens for X ETH
getCurrentPrice() view               -- Current token price in ETH
trading() view                       -- Is bonding curve still active (false after graduation)
```

Each token on RobinPump has its own curve contract (BeaconProxy pattern). Contract ABIs were reverse-engineered from on-chain bytecode since the contracts are not source-verified on BaseScan.

### AI Analysis (OpenAI + On-Chain Metrics)

The AI pipeline:
1. Fetches token metadata from IPFS (description, image)
2. Calculates on-chain metrics from subgraph data: holder concentration, buy/sell ratio, volume momentum, creator dump behavior, bonding curve progress
3. Sends to OpenAI GPT-4o with a skeptical DeFi analyst persona
4. Returns structured analysis via Zod schema: RobinScore (0-100), sub-scores, risk flags, trade suggestion

### Bonding Curve Model

- Total supply per token: 1B (18 decimals)
- 80% on bonding curve, 20% reserved for LP
- Graduation threshold: ~4.2 ETH collected
- After graduation: liquidity migrates to Aerodrome DEX, LP tokens burned permanently

## Architecture

```
                          RobinLens Architecture

  +--------------------------------------------------------------+
  |                    Frontend (React 19 + Tailwind v4)          |
  |                                                               |
  |  Token Feed --> Token Detail --> Trade Panel + AI Analysis    |
  |       |              |               |              |         |
  |       v              v               v              v         |
  |  [Live Grid]   [Price Chart]   [Buy/Sell]   [Score+Verdict]  |
  |  [Filters]     [Trade Feed]    [Position]   [Risk Flags]     |
  |  [Search]      [Holders]       [PnL]        [Suggestion]     |
  +--------+-------------+-------------+--------------+-----------+
           |             |             |              |
  +--------v---+  +------v------+ +---v--------+ +---v--------+
  |  Goldsky   |  |    Base     | | MetaMask   | |  OpenAI    |
  |  Subgraph  |  |  Mainnet   | | Wallet     | |    API     |
  |  (GraphQL) |  |  (RPC)     | | (Signer)   | |  (GPT-4o)  |
  +------------+  +------------+ +------------+ +------------+
       |                |              |              |
  Token data       Contract       Execute         Structured
  Trade history    reads          buy/sell        analysis with
  User positions                  on bonding      Zod schema
  Curve state                     curve
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite 7 + React 19 + TypeScript 5.9 |
| Styling | Tailwind CSS v4 (CSS-first, dark theme) |
| Charts | lightweight-charts v5 (TradingView) |
| Chain | ethers.js v6 (Base Mainnet, Chain ID 8453) |
| Wallet | MetaMask / injected wallet via BrowserProvider |
| Data | Goldsky Subgraph (GraphQL, public endpoint) |
| AI | OpenAI API + Zod v4 (Structured Outputs) |
| Deploy | Vercel (SPA with rewrites) |

## SDKs and Base Features Used

- **ethers.js v6**: BrowserProvider for wallet connection, Contract for bonding curve interaction (buy/sell/quote), formatEther/parseEther for unit conversion
- **Goldsky Subgraph**: GraphQL queries against indexed RobinPump contract events on Base
- **OpenAI SDK**: Chat completions with JSON mode for structured token analysis
- **Zod v4**: Schema validation for LLM output, ensuring type-safe analysis results
- **lightweight-charts**: TradingView-quality candlestick charts from on-chain trade data

What makes Base uniquely suitable: sub-cent gas fees enable frequent small trades on the bonding curve, making the "analyze then trade" workflow practical. The Goldsky subgraph provides indexed access to all RobinPump events without running our own indexer.

## Project Structure

```
RobinX/
├── frontend/
│   └── src/
│       ├── lib/
│       │   ├── goldsky.ts          # Subgraph client + GraphQL queries
│       │   ├── contracts.ts        # Bonding curve ABI + trade functions
│       │   ├── wallet.ts           # Wallet connect/disconnect/switch chain
│       │   ├── analyzer.ts         # OpenAI LLM analysis
│       │   ├── analysisSchema.ts   # Zod schema for TokenAnalysis
│       │   ├── metrics.ts          # On-chain metrics calculator
│       │   ├── metadata.ts         # IPFS metadata fetcher
│       │   ├── format.ts           # Number/address formatting
│       │   └── chains.ts           # Base Mainnet config
│       ├── hooks/
│       │   ├── useWallet.ts        # Wallet context + hook
│       │   ├── useTrade.ts         # Trade execution hook
│       │   ├── useCurves.ts        # Token list polling (10s)
│       │   ├── useCurveDetail.ts   # Token detail polling (5s)
│       │   └── useEthPrice.ts      # ETH/USD polling (30s)
│       ├── components/
│       │   ├── TradePanel.tsx       # Buy/sell interface
│       │   ├── PositionCard.tsx     # User position + PnL
│       │   ├── ConnectButton.tsx    # Wallet connect button
│       │   ├── AnalysisCard.tsx     # AI analysis + trade suggestion
│       │   ├── PriceChart.tsx       # Candlestick chart
│       │   ├── TradeFeed.tsx        # Trade history table
│       │   └── HolderChart.tsx      # Holder distribution
│       └── pages/
│           ├── TokenFeed.tsx        # Home: all tokens grid
│           ├── TokenDetail.tsx      # Single token: chart + trade + analysis
│           └── Leaderboard.tsx      # Top traders by PnL
└── docs/
    └── plans/                       # Implementation plans
```

## Getting Started

```bash
# Clone
git clone https://github.com/calderbuild/RobinX.git
cd RobinX/frontend

# Install
npm install

# Configure (optional -- works without API key using demo analysis)
cp .env.example .env
# Edit .env: set VITE_OPENAI_API_KEY for live AI analysis

# Run
npm run dev
# Open http://localhost:5173
```

## Environment Variables

```bash
VITE_OPENAI_API_KEY=your-api-key     # Required for live AI analysis
VITE_OPENAI_BASE_URL=                 # Optional, defaults to OpenAI
VITE_OPENAI_MODEL=gpt-4o             # Optional, defaults to gpt-4o
```

Without an API key, the app falls back to demo analysis data with localStorage caching.

## Roadmap

- Automated trading strategies based on RobinScore thresholds
- Portfolio management with multi-token tracking
- Price alerts and notification system
- Public API for other builders to integrate RobinScore
- Mobile-optimized trading experience

## Team

> TODO: Team member introductions

## License

MIT
