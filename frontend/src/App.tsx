import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { TokenFeed } from './pages/TokenFeed'
import { TokenDetail } from './pages/TokenDetail'
import { Leaderboard } from './pages/Leaderboard'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TokenFeed />} />
        <Route path="/token/:id" element={<TokenDetail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </Layout>
  )
}
