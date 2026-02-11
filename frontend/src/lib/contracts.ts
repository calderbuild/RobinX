import { Contract, parseEther, formatEther, formatUnits, type JsonRpcSigner, type Provider } from 'ethers'
import { BASE_MAINNET } from './chains'

// Bonding curve contract ABI (reverse-engineered from on-chain)
const CURVE_ABI = [
  'function buy(uint256 minTokensOut, uint256 deadline) external payable',
  'function sell(uint256 tokensToSell, uint256 minEthOut, uint256 deadline) external',
  'function getCurrentPrice() external view returns (uint256)',
  'function getTokensForEth(uint256 ethAmount) external view returns (uint256)',
  'function trading() external view returns (bool)',
  'function FEE_PERCENT() external view returns (uint256)',
]

const ERC20_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
]

export function getCurveContract(curveAddress: string, signerOrProvider: JsonRpcSigner | Provider): Contract {
  return new Contract(curveAddress, CURVE_ABI, signerOrProvider)
}

export function getTokenContract(tokenAddress: string, signerOrProvider: JsonRpcSigner | Provider): Contract {
  return new Contract(tokenAddress, ERC20_ABI, signerOrProvider)
}

export async function isTradingActive(curveAddress: string, provider: Provider): Promise<boolean> {
  const curve = getCurveContract(curveAddress, provider)
  return curve.trading()
}

export async function quoteBuy(
  curveAddress: string,
  ethAmount: string,
  provider: Provider,
): Promise<{ tokensOut: string; tokensOutRaw: bigint }> {
  const curve = getCurveContract(curveAddress, provider)
  const ethWei = parseEther(ethAmount)
  const tokensOutRaw: bigint = await curve.getTokensForEth(ethWei)
  return {
    tokensOut: formatUnits(tokensOutRaw, 18),
    tokensOutRaw,
  }
}

export async function getTokenBalance(
  tokenAddress: string,
  userAddress: string,
  provider: Provider,
): Promise<{ balance: string; balanceRaw: bigint }> {
  const token = getTokenContract(tokenAddress, provider)
  const balanceRaw: bigint = await token.balanceOf(userAddress)
  return {
    balance: formatUnits(balanceRaw, 18),
    balanceRaw,
  }
}

export interface TradeResult {
  txHash: string
}

export async function executeBuy(
  curveAddress: string,
  signer: JsonRpcSigner,
  ethAmount: string,
  slippageBps: number = 500,
): Promise<TradeResult> {
  const curve = getCurveContract(curveAddress, signer)
  const ethWei = parseEther(ethAmount)

  // Get quote for slippage calculation
  const tokensOut: bigint = await curve.getTokensForEth(ethWei)
  const minTokensOut = tokensOut * BigInt(10000 - slippageBps) / BigInt(10000)
  const deadline = Math.floor(Date.now() / 1000) + 300 // 5 minutes

  const tx = await curve.buy(minTokensOut, deadline, { value: ethWei })
  await tx.wait()

  return { txHash: tx.hash }
}

export async function executeSell(
  curveAddress: string,
  tokenAddress: string,
  signer: JsonRpcSigner,
  tokenAmount: string,
  slippageBps: number = 500,
): Promise<TradeResult> {
  const token = getTokenContract(tokenAddress, signer)
  const curve = getCurveContract(curveAddress, signer)
  const address = await signer.getAddress()

  const tokenWei = parseEther(tokenAmount)

  // Check and set allowance
  const currentAllowance: bigint = await token.allowance(address, curveAddress)
  if (currentAllowance < tokenWei) {
    const approveTx = await token.approve(curveAddress, tokenWei)
    await approveTx.wait()
  }

  // Estimate ETH out: use current price as rough estimate
  // minEthOut = tokenAmount * currentPrice * (1 - slippage)
  const currentPrice: bigint = await curve.getCurrentPrice()
  const estimatedEthOut = tokenWei * currentPrice / BigInt(10 ** 18)
  const minEthOut = estimatedEthOut * BigInt(10000 - slippageBps) / BigInt(10000)
  const deadline = Math.floor(Date.now() / 1000) + 300

  const tx = await curve.sell(tokenWei, minEthOut, deadline)
  await tx.wait()

  return { txHash: tx.hash }
}

export { formatEther, parseEther, BASE_MAINNET }
