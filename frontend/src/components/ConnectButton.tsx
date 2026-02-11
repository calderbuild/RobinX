import { useWallet } from '../hooks/useWallet'
import { truncateAddress, formatEth } from '../lib/format'

export function ConnectButton() {
  const { address, balance, isConnecting, isWrongChain, connect, disconnect, switchChain } = useWallet()

  if (isWrongChain && address) {
    return (
      <button
        onClick={switchChain}
        className="rounded-lg bg-orange/20 px-3 py-1.5 text-sm font-medium text-orange transition-colors hover:bg-orange/30"
      >
        Switch to Base
      </button>
    )
  }

  if (address) {
    return (
      <div className="flex items-center gap-2">
        {balance && (
          <span className="font-mono text-xs text-text-secondary">
            {formatEth(balance)} ETH
          </span>
        )}
        <button
          onClick={disconnect}
          className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover"
          title="Disconnect wallet"
        >
          {truncateAddress(address)}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="rounded-lg bg-blue px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue/80 disabled:opacity-50"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
