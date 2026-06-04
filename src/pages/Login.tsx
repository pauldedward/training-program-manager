import { useState, type FormEvent } from 'react'
import { useAuthStore } from '../store/AuthStore'
import { Icon } from '../components/ui'

export default function Login() {
  const { login } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const ok = login(username.trim(), password)
    if (!ok) setError('Invalid username or password')
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-sm space-y-4 p-6"
      >
        <div className="flex items-center gap-2">
          <Icon name="dumbbell" className="h-6 w-6 text-brand-400" />
          <span className="text-lg font-semibold tracking-tight">Training</span>
        </div>

        <div>
          <h1 className="text-base font-medium text-slate-100">Sign in</h1>
          <p className="text-xs text-slate-400">Enter your credentials to continue.</p>
        </div>

        <label className="block">
          <span className="label">Username</span>
          <input
            className="field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </label>

        <label className="block">
          <span className="label">Password</span>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p className="text-xs text-rose-400">{error}</p>
        )}

        <button type="submit" className="btn-primary w-full">
          Sign in
        </button>
      </form>
    </div>
  )
}
