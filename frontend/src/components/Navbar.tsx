import { Link, useLocation } from 'react-router-dom'
import { ConnectButton } from './ConnectButton'

const NAV_ITEMS = [
  { path: '/', label: 'Feed' },
  { path: '/leaderboard', label: 'Leaderboard' },
] as const

export function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-primary/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <span className="font-display text-lg font-semibold text-text-primary">
            RobinLens
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(({ path, label }) => {
              const active = pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium no-underline transition-colors ${
                    active
                      ? 'bg-bg-tertiary text-text-primary'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </div>
          <ConnectButton />
        </div>
      </div>
    </nav>
  )
}
