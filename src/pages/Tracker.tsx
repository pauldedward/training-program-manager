import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store/AppStore'
import { Icon, Field, ConfirmDelete } from '../components/ui'
import { MiniChart } from '../components/MiniChart'
import type { ExerciseEntry, ScoreMode, SetRow, TrackedExercise } from '../lib/trackerTypes'
import { combineEntries, mergeSameDayEntries, newExerciseEntry, newSetRow, newTrackedExercise } from '../store/trackerFactories'
import {
  SCORE_LABELS,
  distinctTypes,
  entryLines,
  groupByType,
  latestEntry,
  maxEntry,
  maxLabel,
  scoreSeries,
  sortedExercises,
} from '../lib/metricMath'

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Exercise names and measure types allow only letters, numbers and spaces.
// Disallowed characters are stripped as the user types; callers trim ends on commit.
function sanitizeLabel(s: string) {
  return s.replace(/[^a-zA-Z0-9 ]/g, '')
}

// Measure types match case-insensitively: reuse an existing type's casing when one
// matches (e.g. logging "1 rm" folds into an existing "1 RM" group).
function canonicalType(type: string, entries: ExerciseEntry[]) {
  const t = type.trim()
  const match = entries.find((e) => e.type.trim().toLowerCase() === t.toLowerCase())
  return match ? match.type.trim() : t
}

const SCORE_MODES: ScoreMode[] = ['load', 'duration', 'rpe', 'volume']

// Time-range filter for the progress chart. days=0 means "all time".
const RANGES: { key: string; label: string; days: number }[] = [
  { key: '4w', label: '4W', days: 28 },
  { key: '12w', label: '12W', days: 84 },
  { key: '6m', label: '6M', days: 182 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'All', days: 0 },
]

// Initial render caps to keep lists compact on mobile (reveal more on demand).
const LOG_LIMIT = 1
const EXERCISE_LIMIT = 15

// ---------------------------------------------------------------------------
// Entry add / edit form
// ---------------------------------------------------------------------------

function EntryForm({
  initial,
  onSave,
  onCancel,
  typeSuggestions,
}: {
  initial: ExerciseEntry
  onSave: (e: ExerciseEntry) => void
  onCancel?: () => void
  typeSuggestions: string[]
}) {
  const [draft, setDraft] = useState<ExerciseEntry>(initial)
  const set = (patch: Partial<ExerciseEntry>) => setDraft((d) => ({ ...d, ...patch }))
  const varied = draft.setRows.length > 0

  // Seed per-set rows from the current uniform fields (expand `sets` count).
  const enableVaried = () => {
    const count = Math.max(2, Math.round(Number(draft.sets)) || 2)
    const rows: SetRow[] = Array.from({ length: count }, () =>
      newSetRow({ reps: draft.reps, load: draft.load }),
    )
    set({ setRows: rows })
  }
  const useUniform = () => set({ setRows: [] })
  const addRow = () =>
    setDraft((d) => {
      const lastRow = d.setRows[d.setRows.length - 1]
      return {
        ...d,
        setRows: [...d.setRows, newSetRow({ reps: lastRow?.reps ?? '', load: lastRow?.load ?? '' })],
      }
    })
  const updateRow = (id: string, patch: Partial<SetRow>) =>
    setDraft((d) => ({
      ...d,
      setRows: d.setRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  const removeRow = (id: string) =>
    setDraft((d) => ({ ...d, setRows: d.setRows.filter((r) => r.id !== id) }))

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="label">Date</span>
          <input
            type="date"
            className="field min-w-0 appearance-none"
            value={draft.date}
            onChange={(e) => set({ date: e.target.value })}
          />
        </label>
        <div className="flex items-end gap-1.5">
          <button
            className={`chip flex-1 justify-center py-2 ${
              draft.status === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-slate-700 text-slate-400'
            }`}
            onClick={() => set({ status: 'success' })}
          >
            Success
          </button>
          <button
            className={`chip flex-1 justify-center py-2 ${
              draft.status === 'partial'
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-slate-700 text-slate-400'
            }`}
            onClick={() => set({ status: 'partial' })}
          >
            Failure
          </button>
        </div>
      </div>

      <div className="mt-2">
        <label className="block">
          <span className="label">
            Type <span className="text-rose-400">*</span>
          </span>
          <input
            className="field"
            value={draft.type}
            onChange={(e) => set({ type: sanitizeLabel(e.target.value) })}
            placeholder="1RM / Volume / Speed"
          />
        </label>
        {(() => {
          const typed = draft.type.trim()
          const q = typed.toLowerCase()
          // Match case-insensitively, but keep showing a suggestion whose casing
          // differs from what was typed (e.g. "1 rm" still surfaces "1 RM").
          const matches = typeSuggestions.filter(
            (t) => t.toLowerCase().includes(q) && t !== typed,
          )
          if (matches.length === 0) return null
          return (
            <div className="-mx-0.5 mt-1.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {matches.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set({ type: t })}
                  className="shrink-0 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300 active:bg-slate-700"
                >
                  {t}
                </button>
              ))}
            </div>
          )
        })()}
        {!draft.type.trim() && (
          <span className="mt-1 block text-xs text-rose-400/80">
            A measure type is required.
          </span>
        )}
      </div>

      {varied ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="label">Sets (per-set load)</span>
            <button className="btn-ghost px-2 py-1 text-xs" onClick={useUniform}>
              Use uniform
            </button>
          </div>
          {draft.setRows.map((r, i) => (
            <div key={r.id} className="flex items-end gap-1.5">
              <span className="label w-6 pb-2 text-center">{i + 1}</span>
              <Field
                label="Reps/Dur"
                value={r.reps}
                onChange={(v) => updateRow(r.id, { reps: v })}
                placeholder="5"
              />
              <Field
                label="Load"
                value={r.load}
                onChange={(v) => updateRow(r.id, { load: v })}
                placeholder="60kg"
              />
              <button
                className="btn-ghost px-2 pb-2 text-rose-300"
                onClick={() => removeRow(r.id)}
                title="Delete set"
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
          <button className="btn-ghost w-full justify-center text-xs" onClick={addRow}>
            <Icon name="plus" /> Add set
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Sets" value={draft.sets} onChange={(v) => set({ sets: v })} placeholder="3" />
            <Field label="Reps/Dur" value={draft.reps} onChange={(v) => set({ reps: v })} placeholder="12 / 30s" />
            <Field label="Load" value={draft.load} onChange={(v) => set({ load: v })} placeholder="40kg" />
          </div>
          <button className="btn-ghost mt-1.5 px-0 py-1 text-xs text-brand-300" onClick={enableVaried}>
            Vary load per set
          </button>
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Field label="RPE/RIR" value={draft.rpe} onChange={(v) => set({ rpe: v })} placeholder="8" />
        <Field label="Tempo" value={draft.tempo} onChange={(v) => set({ tempo: v })} placeholder="3010" />
      </div>

      <div className="mt-2">
        <Field
          label="Notes"
          value={draft.notes}
          onChange={(v) => set({ notes: v })}
          placeholder="Felt strong, last rep grindy…"
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {onCancel && (
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!draft.type.trim()}
          onClick={() => onSave({ ...draft, type: draft.type.trim() })}
        >
          <Icon name="check" /> Save
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Entry row (one dated log)
// ---------------------------------------------------------------------------

function EntryRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: ExerciseEntry
  onEdit: () => void
  onDelete: () => void
}) {
  const lines = entryLines(entry)
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            entry.status === 'success' ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        />
        <span className="text-sm font-semibold text-slate-200">{formatDate(entry.date)}</span>
        <div className="ml-auto flex items-center">
          <button className="btn-ghost px-2" onClick={onEdit} title="Edit">
            <Icon name="edit" />
          </button>
          <ConfirmDelete onConfirm={onDelete} label="Delete entry" />
        </div>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {lines.map((l) => (
          <Fragment key={l.label}>
            <dt className="text-slate-500">{l.label}</dt>
            <dd className="font-medium text-slate-100">{l.value}</dd>
          </Fragment>
        ))}
      </dl>
      {entry.notes.trim() && (
        <p className="mt-2 border-t border-slate-800 pt-2 text-xs text-slate-400">{entry.notes}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Exercise detail
// ---------------------------------------------------------------------------

function ExerciseDetail({
  exercise,
  onBack,
  mutate,
  onDelete,
}: {
  exercise: TrackedExercise
  onBack: () => void
  mutate: (fn: (ex: TrackedExercise) => TrackedExercise) => void
  onDelete: () => void
}) {
  const [adding, setAdding] = useState<ExerciseEntry | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showGraph, setShowGraph] = useState(false)
  const [dim, setDim] = useState<ScoreMode>('load')
  const [range, setRange] = useState('all')
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState<Record<string, boolean>>({})
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [editingType, setEditingType] = useState<string | null>(null)
  const [typeDraft, setTypeDraft] = useState('')
  const formRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<HTMLDivElement | null>(null)

  const entries = exercise.entries
  const groups = useMemo(() => groupByType(entries), [entries])
  const allTypes = useMemo(() => groups.map((g) => g.type), [groups])
  const suggestions = useMemo(() => distinctTypes(entries), [entries])
  const last = useMemo(() => latestEntry(entries), [entries])

  const includedEntries = useMemo(
    () => entries.filter((e) => !excluded.has(e.type.trim())),
    [entries, excluded],
  )
  const points = useMemo(() => scoreSeries(includedEntries, dim), [includedEntries, dim])
  const rangedPoints = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? 0
    if (!days) return points
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const min = cutoff.toISOString().slice(0, 10)
    return points.filter((p) => p.date >= min)
  }, [points, range])

  const addEntry = (e: ExerciseEntry) =>
    mutate((ex) => {
      const incoming: ExerciseEntry = { ...e, type: canonicalType(e.type, ex.entries) }
      const key = incoming.type.trim().toLowerCase()
      const existing = ex.entries.find(
        (x) => x.date === incoming.date && x.type.trim().toLowerCase() === key,
      )
      // Same day + same measure type folds the new sets into the existing entry.
      if (existing) {
        return {
          ...ex,
          entries: ex.entries.map((x) =>
            x.id === existing.id ? combineEntries(x, incoming) : x,
          ),
        }
      }
      return { ...ex, entries: [incoming, ...ex.entries] }
    })
  const updateEntry = (e: ExerciseEntry) =>
    mutate((ex) => ({
      ...ex,
      // Re-run the same-day/same-type merge so an edit that now collides with
      // another entry consolidates instead of leaving two on the same day.
      entries: mergeSameDayEntries(
        ex.entries.map((x) =>
          x.id === e.id
            ? { ...e, type: canonicalType(e.type, ex.entries.filter((o) => o.id !== e.id)) }
            : x,
        ),
      ),
    }))
  const deleteEntry = (id: string) =>
    mutate((ex) => ({ ...ex, entries: ex.entries.filter((x) => x.id !== id) }))

  // Seed a new log from the most recent entry of the same type (or overall).
  const startAdd = (type?: string) => {
    setEditingId(null)
    const source =
      type !== undefined ? (groups.find((g) => g.type === type)?.entries[0] ?? null) : last
    setAdding(
      newExerciseEntry({
        type: type ?? source?.type ?? '',
        sets: source?.sets ?? '',
        reps: source?.reps ?? '',
        load: source?.load ?? '',
        rpe: source?.rpe ?? '',
        tempo: source?.tempo ?? '',
        notes: source?.notes ?? '',
        status: source?.status ?? 'success',
        setRows: (source?.setRows ?? []).map((r) => newSetRow({ reps: r.reps, load: r.load })),
      }),
    )
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  const toggleType = (t: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })

  const allOn = allTypes.every((t) => !excluded.has(t))
  const toggleAllTypes = () =>
    setExcluded(allOn ? new Set(allTypes) : new Set())

  // Open the graph showing only the given type, then scroll up to it.
  const showGraphForType = (type: string) => {
    setExcluded(new Set(allTypes.filter((t) => t !== type)))
    setShowGraph(true)
    requestAnimationFrame(() =>
      graphRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  const startEditName = () => {
    setNameDraft(exercise.name)
    setEditingName(true)
  }
  const saveName = () => {
    mutate((ex) => ({ ...ex, name: nameDraft.trim() }))
    setEditingName(false)
  }

  const startEditType = (type: string) => {
    setEditingType(type)
    setTypeDraft(type)
  }
  const saveType = () => {
    const from = editingType ?? ''
    const to = typeDraft.trim()
    if (to && to !== from) {
      mutate((ex) => ({
        ...ex,
        entries: ex.entries.map((e) => (e.type.trim() === from ? { ...e, type: to } : e)),
      }))
    }
    setEditingType(null)
  }

  const deleteType = (type: string) =>
    mutate((ex) => ({
      ...ex,
      entries: ex.entries.filter((e) => e.type.trim() !== type),
    }))

  return (
    <div className="space-y-3">
      <div className="sticky top-[calc(env(safe-area-inset-top)+3rem)] z-10 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/95 shadow-lg shadow-slate-950/40">
        <div className="flex items-center gap-2 px-3 py-3">
          <button className="btn-ghost shrink-0 px-2" onClick={onBack} title="Back">
            <Icon name="back" />
          </button>
          {editingName ? (
            <input
              className="field min-w-0 flex-1 text-lg font-bold"
              value={nameDraft}
              placeholder="Exercise name"
              autoFocus
              onChange={(e) => setNameDraft(sanitizeLabel(e.target.value))}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
            />
          ) : (
            <h2 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-slate-100">
              {exercise.name || 'Untitled exercise'}
            </h2>
          )}
          <button
            className="btn-ghost shrink-0 px-2"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => (editingName ? saveName() : startEditName())}
            title={editingName ? 'Save name' : 'Edit name'}
          >
            <Icon name={editingName ? 'check' : 'edit'} />
          </button>
          <ConfirmDelete onConfirm={onDelete} label="Delete exercise" />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 bg-slate-950/30 px-3 py-2">
          {!adding && (
            <button className="btn-primary" onClick={() => startAdd()}>
              <Icon name="plus" /> Log entry
            </button>
          )}
          {entries.length > 0 && !(adding && showGraph) && (
            <button className="btn-ghost" onClick={() => setShowGraph((v) => !v)}>
              <Icon name="chart" /> {showGraph ? 'Hide graph' : 'View graph'}
            </button>
          )}
          <span className="ml-auto text-xs text-slate-500">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      <div ref={formRef} className="scroll-mt-3">
        {adding && !editingId && (
          <EntryForm
            key={adding.id}
            initial={adding}
            typeSuggestions={suggestions}
            onSave={(e) => {
              addEntry(e)
              setAdding(null)
            }}
            onCancel={() => setAdding(null)}
          />
        )}
      </div>

      {adding && showGraph && entries.length > 0 && (
        <div className="flex">
          <button className="btn-ghost" onClick={() => setShowGraph(false)}>
            <Icon name="chart" /> Hide graph
          </button>
        </div>
      )}

      {showGraph && entries.length > 0 && (
        <div ref={graphRef} className="scroll-mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30">
          <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-800/40 px-3 py-2">
            <Icon name="chart" className="h-4 w-4 text-brand-400" />
            <h3 className="text-sm font-bold tracking-tight text-slate-100">Progress</h3>
          </div>
          <div className="space-y-2 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-xs text-slate-500">Metric:</span>
              {SCORE_MODES.map((m) => (
                <button
                  key={m}
                  className={`chip ${
                    dim === m
                      ? 'border-brand-500/50 bg-brand-600/20 text-brand-200'
                      : 'border-slate-700 text-slate-400'
                  }`}
                  onClick={() => setDim(m)}
                >
                  {SCORE_LABELS[m]}
                </button>
              ))}
            </div>
            {allTypes.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-xs text-slate-500">Types:</span>
                <button
                  className="chip border-slate-600 text-slate-300"
                  onClick={toggleAllTypes}
                >
                  {allOn ? 'Deselect all' : 'Select all'}
                </button>
                {allTypes.map((t) => {
                  const on = !excluded.has(t)
                  return (
                    <button
                      key={t || '__general'}
                      title={t || 'Untagged'}
                      className={`chip inline-block max-w-[8rem] truncate align-middle ${
                        on
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-700 text-slate-500 line-through'
                      }`}
                      onClick={() => toggleType(t)}
                    >
                      {t || 'Untagged'}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-xs text-slate-500">Range:</span>
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  className={`chip ${
                    range === r.key
                      ? 'border-brand-500/50 bg-brand-600/20 text-brand-200'
                      : 'border-slate-700 text-slate-400'
                  }`}
                  onClick={() => setRange(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <MiniChart points={rangedPoints} />
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-slate-500">
          No entries yet. Log one and tag it — e.g. “1RM”, “Volume”, or “Speed”.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const best = maxEntry(g.entries)
            const open = !!showAll[g.type]
            const visible = open ? g.entries : g.entries.slice(0, LOG_LIMIT)
            return (
              <div
                key={g.type || '__general'}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30"
              >
                <div className="border-b border-slate-800 bg-slate-800/40 px-3 py-2">
                  <div className="flex items-stretch gap-2">
                    <span className="w-1.5 shrink-0 rounded-full bg-brand-500" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        {editingType === g.type && g.type ? (
                          <input
                            className="field min-w-0 flex-1 font-bold"
                            value={typeDraft}
                            autoFocus
                            onChange={(e) => setTypeDraft(sanitizeLabel(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveType()
                              if (e.key === 'Escape') setEditingType(null)
                            }}
                          />
                        ) : g.entries.length > LOG_LIMIT ? (
                          <button
                            className="group flex min-w-0 flex-1 items-center gap-1.5 text-left"
                            onClick={() => setShowAll((s) => ({ ...s, [g.type]: !s[g.type] }))}
                            title={open ? 'Collapse' : 'Expand'}
                          >
                            <Icon
                              name="chevron"
                              className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform group-hover:text-slate-300 ${
                                open ? 'rotate-90' : ''
                              }`}
                            />
                            <span className="min-w-0 truncate text-base font-bold tracking-tight text-slate-100">
                              {g.type || 'Untagged'}
                            </span>
                          </button>
                        ) : (
                          <h3 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight text-slate-100">
                            {g.type || 'Untagged'}
                          </h3>
                        )}
                        {editingType === g.type && g.type && (
                          <button
                            className="btn-ghost shrink-0 px-2 py-1 text-xs text-emerald-300"
                            onClick={saveType}
                            title="Save measure name"
                          >
                            <Icon name="check" />
                          </button>
                        )}
                        <div className="ml-auto flex shrink-0 items-center gap-1 text-slate-400">
                          {g.type && editingType !== g.type && (
                            <button
                              className="btn-ghost px-1.5 py-1"
                              onClick={() => startEditType(g.type)}
                              title="Edit measure name"
                            >
                              <Icon name="edit" />
                            </button>
                          )}
                          <button
                            className="btn-ghost px-1.5 py-1"
                            onClick={() => showGraphForType(g.type)}
                            title="View graph for this measure"
                          >
                            <Icon name="chart" />
                          </button>
                          {g.type && (
                            <ConfirmDelete
                              onConfirm={() => deleteType(g.type)}
                              label="Delete measure"
                              className="btn-ghost px-1.5 py-1 text-rose-300 hover:bg-rose-500/10"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        {best && (
                          <span className="inline-flex min-w-0 items-start gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs">
                            <span className="shrink-0 text-emerald-400/70">Max</span>
                            <span className="min-w-0 break-words font-semibold text-emerald-100">
                              {maxLabel(best)}
                            </span>
                          </span>
                        )}
                        <button
                          className="btn-primary ml-auto shrink-0 px-2.5 py-1 text-xs"
                          onClick={() => startAdd(g.type)}
                        >
                          <Icon name="plus" /> Log
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 p-2.5">
                  <div className={open ? 'max-h-[60vh] space-y-2 overflow-y-auto overscroll-contain pr-0.5' : 'space-y-2'}>
                    {visible.map((e) =>
                      editingId === e.id ? (
                        <EntryForm
                          key={e.id}
                          initial={e}
                          typeSuggestions={suggestions}
                          onSave={(updated) => {
                            updateEntry(updated)
                            setEditingId(null)
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <EntryRow
                          key={e.id}
                          entry={e}
                          onEdit={() => {
                            setAdding(null)
                            setEditingId(e.id)
                          }}
                          onDelete={() => deleteEntry(e.id)}
                        />
                      ),
                    )}
                  </div>
                  {g.entries.length > LOG_LIMIT && (
                    <button
                      className="btn-ghost w-full justify-center"
                      onClick={() => setShowAll((s) => ({ ...s, [g.type]: !s[g.type] }))}
                    >
                      {open ? 'Show less' : `Show all ${g.entries.length} entries`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Exercise list / search
// ---------------------------------------------------------------------------

function ExerciseRow({ ex, onOpen }: { ex: TrackedExercise; onOpen: () => void }) {
  const last = latestEntry(ex.entries)
  const types = distinctTypes(ex.entries)
  const count = ex.entries.length

  return (
    <button
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-left transition-colors hover:border-slate-700 hover:bg-slate-900/70"
      onClick={onOpen}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold tracking-tight text-slate-100">
          {ex.name || 'Untitled exercise'}
        </div>
        <div className="truncate text-xs text-slate-400">
          {last ? `Last ${formatDate(last.date)}` : 'No entries'}
          {count > 0 && ` · ${count} log${count > 1 ? 's' : ''}`}
        </div>
        {types.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {types.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex max-w-[9rem] items-center gap-1.5 rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300"
                title={t}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <span className="truncate">{t}</span>
              </span>
            ))}
            {types.length > 3 && (
              <span className="text-[11px] font-medium text-slate-500">
                +{types.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
      <Icon
        name="chevron"
        className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-slate-300"
      />
    </button>
  )
}

export default function Tracker() {
  const { data, setTrackedExercises, loading } = useAppStore()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const exercises = data.trackedExercises
  const selected = exercises.find((e) => e.id === selectedId) ?? null

  const [visibleCount, setVisibleCount] = useState(EXERCISE_LIMIT)
  // Reset the reveal count whenever the search changes.
  useEffect(() => setVisibleCount(EXERCISE_LIMIT), [query])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = sortedExercises(exercises)
    if (!q) return list
    return list.filter((e) => e.name.toLowerCase().includes(q))
  }, [exercises, query])

  const exactMatch = useMemo(
    () => exercises.some((e) => e.name.trim().toLowerCase() === query.trim().toLowerCase()),
    [exercises, query],
  )

  const mutateExercise = (id: string, fn: (ex: TrackedExercise) => TrackedExercise) =>
    setTrackedExercises((prev) => prev.map((ex) => (ex.id === id ? fn(ex) : ex)))

  const createExercise = (name: string) => {
    const ex = newTrackedExercise(sanitizeLabel(name).trim())
    setTrackedExercises((prev) => [ex, ...prev])
    setQuery('')
    setSelectedId(ex.id)
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
  }

  if (selected) {
    return (
      <ExerciseDetail
        exercise={selected}
        onBack={() => setSelectedId(null)}
        mutate={(fn) => mutateExercise(selected.id, fn)}
        onDelete={() => {
          setTrackedExercises((prev) => prev.filter((e) => e.id !== selected.id))
          setSelectedId(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-[calc(env(safe-area-inset-top)+3rem)] z-10 -mx-4 border-b border-slate-800/60 bg-slate-950/95 px-4 py-2.5">
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          />
          <input
            className="field pl-9"
            value={query}
            placeholder="Search or add an exercise…"
            onChange={(e) => setQuery(sanitizeLabel(e.target.value))}
          />
        </div>
      </div>

      {query.trim() && !exactMatch && (
        <button className="btn-primary w-full" onClick={() => createExercise(query)}>
          <Icon name="plus" /> Create “{query.trim()}”
        </button>
      )}

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          {query.trim() ? 'No matches.' : 'No exercises yet. Type a name above to start.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, visibleCount).map((ex) => (
            <ExerciseRow key={ex.id} ex={ex} onOpen={() => setSelectedId(ex.id)} />
          ))}
          {filtered.length > visibleCount && (
            <button
              className="btn-ghost w-full justify-center"
              onClick={() => setVisibleCount((n) => n + EXERCISE_LIMIT)}
            >
              Show more ({filtered.length - visibleCount} more)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
