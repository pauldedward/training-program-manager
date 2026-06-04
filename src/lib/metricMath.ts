import type { ExerciseEntry, ScoreMode, TrackedExercise } from './trackerTypes'

// Pull the first number out of a free-text field. "40kg" -> 40, "30s" -> 30, "" -> NaN.
export const num = (s: string): number => {
  const m = s.match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : NaN
}

const has = (n: number) => Number.isFinite(n)

// Numeric per-set breakdown of a day. Uses `setRows` when present; otherwise
// expands the flat sets/reps/load into `count` identical sets.
export interface NumSet {
  reps: number
  load: number
}

export function effectiveSets(entry: ExerciseEntry): NumSet[] {
  if (entry.setRows.length) {
    return entry.setRows.map((r) => ({ reps: num(r.reps), load: num(r.load) }))
  }
  const count = has(num(entry.sets)) ? Math.max(1, Math.round(num(entry.sets))) : 1
  const reps = num(entry.reps)
  const load = num(entry.load)
  return Array.from({ length: count }, () => ({ reps, load }))
}

// The heaviest set of the day (by load; falls back to most reps). Null if empty.
export function entryTopSet(entry: ExerciseEntry): NumSet | null {
  const sets = effectiveSets(entry)
  if (!sets.length) return null
  const withLoad = sets.filter((s) => has(s.load))
  if (withLoad.length) return withLoad.reduce((b, s) => (s.load > b.load ? s : b))
  const withReps = sets.filter((s) => has(s.reps))
  if (withReps.length) return withReps.reduce((b, s) => (s.reps > b.reps ? s : b))
  return null
}

// Compute the Y value for one entry under a given mode. Returns NaN when not plottable.
export function scoreEntry(entry: ExerciseEntry, mode: ScoreMode): number {
  const rpe = num(entry.rpe)
  const sets = effectiveSets(entry)
  switch (mode) {
    case 'load': {
      const top = entryTopSet(entry)
      return top ? top.load : NaN
    }
    case 'duration': {
      const reps = sets.map((s) => s.reps).filter(has)
      return reps.length ? Math.max(...reps) : NaN
    }
    case 'rpe':
      return rpe
    case 'volume': {
      let v = 0
      let counted = 0
      for (const s of sets) {
        const r = has(s.reps) ? s.reps : 1
        const l = has(s.load) ? s.load : 1
        if (r === 1 && l === 1) continue
        v += r * l
        counted++
      }
      return counted ? v : NaN
    }
  }
}

export const SCORE_LABELS: Record<ScoreMode, string> = {
  load: 'Load',
  duration: 'Reps / Duration',
  rpe: 'RPE',
  volume: 'Volume',
}

export interface ScorePoint {
  date: string
  value: number
  entry: ExerciseEntry
}

// Plottable points sorted oldest -> newest for the given mode.
export function scoreSeries(entries: ExerciseEntry[], mode: ScoreMode): ScorePoint[] {
  return entries
    .map((entry) => ({ date: entry.date, value: scoreEntry(entry, mode), entry }))
    .filter((p) => has(p.value))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// "Max" = entry whose heaviest set has the highest load; if none have a load,
// the one with the most reps/duration.
export function maxEntry(entries: ExerciseEntry[]): ExerciseEntry | null {
  if (!entries.length) return null
  const scored = entries
    .map((e) => ({ e, top: entryTopSet(e) }))
    .filter((x): x is { e: ExerciseEntry; top: NumSet } => !!x.top)
  if (!scored.length) return null
  const withLoad = scored.filter((x) => has(x.top.load))
  if (withLoad.length) {
    return withLoad.reduce((best, x) => (x.top.load > best.top.load ? x : best)).e
  }
  return scored.reduce((best, x) => (x.top.reps > best.top.reps ? x : best)).e
}

// Original-string reps/load of the heaviest set (for labels that keep units).
function topSetStrings(entry: ExerciseEntry): { reps: string; load: string } {
  if (entry.setRows.length) {
    const rows = entry.setRows
    const withLoad = rows.filter((r) => has(num(r.load)))
    const pick = withLoad.length
      ? withLoad.reduce((b, r) => (num(r.load) > num(b.load) ? r : b))
      : rows.reduce((b, r) => (num(r.reps) > num(b.reps) ? r : b))
    return { reps: pick.reps, load: pick.load }
  }
  return { reps: entry.reps, load: entry.load }
}

// Format one scheme as "load - sets × reps @ rpe", omitting any missing piece.
// Examples: "100kg - 3 × 5 @ 8", "100kg - 5", "3 × 12", "@ 8".
function formatScheme(p: { load?: string; sets?: string; reps?: string; rpe?: string }): string {
  const load = (p.load ?? '').trim()
  const sets = (p.sets ?? '').trim()
  const reps = (p.reps ?? '').trim()
  const rpe = (p.rpe ?? '').trim()
  const setsReps = [sets, reps].filter(Boolean).join(' × ')
  let base = [load, setsReps].filter(Boolean).join(' - ')
  if (rpe) base = base ? `${base} @ ${rpe}` : `@ ${rpe}`
  return base || '—'
}

// Tag text for a max entry: "load : sets × reps @ rpe : tempo".
// Each piece is omitted when empty (same rule as formatScheme).
function formatMax(p: {
  load?: string
  sets?: string
  reps?: string
  rpe?: string
  tempo?: string
}): string {
  const load = (p.load ?? '').trim()
  const sets = (p.sets ?? '').trim()
  const reps = (p.reps ?? '').trim()
  const rpe = (p.rpe ?? '').trim()
  const tempo = (p.tempo ?? '').trim()
  const setsReps = [sets, reps].filter(Boolean).join(' × ')
  let base = [load, setsReps].filter(Boolean).join(' : ')
  if (rpe) base = base ? `${base} @ ${rpe}` : `@ ${rpe}`
  if (tempo) base = base ? `${base} : ${tempo}` : tempo
  return base || '—'
}

// Tag text for a max entry: the heaviest set, formatted like an entry.
export function maxLabel(entry: ExerciseEntry): string {
  if (entry.setRows.length) {
    const { reps, load } = topSetStrings(entry)
    return formatMax({ load, reps, rpe: entry.rpe, tempo: entry.tempo })
  }
  return formatMax({
    load: entry.load,
    sets: entry.sets,
    reps: entry.reps,
    rpe: entry.rpe,
    tempo: entry.tempo,
  })
}

// Sort helpers: newest activity first.
const lastDate = (entries: ExerciseEntry[]): string =>
  entries.reduce((max, e) => (e.date > max ? e.date : max), '')

export const exerciseLastDate = (ex: TrackedExercise): string => lastDate(ex.entries)

export const latestEntry = (entries: ExerciseEntry[]): ExerciseEntry | null =>
  entries.length ? entries.reduce((best, e) => (e.date > best.date ? e : best)) : null

export const sortedExercises = (list: TrackedExercise[]): TrackedExercise[] =>
  [...list].sort((a, b) => exerciseLastDate(b).localeCompare(exerciseLastDate(a)))

export const sortedEntries = (entries: ExerciseEntry[]): ExerciseEntry[] =>
  [...entries].sort((a, b) => b.date.localeCompare(a.date))

export interface TypeGroup {
  type: string // '' means untagged
  entries: ExerciseEntry[] // sorted newest -> oldest
}

// Group entries by their `type` tag. Groups ordered by most recent activity.
export function groupByType(entries: ExerciseEntry[]): TypeGroup[] {
  const map = new Map<string, ExerciseEntry[]>()
  for (const e of entries) {
    const t = e.type.trim()
    const bucket = map.get(t)
    if (bucket) bucket.push(e)
    else map.set(t, [e])
  }
  const groups: TypeGroup[] = [...map.entries()].map(([type, es]) => ({
    type,
    entries: [...es].sort((a, b) => b.date.localeCompare(a.date)),
  }))
  groups.sort((a, b) => (b.entries[0]?.date ?? '').localeCompare(a.entries[0]?.date ?? ''))
  return groups
}

// Distinct non-empty type tags used by an exercise (most-recent first).
export const distinctTypes = (entries: ExerciseEntry[]): string[] =>
  groupByType(entries)
    .map((g) => g.type)
    .filter((t) => t !== '')

// Compact one-line summary of an entry: "100kg - 3 × 12 @ 8" or, for varied
// days, a per-set list like "60 - 5, 80 - 3, 100 - 1". Missing parts omitted.
export function entrySummary(e: ExerciseEntry): string {
  if (e.setRows.length) {
    const parts = e.setRows.map((r) => formatScheme({ load: r.load, reps: r.reps }))
    return parts.join(', ') || '—'
  }
  return formatScheme({ load: e.load, sets: e.sets, reps: e.reps, rpe: e.rpe })
}

// Labeled field rows of an entry for line-by-line display. Blank fields are
// omitted. Varied days emit one row per set ("Set 1": "60 - 5").
export type EntryLine = { label: string; value: string }
export function entryLines(e: ExerciseEntry): EntryLine[] {
  const lines: EntryLine[] = []
  const push = (label: string, value: string) => {
    if (value.trim()) lines.push({ label, value: value.trim() })
  }
  if (e.setRows.length) {
    push('Sets', String(e.setRows.length))
    e.setRows.forEach((r, i) => push(`Set ${i + 1}`, formatScheme({ load: r.load, reps: r.reps })))
  } else {
    push('Load', e.load)
    push('Sets', e.sets)
    push('Reps/Dur', e.reps)
  }
  push('RPE/RIR', e.rpe)
  push('Tempo', e.tempo)
  return lines
}

