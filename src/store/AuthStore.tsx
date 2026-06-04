import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface Credentials {
  username: string
  password: string
}

interface AuthStoreValue {
  isAuthenticated: boolean
  username: string | null
  login: (username: string, password: string) => boolean
  logout: () => void
}

// Default seeded user.
const SEEDED_USER: Credentials = {
  username: 'de._.rex',
  password: 'Derex@2000',
}

const SESSION_KEY = 'tpm.auth.session'

const AuthStoreContext = createContext<AuthStoreValue | null>(null)

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function AuthStoreProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => readSession())

  const login = useCallback((inputUsername: string, inputPassword: string) => {
    if (
      inputUsername === SEEDED_USER.username &&
      inputPassword === SEEDED_USER.password
    ) {
      setUsername(inputUsername)
      try {
        localStorage.setItem(SESSION_KEY, inputUsername)
      } catch {
        /* ignore persistence errors */
      }
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setUsername(null)
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore persistence errors */
    }
  }, [])

  const value = useMemo<AuthStoreValue>(
    () => ({
      isAuthenticated: username !== null,
      username,
      login,
      logout,
    }),
    [username, login, logout],
  )

  return <AuthStoreContext.Provider value={value}>{children}</AuthStoreContext.Provider>
}

export function useAuthStore(): AuthStoreValue {
  const ctx = useContext(AuthStoreContext)
  if (!ctx) throw new Error('useAuthStore must be used within an AuthStoreProvider')
  return ctx
}
