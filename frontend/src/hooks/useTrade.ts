import { useState, useCallback } from 'react'
import { useWallet } from './useWallet'
import { executeBuy, executeSell, type TradeResult } from '../lib/contracts'

type TradeStatus = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'error'

interface UseTradeResult {
  status: TradeStatus
  txHash: string | null
  error: string | null
  buy: (ethAmount: string) => Promise<TradeResult | null>
  sell: (tokenAmount: string) => Promise<TradeResult | null>
  reset: () => void
}

export function useTrade(
  curveAddress: string,
  tokenAddress: string,
  slippageBps: number = 500,
  onSuccess?: () => void,
): UseTradeResult {
  const { signer } = useWallet()
  const [status, setStatus] = useState<TradeStatus>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setTxHash(null)
    setError(null)
  }, [])

  const buy = useCallback(async (ethAmount: string): Promise<TradeResult | null> => {
    if (!signer) {
      setError('Wallet not connected')
      return null
    }

    setStatus('pending')
    setError(null)
    setTxHash(null)

    try {
      setStatus('confirming')
      const result = await executeBuy(curveAddress, signer, ethAmount, slippageBps)
      setTxHash(result.txHash)
      setStatus('confirmed')
      onSuccess?.()
      return result
    } catch (err) {
      const message = parseTradeError(err)
      setError(message)
      setStatus('error')
      return null
    }
  }, [signer, curveAddress, slippageBps, onSuccess])

  const sell = useCallback(async (tokenAmount: string): Promise<TradeResult | null> => {
    if (!signer) {
      setError('Wallet not connected')
      return null
    }

    setStatus('pending')
    setError(null)
    setTxHash(null)

    try {
      setStatus('confirming')
      const result = await executeSell(curveAddress, tokenAddress, signer, tokenAmount, slippageBps)
      setTxHash(result.txHash)
      setStatus('confirmed')
      onSuccess?.()
      return result
    } catch (err) {
      const message = parseTradeError(err)
      setError(message)
      setStatus('error')
      return null
    }
  }, [signer, curveAddress, tokenAddress, slippageBps, onSuccess])

  return { status, txHash, error, buy, sell, reset }
}

function parseTradeError(err: unknown): string {
  if (!(err instanceof Error)) return 'Transaction failed'
  const msg = err.message.toLowerCase()
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction rejected'
  if (msg.includes('insufficient funds')) return 'Insufficient ETH balance'
  if (msg.includes('slippage')) return 'Price moved too much (slippage exceeded)'
  if (msg.includes('deadline')) return 'Transaction expired'
  return err.message.slice(0, 100)
}
