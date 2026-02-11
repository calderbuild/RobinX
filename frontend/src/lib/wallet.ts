import { BrowserProvider, JsonRpcSigner } from 'ethers'
import { BASE_MAINNET } from './chains'

export interface WalletState {
  address: string | null
  signer: JsonRpcSigner | null
  chainId: number | null
  balance: string | null
}

const STORAGE_KEY = 'robinlens:wallet-connected'

function getEthereum(): (typeof window)['ethereum'] | undefined {
  return typeof window !== 'undefined' ? window.ethereum : undefined
}

export async function connectWallet(): Promise<{ address: string; signer: JsonRpcSigner; chainId: number }> {
  const ethereum = getEthereum()
  if (!ethereum) {
    throw new Error('No wallet detected. Install MetaMask to continue.')
  }

  const provider = new BrowserProvider(ethereum)
  const accounts: string[] = await provider.send('eth_requestAccounts', [])
  if (!accounts.length) {
    throw new Error('No accounts returned')
  }

  const network = await provider.getNetwork()
  const chainId = Number(network.chainId)

  if (chainId !== BASE_MAINNET.chainId) {
    await switchToBase()
    // Re-create provider after chain switch
    const newProvider = new BrowserProvider(ethereum)
    const signer = await newProvider.getSigner()
    localStorage.setItem(STORAGE_KEY, '1')
    return { address: signer.address, signer, chainId: BASE_MAINNET.chainId }
  }

  const signer = await provider.getSigner()
  localStorage.setItem(STORAGE_KEY, '1')
  return { address: signer.address, signer, chainId }
}

export async function reconnectWallet(): Promise<{ address: string; signer: JsonRpcSigner; chainId: number } | null> {
  if (!localStorage.getItem(STORAGE_KEY)) return null

  const ethereum = getEthereum()
  if (!ethereum) return null

  const provider = new BrowserProvider(ethereum)
  const accounts: string[] = await provider.send('eth_accounts', [])
  if (!accounts.length) {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }

  const network = await provider.getNetwork()
  const chainId = Number(network.chainId)
  const signer = await provider.getSigner()

  return { address: signer.address, signer, chainId }
}

export function disconnectWallet(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export async function switchToBase(): Promise<void> {
  const ethereum = getEthereum()
  if (!ethereum) throw new Error('No wallet detected')

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_MAINNET.chainIdHex }],
    })
  } catch (err: unknown) {
    const switchError = err as { code?: number }
    // Chain not added yet (4902) -- add it
    if (switchError.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: BASE_MAINNET.chainIdHex,
          chainName: BASE_MAINNET.name,
          rpcUrls: [BASE_MAINNET.rpc],
          blockExplorerUrls: [BASE_MAINNET.explorer],
          nativeCurrency: BASE_MAINNET.currency,
        }],
      })
    } else {
      throw err
    }
  }
}

export async function getEthBalance(address: string): Promise<string> {
  const ethereum = getEthereum()
  if (!ethereum) return '0'

  const provider = new BrowserProvider(ethereum)
  const balance = await provider.getBalance(address)
  const { formatEther } = await import('ethers')
  return formatEther(balance)
}

export function onAccountsChanged(callback: (accounts: string[]) => void): () => void {
  const ethereum = getEthereum()
  if (!ethereum) return () => {}

  ethereum.on('accountsChanged', callback)
  return () => ethereum.removeListener('accountsChanged', callback)
}

export function onChainChanged(callback: (chainId: string) => void): () => void {
  const ethereum = getEthereum()
  if (!ethereum) return () => {}

  ethereum.on('chainChanged', callback)
  return () => ethereum.removeListener('chainChanged', callback)
}
