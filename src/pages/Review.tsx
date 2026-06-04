import { useMemo } from 'react'
import { useAppStore } from '../store/AppStore'
import type { WorkoutLog } from '../lib/types'
import { Icon } from '../components/ui'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// Pull out only the parts of a session worth reviewing: short sets and comments.
function reviewItems(log: WorkoutLog) {
  return log.exercises
    .map((ex) => {
      const issues = ex.sets.filter((s) => s.status === 'missed' || s.comment.trim())
      return { name: ex.name || 'Exercise', issues }
    })
    .filter((e) => e.issues.length > 0)
}

function LogCard({ log }: { log: WorkoutLog }) {
  const items = reviewItems(log)
  const shortCount = log.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.status === 'missed').length,
    0,
  )
  const doneCount = log.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.status === 'done').length,
    0,
  )

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{log.workoutName}</div>
          <div className="text-xs text-slate-400">
            {formatDate(log.completedAt ?? log.date)} · {doneCount} done
          </div>
        </div>
        {shortCount > 0 ? (
          <span className="chip border-rose-500/30 text-rose-300">{shortCount} short</span>
        ) : (
          <span className="chip border-emerald-500/30 text-emerald-300">Clean</span>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map((ex, ei) => (
            <div key={ei} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="text-sm font-medium">{ex.name}</div>
              <div className="mt-1.5 space-y-1.5">
                {ex.issues.map((s, si) => (
                  <div key={si} className="text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-slate-800 text-xs font-semibold text-slate-300">
                        {s.setNumber}
                      </span>
                      {s.status === 'missed' && (
                        <span className="chip border-rose-500/30 text-rose-300">
                          {s.actualReps || '0'}/{s.targetReps || '—'} reps
                        </span>
                      )}
                      {s.status === 'done' && s.comment.trim() && (
                        <span className="chip border-slate-700 text-slate-400">
                          {s.actualReps || s.targetReps || '—'} reps
                        </span>
                      )}
                      {s.actualLoad.trim() && (
                        <span className="chip border-slate-700 text-slate-400">{s.actualLoad}</span>
                      )}
                    </div>
                    {s.comment.trim() && (
                      <p className="mt-1 text-slate-300">“{s.comment.trim()}”</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Review() {
  const { data, loading } = useAppStore()

  const history = useMemo(
    () =>
      data.logs
        .filter((l) => l.completedAt !== null)
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [data.logs],
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Review</h1>
        {history.length > 0 && (
          <p className="text-sm text-slate-400">{history.length} completed workouts</p>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : history.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-8 text-center text-slate-400">
          <Icon name="history" className="h-6 w-6" />
          No completed workouts yet. Finish a session on the Run tab.
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}
