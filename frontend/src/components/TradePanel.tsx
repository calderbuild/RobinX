import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useTrade } from '../hooks/useTrade'
import { quoteBuy, getTokenBalance } from '../lib/contracts'
import { useDebounce } from '../hooks/useDebounce'
import { formatEth, formatNumber } from '../lib/format'
import { basescanTxUrl } from '../lib/chains'
import type { Curve } from '../lib/goldsky'
import { BrowserProvider } from 'ethers'

interface TradePanelProps {
  curve: Curve
  onTradeSuccess: () => void
}

type Tab = 'buy' | 'sell'

export function TradePanel({ curve, onTradeSuccess }: TradePanelProps) {
  const { address, signer, isWrongChain, connect } = useWallet()
  const [tab, setTab] = useState<Tab>('buy')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(5)
  const [quote, setQuote] = useState<string | null>(null)
  const [tokenBalance, setTokenBalance] = useState<string | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  const debouncedAmount = useDebounce(amount, 300)

  const { status, txHash, error, buy, sell, reset } = useTrade(
    curve.id,
    curve.token,
    slippage * 100,
    onTradeSuccess,
  )

  const isGraduated = curve.graduated

  // Fetch token balance when connected
  useEffect(() => {
    if (!address || !signer) {
      setTokenBalance(null)
      return
    }
    const provider = signer.provider
    if (!provider) return
    getTokenBalance(curve.token, address, provider)
      .then(({ balance }) => setTokenBalance(balance))
      .catch(() => setTokenBalance(null))
  }, [address, signer, curve.token, status])

  // Fetch quote when buy amount changes
  useEffect(() => {
    if (tab !== 'buy' || !debouncedAmount || parseFloat(debouncedAmount) <= 0) {
      setQuote(null)
      return
    }

    let cancelled = false
    setQuoteLoading(true)

    async function fetchQuote() {
      try {
        const ethereum = window.ethereum
        if (!ethereum) return
        const provider = new BrowserProvider(ethereum)
        const { tokensOut } = await quoteBuy(curve.id, debouncedAmount, provider)
        if (!cancelled) setQuote(tokensOut)
      } catch {
        if (!cancelled) setQuote(null)
      } finally {
        if (!cancelled) setQuoteLoading(false)
      }
    }

    fetchQuote()
    return () => { cancelled = true }
  }, [tab, debouncedAmount, curve.id])

  const handleSubmit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return
    reset()
    if (tab === 'buy') {
      await buy(amount)
    } else {
      await sell(amount)
    }
    if (status === 'confirmed') {
      setAmount('')
      setQuote(null)
    }
  }, [tab, amount, buy, sell, reset, status])

  // After confirmed, clear input
  useEffect(() => {
    if (status === 'confirmed') {
      setAmount('')
      setQuote(null)
    }
  }, [status])

  if (isGraduated) {
    const poolUrl = curve.pool
      ? `https://aerodrome.finance/pools/${curve.pool.id}`
      : 'https://aerodrome.finance'
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6">
        <h3 className="font-display text-base font-semibold text-text-primary">Trade</h3>
        <p className="mt-2 text-sm text-text-muted">
          This token has graduated from the bonding curve.
        </p>
        <a
          href={poolUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue/80"
        >
          Trade on Aerodrome
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <h3 className="font-display text-base font-semibold text-text-primary">Trade</h3>

      {/* Tabs */}
      <div className="mt-3 flex rounded-lg bg-bg-primary p-1">
        {(['buy', 'sell'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setAmount(''); setQuote(null); reset() }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? t === 'buy'
                  ? 'bg-green/20 text-green'
                  : 'bg-red/20 text-red'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t === 'buy' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{tab === 'buy' ? 'You pay' : 'You sell'}</span>
          {tab === 'sell' && tokenBalance && (
            <span>Balance: {formatNumber(tokenBalance)} {curve.symbol}</span>
          )}
        </div>
        <div className="mt-1 flex items-center rounded-lg border border-border bg-bg-primary px-3 py-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="any"
            min="0"
            className="flex-1 bg-transparent font-mono text-lg text-text-primary outline-none placeholder:text-text-muted [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="ml-2 text-sm font-medium text-text-secondary">
            {tab === 'buy' ? 'ETH' : curve.symbol}
          </span>
        </div>

        {/* Quick amount buttons */}
        <div className="mt-2 flex gap-1.5">
          {(tab === 'buy'
            ? [{ label: '0.01', value: '0.01' }, { label: '0.05', value: '0.05' }, { label: '0.1', value: '0.1' }, { label: '0.5', value: '0.5' }]
            : [{ label: '25%', pct: 0.25 }, { label: '50%', pct: 0.5 }, { label: '75%', pct: 0.75 }, { label: '100%', pct: 1 }]
          ).map((btn) => (
            <button
              key={btn.label}
              onClick={() => {
                if ('value' in btn) {
                  setAmount(btn.value)
                } else if (tokenBalance) {
                  const val = parseFloat(tokenBalance) * btn.pct
                  setAmount(val > 0 ? val.toString() : '')
                }
              }}
              className="flex-1 rounded bg-bg-tertiary px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quote */}
      {tab === 'buy' && (quote || quoteLoading) && (
        <div className="mt-3 rounded-lg bg-bg-primary px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">You receive (est.)</span>
            <span className="font-mono text-text-secondary">
              {quoteLoading ? '...' : `${formatNumber(quote!)} ${curve.symbol}`}
            </span>
          </div>
        </div>
      )}

      {/* Slippage */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-text-muted">Slippage tolerance</span>
        <div className="flex items-center gap-1">
          {[1, 3, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => setSlippage(s)}
              className={`rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                slippage === s
                  ? 'bg-blue/20 text-blue'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {s}%
            </button>
          ))}
        </div>
      </div>

      {/* Current price */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-text-muted">Current price</span>
        <span className="font-mono text-text-secondary">{formatEth(curve.lastPriceEth)} ETH</span>
      </div>

      {/* Action button */}
      <div className="mt-4">
        {!address ? (
          <button
            onClick={connect}
            className="w-full rounded-lg bg-blue py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue/80"
          >
            Connect Wallet to Trade
          </button>
        ) : isWrongChain ? (
          <button
            disabled
            className="w-full rounded-lg bg-orange/20 py-2.5 text-sm font-medium text-orange"
          >
            Switch to Base first
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || status === 'pending' || status === 'confirming'}
            className={`w-full rounded-lg py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              tab === 'buy'
                ? 'bg-green hover:bg-green/80'
                : 'bg-red hover:bg-red/80'
            }`}
          >
            {status === 'pending' || status === 'confirming'
              ? 'Confirming...'
              : tab === 'buy'
                ? `Buy ${curve.symbol}`
                : `Sell ${curve.symbol}`}
          </button>
        )}
      </div>

      {/* Status */}
      {error && (
        <p className="mt-2 text-xs text-red">{error}</p>
      )}
      {txHash && status === 'confirmed' && (
        <div className="mt-2 text-center">
          <a
            href={basescanTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green hover:underline"
          >
            Transaction confirmed -- view on BaseScan
          </a>
        </div>
      )}
    </div>
  )
}
