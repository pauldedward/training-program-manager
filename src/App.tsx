import { Route, Routes } from 'react-router-dom'
import { useAppStore } from './store/AppStore'
import { useAuthStore } from './store/AuthStore'
import { Icon } from './components/ui'
import ProgramBuilder from './pages/ProgramBuilder'
import Execution from './pages/Execution'
import Review from './pages/Review'
import Tracker from './pages/Tracker'
import Login from './pages/Login'

function SaveStatus() {
  const { saving, mode, error } = useAppStore()
  return (
    <div className="flex items-center gap-1 text-[10px] text-slate-600">
      <Icon name={mode === 'cloud' ? 'cloud' : 'laptop'} className="h-3 w-3" />
      <span>
        {error ? (
          <span className="text-rose-400/70">Error</span>
        ) : saving ? (
          'Saving…'
        ) : mode === 'cloud' ? (
          'Synced'
        ) : (
          'Saved'
        )}
      </span>
    </div>
  )
}

export default function App() {
  const { isAuthenticated, logout } = useAuthStore()

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-full max-w-5xl flex-col">
        <Login />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col">
      <header className="safe-top sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-2">
            <Icon name="dumbbell" className="h-5 w-5 text-brand-400" />
            <span className="font-semibold tracking-tight">Training</span>
          </div>
          <div className="flex items-center gap-2">
            <SaveStatus />
            <button type="button" onClick={logout} className="btn-ghost px-2 py-1 text-xs">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="safe-bottom flex-1 px-4 py-4">
        <Routes>
          <Route path="/" element={<Tracker />} />
          <Route path="/plan" element={<ProgramBuilder />} />
          <Route path="/run" element={<Execution />} />
          <Route path="/run/:workoutId" element={<Execution />} />
          <Route path="/track" element={<Tracker />} />
          <Route path="/review" element={<Review />} />
        </Routes>
      </main>
    </div>
  )
}
