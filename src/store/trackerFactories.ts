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
// Same-day / same-type merging
//
// One measure type on one day = one entry. When a new log (or an edit) lands on
// a date+type that already exists, its sets are folded into the existing entry
// as `setRows` (the same "variable loaded sets" model used for ramping days).
// ---------------------------------------------------------------------------

// Number of sets implied by a uniform entry. Pulls the first integer out of the
// free-text `sets` field; defaults to a single set when absent/unparseable.
const setCount = (sets: string): number => {
  const m = sets.match(/\d+/)
  return Math.max(1, m ? parseInt(m[0], 10) : 1)
}

// Expand any entry into explicit per-set rows (preserving original unit strings).
// Varied entries pass through their rows; uniform entries repeat their flat
// reps/load `setCount` times — mirroring effectiveSets() in metricMath.
export const expandToSetRows = (entry: ExerciseEntry): SetRow[] => {
  if (entry.setRows.length) {
    return entry.setRows.map((r) => newSetRow({ reps: r.reps, load: r.load }))
  }
  return Array.from({ length: setCount(entry.sets) }, () =>
    newSetRow({ reps: entry.reps, load: entry.load }),
  )
}

// Combine two same-day/same-type entries into one. `base` keeps its identity and
// metadata; `extra`'s sets are appended. When every resulting set is identical the
// entry stays uniform (sets/reps/load); otherwise it switches to varied mode so the
// per-set rows drive scoring and display.
export const combineEntries = (base: ExerciseEntry, extra: ExerciseEntry): ExerciseEntry => {
  const rows = [...expandToSetRows(base), ...expandToSetRows(extra)]
  const merged: ExerciseEntry = {
    ...base,
    rpe: base.rpe.trim() || extra.rpe.trim(),
    tempo: base.tempo.trim() || extra.tempo.trim(),
    notes: [base.notes, extra.notes].map((s) => s.trim()).filter(Boolean).join('\n'),
    status: base.status === 'partial' || extra.status === 'partial' ? 'partial' : 'success',
    sets: '',
    reps: '',
    load: '',
    setRows: rows,
  }
  // Collapse to uniform form when all sets share the same reps and load.
  const first = rows[0]
  const allSame = first && rows.every((r) => r.reps === first.reps && r.load === first.load)
  if (allSame) {
    return { ...merged, setRows: [], sets: String(rows.length), reps: first.reps, load: first.load }
  }
  return merged
}

// Collapse a list so that each (date, type) pair appears at most once. The first
// occurrence is kept as the base; later matches are folded in via combineEntries.
// Type matching is case-insensitive; array order (and thus set order) is preserved.
export const mergeSameDayEntries = (entries: ExerciseEntry[]): ExerciseEntry[] => {
  const out: ExerciseEntry[] = []
  const posByKey = new Map<string, number>()
  for (const e of entries) {
    const key = `${e.date}\u0000${e.type.trim().toLowerCase()}`
    const at = posByKey.get(key)
    if (at === undefined) {
      posByKey.set(key, out.length)
      out.push(e)
    } else {
      out[at] = combineEntries(out[at], e)
    }
  }
  return out
}

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
