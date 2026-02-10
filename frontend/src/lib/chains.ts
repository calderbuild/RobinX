export const BASE_MAINNET = {
  chainId: 8453,
  chainIdHex: '0x2105',
  name: 'Base',
  rpc: 'https://mainnet.base.org',
  explorer: 'https://basescan.org',
  currency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
} as const

export function basescanTxUrl(txHash: string): string {
  return `${BASE_MAINNET.explorer}/tx/${txHash}`
}

export function basescanAddressUrl(address: string): string {
  return `${BASE_MAINNET.explorer}/address/${address}`
}
