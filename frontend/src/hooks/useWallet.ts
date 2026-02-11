import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { JsonRpcSigner } from 'ethers'
import {
  connectWallet,
  reconnectWallet,
  disconnectWallet as clearWallet,
  switchToBase,
  getEthBalance,
  onAccountsChanged,
  onChainChanged,
} from '../lib/wallet'
import { BASE_MAINNET } from '../lib/chains'

interface WalletContextValue {
  address: string | null
  signer: JsonRpcSigner | null
  chainId: number | null
  balance: string | null
  isConnecting: boolean
  error: string | null
  isWrongChain: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchChain: () => Promise<void>
}

export const WalletContext = createContext<WalletContextValue>({
  address: null,
  signer: null,
  chainId: null,
  balance: null,
  isConnecting: false,
  error: null,
  isWrongChain: false,
  connect: async () => {},
  disconnect: () => {},
  switchChain: async () => {},
})

export function useWallet(): WalletContextValue {
  return useContext(WalletContext)
}

export function useWalletState(): WalletContextValue {
  const [address, setAddress] = useState<string | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isWrongChain = chainId !== null && chainId !== BASE_MAINNET.chainId

  const refreshBalance = useCallback(async (addr: string) => {
    try {
      const bal = await getEthBalance(addr)
      setBalance(bal)
    } catch {
      // non-critical
    }
  }, [])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const result = await connectWallet()
      setAddress(result.address)
      setSigner(result.signer)
      setChainId(result.chainId)
      refreshBalance(result.address)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }, [refreshBalance])

  const disconnect = useCallback(() => {
    clearWallet()
    setAddress(null)
    setSigner(null)
    setChainId(null)
    setBalance(null)
    setError(null)
  }, [])

  const switchChain = useCallback(async () => {
    try {
      await switchToBase()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch chain')
    }
  }, [])

  // Auto-reconnect on mount
  useEffect(() => {
    reconnectWallet().then((result) => {
      if (result) {
        setAddress(result.address)
        setSigner(result.signer)
        setChainId(result.chainId)
        refreshBalance(result.address)
      }
    })
  }, [refreshBalance])

  // Listen for account and chain changes
  useEffect(() => {
    const unsubAccounts = onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        // Re-connect to get updated signer
        reconnectWallet().then((result) => {
          if (result) {
            setAddress(result.address)
            setSigner(result.signer)
            setChainId(result.chainId)
            refreshBalance(result.address)
          }
        })
      }
    })

    const unsubChain = onChainChanged((newChainId) => {
      const numeric = parseInt(newChainId, 16)
      setChainId(numeric)
      // Re-connect to get updated signer for new chain
      reconnectWallet().then((result) => {
        if (result) {
          setAddress(result.address)
          setSigner(result.signer)
          refreshBalance(result.address)
        }
      })
    })

    return () => {
      unsubAccounts()
      unsubChain()
    }
  }, [disconnect, refreshBalance])

  // Refresh balance periodically
  useEffect(() => {
    if (!address) return
    const interval = setInterval(() => refreshBalance(address), 30_000)
    return () => clearInterval(interval)
  }, [address, refreshBalance])

  return {
    address,
    signer,
    chainId,
    balance,
    isConnecting,
    error,
    isWrongChain,
    connect,
    disconnect,
    switchChain,
  }
}
