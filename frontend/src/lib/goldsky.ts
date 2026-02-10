const SUBGRAPH_URL =
  'https://api.goldsky.com/api/public/project_cmjjrebt3mxpt01rm9yi04vqq/subgraphs/pump-charts/v2/gn'

// --- Entity Types ---

export interface Curve {
  id: string
  token: string
  name: string
  symbol: string
  uri: string
  creator: string
  createdAt: string
  graduated: boolean
  graduatedAt: string | null
  pool: Pool | null
  lastPriceEth: string
  lastPriceUsd: string
  totalVolumeEth: string
  ethCollected: string
  tradeCount: string
  athPriceEth: string
  athPriceUsd: string
  athTimestamp: string | null
}

export interface Trade {
  id: string
  curve: { id: string }
  phase: 'CURVE' | 'AERODROME'
  side: 'BUY' | 'SELL'
  amountEth: string
  amountToken: string
  priceEth: string
  priceUsd: string
  trader: string
  timestamp: string
  txHash: string
}

export interface User {
  id: string
  totalTradeCount: string
  firstTradeAt: string
  lastTradeAt: string
}

export interface Position {
  id: string
  user: { id: string }
  curve: { id: string }
  totalEthSpent: string
  totalEthReceived: string
  totalTokensBought: string
  totalTokensSold: string
  buyCount: string
  sellCount: string
}

export interface Pool {
  id: string
  curve: { id: string }
  token0: string
  token1: string
  wethIsToken0: boolean
  createdAt: string
}

export interface Bundle {
  id: string
  ethUsd: string
}

// --- GraphQL Client ---

interface GraphQLResponse<T> {
  data: T
  errors?: Array<{ message: string }>
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function querySubgraph<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      })

      if (response.status === 429) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
        continue
      }

      if (!response.ok) {
        throw new Error(`Subgraph request failed: ${response.status}`)
      }

      const json: GraphQLResponse<T> = await response.json()

      if (json.errors?.length) {
        throw new Error(json.errors[0].message)
      }

      return json.data
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
      }
    }
  }

  throw lastError ?? new Error('Subgraph query failed')
}

// --- Common Queries ---

const CURVE_FIELDS = `
  id
  token
  name
  symbol
  uri
  creator
  createdAt
  graduated
  graduatedAt
  lastPriceEth
  lastPriceUsd
  totalVolumeEth
  ethCollected
  tradeCount
  athPriceEth
  athPriceUsd
  athTimestamp
`

export type CurveSortField = 'totalVolumeEth' | 'createdAt' | 'lastPriceUsd' | 'tradeCount'

export async function fetchCurves(
  orderBy: CurveSortField = 'totalVolumeEth',
  first = 50,
  skip = 0,
): Promise<Curve[]> {
  const { curves } = await querySubgraph<{ curves: Curve[] }>(`
    query Curves($first: Int!, $skip: Int!, $orderBy: Curve_orderBy!) {
      curves(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: desc) {
        ${CURVE_FIELDS}
      }
    }
  `, { first, skip, orderBy })
  return curves
}

export async function fetchCurve(id: string): Promise<Curve | null> {
  const { curve } = await querySubgraph<{ curve: Curve | null }>(`
    query CurveDetail($id: ID!) {
      curve(id: $id) {
        ${CURVE_FIELDS}
        pool {
          id
          token0
          token1
          wethIsToken0
          createdAt
        }
      }
    }
  `, { id })
  return curve
}

export async function fetchTrades(
  curveId: string,
  first = 100,
  skip = 0,
): Promise<Trade[]> {
  const { trades } = await querySubgraph<{ trades: Trade[] }>(`
    query Trades($curveId: String!, $first: Int!, $skip: Int!) {
      trades(
        where: { curve: $curveId }
        orderBy: timestamp
        orderDirection: desc
        first: $first
        skip: $skip
      ) {
        id
        phase
        side
        amountEth
        amountToken
        priceEth
        priceUsd
        trader
        timestamp
        txHash
      }
    }
  `, { curveId, first, skip })
  return trades
}

export async function fetchPositions(curveId: string, first = 50): Promise<Position[]> {
  const { positions } = await querySubgraph<{ positions: Position[] }>(`
    query Positions($curveId: String!, $first: Int!) {
      positions(
        where: { curve: $curveId }
        orderBy: totalEthSpent
        orderDirection: desc
        first: $first
      ) {
        id
        user { id }
        totalEthSpent
        totalEthReceived
        totalTokensBought
        totalTokensSold
        buyCount
        sellCount
      }
    }
  `, { curveId, first })
  return positions
}

export async function fetchEthUsd(): Promise<number> {
  const { bundle } = await querySubgraph<{ bundle: Bundle }>(`
    query EthPrice {
      bundle(id: "1") {
        ethUsd
      }
    }
  `)
  return parseFloat(bundle.ethUsd)
}

export async function fetchTopTraders(first = 50): Promise<(Position & { pnlEth: number })[]> {
  const { positions } = await querySubgraph<{ positions: Position[] }>(`
    query TopTraders($first: Int!) {
      positions(
        orderBy: totalEthReceived
        orderDirection: desc
        first: $first
      ) {
        id
        user { id }
        curve { id }
        totalEthSpent
        totalEthReceived
        totalTokensBought
        totalTokensSold
        buyCount
        sellCount
      }
    }
  `, { first })
  return positions.map((p) => ({
    ...p,
    pnlEth: parseFloat(p.totalEthReceived) - parseFloat(p.totalEthSpent),
  }))
}
