import { uid } from '../lib/id'
import type { EntryStatus, ExerciseEntry, SetRow, TrackedExercise } from '../lib/trackerTypes'

const today = (): string => new Date().toISOString().slice(0, 10)

export const newSetRow = (seed?: Partial<SetRow>): SetRow => ({
  id: uid(),
  reps: '',
  load: '',
  ...seed,
})

export const newExerciseEntry = (seed?: Partial<ExerciseEntry>): ExerciseEntry => ({
  id: uid(),
  date: today(),
  type: '',
  sets: '',
  reps: '',
  load: '',
  setRows: [],
  rpe: '',
  tempo: '',
  notes: '',
  status: 'success',
  ...seed,
})

export const newTrackedExercise = (name = ''): TrackedExercise => ({
  id: uid(),
  name,
  notes: '',
  entries: [],
})

// ---------------------------------------------------------------------------
// Migration: tolerate both the new (entries) and legacy (measures) shapes, and
// fill any missing fields. Legacy measures are flattened onto entries, with the
// measure name copied to each entry's `type`.
// ---------------------------------------------------------------------------

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

const normalizeSetRows = (v: unknown): SetRow[] => {
  if (!Array.isArray(v)) return []
  return v.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>
    return { id: str(r.id) || uid(), reps: str(r.reps), load: str(r.load) }
  })
}

const normalizeEntry = (e: Record<string, unknown>, type = ''): ExerciseEntry => ({
  id: str(e.id) || uid(),
  date: str(e.date) || today(),
  type: str(e.type) || type,
  sets: str(e.sets),
  reps: str(e.reps),
  load: str(e.load),
  setRows: normalizeSetRows(e.setRows),
  rpe: str(e.rpe),
  tempo: str(e.tempo),
  notes: str(e.notes),
  status: (e.status === 'partial' ? 'partial' : 'success') as EntryStatus,
})

export function normalizeTrackedExercises(list: unknown): TrackedExercise[] {
  if (!Array.isArray(list)) return []
  return list.map((raw) => {
    const ex = (raw ?? {}) as Record<string, unknown>
    let entries: ExerciseEntry[] = []
    if (Array.isArray(ex.entries)) {
      entries = ex.entries.map((e) => normalizeEntry((e ?? {}) as Record<string, unknown>))
    } else if (Array.isArray(ex.measures)) {
      for (const rawM of ex.measures) {
        const m = (rawM ?? {}) as Record<string, unknown>
        const type = str(m.name)
        const mEntries = Array.isArray(m.entries) ? m.entries : []
        for (const e of mEntries) {
          entries.push(normalizeEntry((e ?? {}) as Record<string, unknown>, type))
        }
      }
    }
    return {
      id: str(ex.id) || uid(),
      name: str(ex.name),
      notes: str(ex.notes),
      entries,
    }
  })
}
