---
title: "feat: Upgrade RobinLens to Full Trading dApp"
type: feat
date: 2026-02-11
hackathon: EasyA Consensus Hong Kong 2026
track: DeFi Track ($55K prize pool)
deadline: 2026-02-12
---

# Upgrade RobinLens to Full Trading dApp

## Overview

将 RobinLens 从只读分析仪表盘升级为完整的 DeFi 交易 dApp，补齐赛题要求的所有短板：钱包连接、链上交易（buy/sell bonding curve）、用户持仓追踪、AI 驱动的交易建议。

**赛题原文**: "Build a DeFi application that makes trading more efficient on RobinPump. This can be a smart contract-based dApp or a trading bot that provides enhanced liquidity and helps traders make more money."

**核心定位升级**: 从 "AI 分析工具" 变为 "AI 驱动的智能交易终端" -- 分析 + 执行一体化。

**一句话 Pitch**: "The AI trading terminal for RobinPump -- see the signal, trade in one click."

## 赛题对照 (升级后)

| 赛题要求 | 升级后方案 | 匹配度 |
|----------|-----------|--------|
| DeFi application | 完整 dApp：连钱包、看数据、做交易 | 完全匹配 |
| Makes trading more efficient | AI 评分 + 一键交易 + 风险提示 = 效率提升 | 完全匹配 |
| Smart contract-based dApp | 直接调用 RobinPump bonding curve 合约 buy/sell | 完全匹配 |
| Enhanced liquidity | 降低信息壁垒，让更多人敢于交易 = 间接提升流动性 | 间接匹配 |
| Helps traders make more money | AI 评分过滤垃圾项目 + 风险控制 = 帮助决策 | 匹配 |
| Use of blockchain (评审) | 链上交易、合约读写、subgraph、Base Mainnet | 强匹配 |
| Deployment (评审) | Vercel 前端 + Base Mainnet 实际交易 | 匹配 |

## 评审标准优化

| 评审维度 | 之前 | 升级后 |
|---------|------|-------|
| **Execution** | 分析仪表盘，可用但无交易 | 完整交易终端：连钱包、看分析、一键交易 |
| **Usefulness** | 信息工具 | 直接帮用户交易赚钱 |
| **Learning** | AI x Web3 分析 | AI x Web3 分析 + DeFi 交易执行 |
| **Use of blockchain** | 只读 subgraph | 读写双向：subgraph 查询 + 合约交易 |
| **Deployment** | Vercel 静态站 | Vercel + Base Mainnet 真实交易 |

## 技术方案

### RobinPump 合约接口 (逆向确认)

合约未在 BaseScan 验证，以下为链上逆向结果：

**关键地址**:

| 角色 | 地址 |
|------|------|
| Factory (Proxy) | `0x07dfaec8e182c5ef79844adc70708c1c15aa60fb` |
| Curve Implementation | `0x87b468b0136af4dfb5f7426aae2ebd4d8e05f7ba` |
| WETH (Base) | `0x4200000000000000000000000000000000000006` |
| Fee Collector | `0xaee44c38633f7ed683c0c61840663c04d6c4c937` |

**Curve 合约交易函数**:

```solidity
// 买入：发送 ETH，获得代币
function buy(uint256 minTokensOut, uint256 deadline) external payable;
// msg.value = 要花的 ETH（扣 1% fee）

// 卖出：需要先 approve token 给 curve 合约
function sell(uint256 tokensToSell, uint256 minEthOut, uint256 deadline) external;

// 查询：当前价格
function getCurrentPrice() external view returns (uint256);

// 查询：X ETH 能买多少 token
function getTokensForEth(uint256 ethAmount) external view returns (uint256);

// 查询：是否在曲线交易阶段（毕业后为 false）
function trading() external view returns (bool);
```

**代币经济模型**:
- 总供应: 1,000,000,000 (1B), 18 decimals
- 曲线分配: 800,000,000 (80%) 在 bonding curve 上交易
- LP 预留: 200,000,000 (20%) 毕业后注入 Aerodrome
- 手续费: 1% (买卖各收)
- 毕业阈值: ~4.2 ETH

### 技术选型

**钱包连接**: 直接用 ethers.js v6 BrowserProvider（已在依赖中），不引入 wagmi/viem，减少复杂度。

理由：
- ethers.js v6 已在 package.json 中
- BrowserProvider 直接包装 window.ethereum（MetaMask）
- 不需要 wagmi 的 hooks 抽象，手写更可控
- 黑客松时间有限，少一个依赖少一个坑

**链交互**: ethers.js v6 Contract 实例 + 手写 ABI

## 实现阶段

### Phase 1: 钱包连接层

**目标**: 用户可以连接 MetaMask，显示地址和 ETH 余额。

**新增文件**:

- `src/lib/wallet.ts` -- 钱包连接核心逻辑
- `src/hooks/useWallet.ts` -- React hook 封装钱包状态
- `src/components/ConnectButton.tsx` -- 连接/断开按钮

**`src/lib/wallet.ts`**:

```typescript
// 核心功能：
// - connectWallet(): BrowserProvider + getSigner, 验证 chainId === 8453
// - disconnectWallet(): 清除状态
// - switchToBase(): 如果在错误链上，请求切换到 Base
// - getBalance(address): 查询 ETH 余额
// - 监听 accountsChanged / chainChanged 事件
```

**`src/hooks/useWallet.ts`**:

```typescript
// 状态：address, signer, balance, chainId, isConnecting, error
// 方法：connect(), disconnect()
// 自动恢复：localStorage 记住上次连接状态，页面刷新自动重连
// 事件监听：账户切换、链切换时自动更新
```

**`src/components/ConnectButton.tsx`**:

```typescript
// 未连接：显示 "Connect Wallet" 按钮
// 连接中：显示 loading spinner
// 已连接：显示 truncated address + ETH balance + disconnect 按钮
// 错误链：显示 "Switch to Base" 按钮
```

**修改文件**:

- `src/components/Navbar.tsx` -- 右侧添加 ConnectButton
- `src/App.tsx` -- 顶层添加 WalletProvider context

**验收标准**:
- 点击 Connect Wallet 弹出 MetaMask
- 连接后显示地址和余额
- 错误链自动提示切换到 Base (8453)
- 页面刷新保持连接状态

### Phase 2: 合约交互层

**目标**: 封装 RobinPump bonding curve 的 buy/sell 操作。

**新增文件**:

- `src/lib/contracts.ts` -- 合约 ABI + 交互函数
- `src/hooks/useTrade.ts` -- 交易执行 hook

**`src/lib/contracts.ts`**:

```typescript
// CURVE_ABI: buy, sell, getCurrentPrice, getTokensForEth, trading
// ERC20_ABI: approve, allowance, balanceOf

// getCurveContract(curveAddress, signerOrProvider): Contract 实例
// getTokenContract(tokenAddress, signerOrProvider): Contract 实例

// quoteBuy(curveAddress, ethAmount): 预估能买多少 token
// quoteSell(curveAddress, tokenAmount): 预估能得多少 ETH (链上无此函数，需前端计算)
// executeBuy(curveAddress, signer, ethAmount, slippageBps): 执行买入
// executeSell(curveAddress, tokenAddress, signer, tokenAmount, slippageBps): approve + sell
// isTradingActive(curveAddress): 是否还在曲线阶段
```

**`src/hooks/useTrade.ts`**:

```typescript
// 状态：isPending, txHash, error, isConfirming, isConfirmed
// 方法：buy(ethAmount), sell(tokenAmount)
// 参数：curveAddress, tokenAddress, slippageBps (默认 500 = 5%)
// 依赖：useWallet 提供的 signer
// 交易后自动 refetch 持仓数据
```

**验收标准**:
- quoteBuy 返回准确的 token 数量预估
- executeBuy 成功发送交易并等待确认
- executeSell 自动处理 approve + sell 流程
- 交易失败有明确的错误信息

### Phase 3: 交易 UI

**目标**: 在 TokenDetail 页面添加交易面板和持仓显示。

**新增文件**:

- `src/components/TradePanel.tsx` -- 买卖面板
- `src/components/PositionCard.tsx` -- 用户持仓卡片

**`src/components/TradePanel.tsx`**:

```typescript
// 核心交易界面，嵌入 TokenDetail 页面右侧
//
// 结构：
// - Tab 切换：Buy / Sell
// - Buy 面板：
//   - ETH 输入框 + 快捷按钮 (25%, 50%, 75%, 100% of balance)
//   - 预估获得 token 数量 (实时查询 getTokensForEth)
//   - 滑点设置 (默认 5%, 可调)
//   - Price impact 显示
//   - "Buy" 按钮 (绿色)
// - Sell 面板：
//   - Token 输入框 + 快捷按钮 (25%, 50%, 75%, 100% of holdings)
//   - 预估获得 ETH 数量
//   - "Sell" 按钮 (红色)
// - 交易状态：pending / confirming / confirmed / error
// - 未连接钱包时：显示 "Connect Wallet to Trade"
// - 已毕业 token：显示 "Trading on Aerodrome" + 外链
//
// 关键交互：
// - 输入金额后 debounce 300ms 查询报价
// - 交易成功后自动清空输入、refetch 数据
// - 交易失败显示错误原因（余额不足、滑点过大等）
```

**`src/components/PositionCard.tsx`**:

```typescript
// 当用户连接钱包时，显示在当前 token 的持仓
//
// 数据来源：subgraph Position 实体 (按 user.id + curve.id 查询)
//   + 链上 balanceOf 作为实时余额
//
// 显示内容：
// - 持有数量 (token balance)
// - 成本基础 (totalEthSpent from Position)
// - 当前价值 (balance * currentPrice)
// - 未实现盈亏 (currentValue - costBasis), 绿色/红色
// - 已实现盈亏 (totalEthReceived - totalEthSpent for sold portion)
// - 买入/卖出次数
//
// 未持仓时：不显示或显示 "No position yet"
// 未连接钱包时：不渲染
```

**修改文件**:

- `src/pages/TokenDetail.tsx` -- 布局调整：
  - 原来：左侧 3/5 (chart + trades), 右侧 2/5 (analysis + holders)
  - 调整：左侧 (chart + trades), 右侧上方 TradePanel, 下方 PositionCard, 再下方 AnalysisCard + HolderChart
  - TradePanel 放在最显眼的位置（右侧顶部）
- `src/hooks/useCurveDetail.ts` -- 扩展：当钱包已连接时，额外查询用户的 Position
- `src/lib/goldsky.ts` -- 新增 `fetchUserPosition(curveId, userAddress)` 查询

**验收标准**:
- 连接钱包后看到 TradePanel
- 输入 ETH 金额实时显示预估 token 数量
- 点击 Buy 弹出 MetaMask 确认，交易成功后持仓更新
- 点击 Sell 自动处理 approve，交易成功后持仓更新
- 已毕业 token 正确显示 "Trading on Aerodrome"

### Phase 4: AI 智能交易建议

**目标**: 将 AI 分析与交易决策打通，提供 "分析即交易" 的体验。

**修改文件**:

- `src/components/AnalysisCard.tsx` -- 在分析结果下方添加交易建议区域：
  - 根据 overall_score 和 risk_flags 生成建议：
    - Score >= 70, 无 critical flags: "Consider buying" (绿色)
    - Score 40-69: "Research more before trading" (黄色)
    - Score < 40 或有 critical flags: "High risk -- proceed with caution" (红色)
  - 建议旁边放一个 "Quick Buy" 按钮（高分 token 时）
  - 不做自动交易，只是降低从 "分析" 到 "交易" 的摩擦

- `src/lib/analysisSchema.ts` -- 扩展 schema 添加可选的 `suggested_action` 字段：
  - `{ action: 'buy' | 'hold' | 'avoid', confidence: number, reasoning: string }`

- `src/lib/analyzer.ts` -- 在 system prompt 中加入交易建议指令

**验收标准**:
- AI 分析完成后显示交易建议
- 高分 token 有明确的 "Consider buying" + Quick Buy 按钮
- 低分 token 有明确的风险警告

### Phase 5: 用户组合与增强功能

**目标**: 提升用户体验和 demo 效果。

**新增文件**:

- `src/pages/Portfolio.tsx` -- 用户持仓总览页面
- `src/hooks/usePortfolio.ts` -- 查询用户在所有 token 的持仓

**`src/pages/Portfolio.tsx`**:

```typescript
// 路由: /portfolio
// 显示连接钱包用户的所有 RobinPump 持仓
//
// 内容：
// - 总资产价值 (ETH + USD)
// - 总 PnL (已实现 + 未实现)
// - 每个持仓的 TokenCard（带 PnL 和 Quick Sell 按钮）
// - 交易历史 (最近 20 笔)
//
// 数据来源：fetchPositions where user.id = connectedAddress
```

**修改文件**:

- `src/App.tsx` -- 添加 /portfolio 路由
- `src/components/Navbar.tsx` -- 添加 Portfolio 导航链接（仅在连接钱包后显示）

**验收标准**:
- 连接钱包后可以查看所有持仓
- 显示总 PnL 和每个 token 的 PnL
- 可以从 Portfolio 页面快速卖出

### Phase 6: Demo 准备与提交材料

**目标**: 满足赛事提交要求，准备 3 分钟 demo。

**任务**:

- [ ] Vercel 部署配置
  - 设置环境变量: VITE_OPENAI_API_KEY, VITE_OPENAI_MODEL
  - 验证 SPA rewrites 正常工作

- [ ] README.md 更新
  - Demo 视频 (Loom)
  - UI 截图 (至少 4 张: Feed, Detail+Trading, Analysis, Portfolio)
  - Base 区块链交互说明：
    - 读: Goldsky subgraph 查询 token/trade/position 数据
    - 写: ethers.js 调用 bonding curve buy/sell 合约
    - 分析: 链上指标 + AI 评分
  - 项目架构图
  - 安装运行步骤

- [ ] 3 分钟 Demo 脚本
  - 0:00-0:30 团队介绍 (Canva slide)
  - 0:30-1:00 问题: "RobinPump 上 48+ token，零过滤零风控，交易效率极低"
  - 1:00-1:30 方案: 打开 RobinLens，展示 token feed + RobinScore
  - 1:30-2:00 核心演示: 连接钱包 -> 选 token -> 看 AI 分析 -> 一键买入 (真实链上交易)
  - 2:00-2:30 区块链使用: Goldsky subgraph + Base 合约交互 + Aerodrome 毕业
  - 2:30-3:00 Roadmap: 自动策略、组合管理、API 开放

- [ ] Canva 演示文稿 (赛事要求)
  - Team slide
  - Problem -> Solution -> Demo -> Tech -> Roadmap

- [ ] Loom 视频 (赛事要求)
  - 完整功能演示
  - GitHub 仓库结构讲解
  - 区块链交互说明

## 提交要求检查清单

| 要求 | 状态 | 说明 |
|------|------|------|
| Built using blockchain technology | 待完成 | Base Mainnet, bonding curve 合约交互 |
| Open source on GitHub | 待完成 | 公开仓库 |
| Short summary (<150 chars) | 待写 | "AI-powered trading terminal for RobinPump: scores tokens with on-chain signals, trade in one click on Base" |
| Full description | 待写 | 问题+方案+技术 |
| Technical description (SDKs used) | 待写 | ethers.js, Goldsky subgraph, OpenAI, Zod, lightweight-charts |
| Canva presentation link | 待做 | |
| README: demo video | 待做 | |
| README: screenshots | 待做 | |
| README: blockchain interaction | 待写 | |
| README: Loom video | 待做 | |

## 文件变更清单

### 新增文件 (8 个)

| 文件 | 用途 | 阶段 |
|------|------|------|
| `src/lib/wallet.ts` | 钱包连接核心逻辑 | Phase 1 |
| `src/lib/contracts.ts` | 合约 ABI + 交易函数 | Phase 2 |
| `src/hooks/useWallet.ts` | 钱包状态 hook | Phase 1 |
| `src/hooks/useTrade.ts` | 交易执行 hook | Phase 2 |
| `src/hooks/usePortfolio.ts` | 用户持仓查询 hook | Phase 5 |
| `src/components/ConnectButton.tsx` | 连接钱包按钮 | Phase 1 |
| `src/components/TradePanel.tsx` | 买卖交易面板 | Phase 3 |
| `src/components/PositionCard.tsx` | 持仓显示卡片 | Phase 3 |

### 修改文件 (8 个)

| 文件 | 变更内容 | 阶段 |
|------|---------|------|
| `src/App.tsx` | 添加 WalletProvider context, /portfolio 路由 | Phase 1, 5 |
| `src/components/Navbar.tsx` | 添加 ConnectButton, Portfolio 链接 | Phase 1, 5 |
| `src/pages/TokenDetail.tsx` | 嵌入 TradePanel + PositionCard, 调整布局 | Phase 3 |
| `src/hooks/useCurveDetail.ts` | 扩展查询用户 Position | Phase 3 |
| `src/lib/goldsky.ts` | 新增 fetchUserPosition 查询 | Phase 3 |
| `src/components/AnalysisCard.tsx` | 添加交易建议区域 | Phase 4 |
| `src/lib/analysisSchema.ts` | 扩展 suggested_action 字段 | Phase 4 |
| `src/lib/analyzer.ts` | system prompt 加入交易建议 | Phase 4 |

### 不需要修改的文件

- `src/components/PriceChart.tsx` -- 纯可视化，不动
- `src/components/TradeFeed.tsx` -- 已完善，不动
- `src/components/HolderChart.tsx` -- 已完善，不动
- `src/components/ScoreBadge.tsx` -- 纯显示，不动
- `src/lib/format.ts` -- 工具函数，不动
- `src/lib/metrics.ts` -- 指标计算，不动
- `src/lib/metadata.ts` -- IPFS 获取，不动
- `src/lib/demoAnalysis.ts` -- Demo 数据，不动
- `src/lib/chains.ts` -- 可能需要加合约地址常量

## 风险分析

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| MetaMask 连接在 mobile 不可用 | 中 | 低 | Demo 用桌面浏览器，说明移动端为后续计划 |
| 合约 ABI 逆向有误 | 低 | 高 | 用真实小额交易验证 buy/sell 函数签名 |
| 交易 gas 估算失败 | 低 | 中 | Base gas 极低(<$0.01)，设宽裕 gasLimit |
| 滑点设置不当导致交易失败 | 中 | 中 | 默认 5% 滑点，UI 可调 |
| Demo 时 RobinPump 没有活跃 token | 低 | 高 | 准备一个测试 token 提前部署 |

## 优先级与砍功能策略

如果时间不够，按此优先级砍：

1. **必须完成** (Phase 1-3): 钱包连接 + 合约交易 + TradePanel -- 这是赛题核心
2. **应该完成** (Phase 4): AI 交易建议 -- 差异化亮点
3. **可以砍掉** (Phase 5): Portfolio 页面 -- Demo 时手动切换 token 展示即可
4. **必须完成** (Phase 6): README + Demo 视频 -- 提交硬性要求

## 不做的事情 (Non-Goals)

- 不做自动交易 bot（只做辅助决策 + 手动一键交易）
- 不部署自己的智能合约（直接调用 RobinPump 现有合约）
- 不做多链支持（只支持 Base）
- 不做 WalletConnect / Coinbase Wallet（只支持 MetaMask / 注入式钱包）
- 不做 token 创建功能（只做交易）
- 不做限价单或高级订单类型

## References

### 合约地址

- Factory: `0x07dfaec8e182c5ef79844adc70708c1c15aa60fb`
- Curve Implementation: `0x87b468b0136af4dfb5f7426aae2ebd4d8e05f7ba`
- WETH (Base): `0x4200000000000000000000000000000000000006`
- Aerodrome Router: `0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43`

### 数据源

- Goldsky Subgraph: `https://api.goldsky.com/api/public/project_cmjjrebt3mxpt01rm9yi04vqq/subgraphs/pump-charts/v2/gn`
- IPFS: `https://olive-defensive-giraffe-83.mypinata.cloud/ipfs/{cid}`
- Base RPC: `https://mainnet.base.org`
