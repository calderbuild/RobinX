import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { TokenFeed } from './pages/TokenFeed'
import { TokenDetail } from './pages/TokenDetail'
import { Leaderboard } from './pages/Leaderboard'
import { WalletContext, useWalletState } from './hooks/useWallet'

export default function App() {
  const walletState = useWalletState()

  return (
    <WalletContext value={walletState}>
      <Layout>
        <Routes>
          <Route path="/" element={<TokenFeed />} />
          <Route path="/token/:id" element={<TokenDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </Layout>
    </WalletContext>
  )
}
