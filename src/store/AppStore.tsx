import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppData, Macrocycle, WorkoutLog } from '../lib/types'
import type { TrackedExercise } from '../lib/trackerTypes'
import { emptyAppData } from '../lib/types'
import { repository } from '../lib/repository'
import { normalizeTrackedExercises } from './trackerFactories'

interface AppStoreValue {
  data: AppData
  loading: boolean
  saving: boolean
  error: string | null
  mode: 'cloud' | 'local'
  setMacrocycles: (updater: (prev: Macrocycle[]) => Macrocycle[]) => void
  setLogs: (updater: (prev: WorkoutLog[]) => WorkoutLog[]) => void
  setTrackedExercises: (updater: (prev: TrackedExercise[]) => TrackedExercise[]) => void
  reload: () => Promise<void>
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyAppData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirty = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await repository.load()
      setData({
        ...loaded,
        trackedExercises: normalizeTrackedExercises(loaded.trackedExercises),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Debounced persistence whenever data changes after the initial load.
  useEffect(() => {
    if (loading) return
    if (!dirty.current) {
      dirty.current = true
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSaving(true)
      repository
        .save(data)
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to save'))
        .finally(() => setSaving(false))
    }, 500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [data, loading])

  const setMacrocycles = useCallback(
    (updater: (prev: Macrocycle[]) => Macrocycle[]) => {
      setData((prev) => ({ ...prev, macrocycles: updater(prev.macrocycles) }))
    },
    [],
  )

  const setLogs = useCallback(
    (updater: (prev: WorkoutLog[]) => WorkoutLog[]) => {
      setData((prev) => ({ ...prev, logs: updater(prev.logs) }))
    },
    [],
  )

  const setTrackedExercises = useCallback(
    (updater: (prev: TrackedExercise[]) => TrackedExercise[]) => {
      setData((prev) => ({ ...prev, trackedExercises: updater(prev.trackedExercises) }))
    },
    [],
  )

  const value = useMemo<AppStoreValue>(
    () => ({
      data,
      loading,
      saving,
      error,
      mode: repository.mode,
      setMacrocycles,
      setLogs,
      setTrackedExercises,
      reload: load,
    }),
    [data, loading, saving, error, setMacrocycles, setLogs, setTrackedExercises, load],
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
