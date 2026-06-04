import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store/AppStore'
import type {
  Exercise,
  Macrocycle,
  SetStatus,
  Workout,
  WorkoutLog,
} from '../lib/types'
import { uid } from '../lib/id'
import { Icon } from '../components/ui'

interface SeqWorkout {
  workout: Workout
  seq: number // 1-based global order through the program
  macroName: string
  mesoName: string
  microLabel: string
  groupKey: string // identifies the microcycle this workout belongs to
  groupTitle: string // e.g. "Hypertrophy · Week 1"
}

function flattenWorkouts(macros: Macrocycle[]): SeqWorkout[] {
  const out: SeqWorkout[] = []
  let seq = 0
  for (const macro of macros) {
    for (const meso of macro.mesocycles) {
      for (const micro of meso.microcycles) {
        for (const workout of micro.workouts) {
          seq += 1
          out.push({
            workout,
            seq,
            macroName: macro.name,
            mesoName: meso.name,
            microLabel: micro.label,
            groupKey: `${macro.id}/${meso.id}/${micro.id}`,
            groupTitle: `${meso.name} · ${micro.label}`,
          })
        }
      }
    }
  }
  return out
}

function parseSetCount(sets: string): number {
  const n = parseInt(sets, 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 20) : 1
}

function buildLog(workout: Workout): WorkoutLog {
  return {
    id: uid(),
    workoutId: workout.id,
    workoutName: workout.dayLabel || workout.name || 'Workout',
    date: new Date().toISOString(),
    completedAt: null,
    exercises: workout.exercises.map((ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      sets: Array.from({ length: parseSetCount(ex.sets) }, (_, i) => ({
        setNumber: i + 1,
        targetReps: ex.reps,
        actualReps: '',
        actualLoad: '',
        status: 'pending' as SetStatus,
        comment: '',
      })),
    })),
  }
}

// ---------------- Rest timer ----------------

function RestTimer({ rest }: { rest: string }) {
  const seconds = useMemo(() => {
    const m = rest.match(/(\d+)\s*m/i)
    const s = rest.match(/(\d+)\s*s/i)
    if (m || s) return (m ? parseInt(m[1]) * 60 : 0) + (s ? parseInt(s[1]) : 0)
    const n = parseInt(rest, 10)
    return Number.isFinite(n) ? n : 0
  }, [rest])

  const [left, setLeft] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  if (!seconds) return <span className="chip border-slate-700 text-slate-400">Rest {rest || '—'}</span>

  const start = () => {
    if (timer.current) clearInterval(timer.current)
    setLeft(seconds)
    timer.current = setInterval(() => {
      setLeft((v) => {
        if (v === null) return null
        if (v <= 1) {
          if (timer.current) clearInterval(timer.current)
          return 0
        }
        return v - 1
      })
    }, 1000)
  }

  return (
    <button
      onClick={start}
      className={`chip border-slate-700 ${left === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300'}`}
    >
      <Icon name="clock" className="mr-1 h-3.5 w-3.5" />
      {left === null ? `Rest ${rest}` : left === 0 ? 'Rest done' : `${left}s`}
    </button>
  )
}

// ---------------- Set row ----------------

function SetRow({
  setNumber,
  targetReps,
  actualReps,
  actualLoad,
  status,
  comment,
  onChange,
}: {
  setNumber: number
  targetReps: string
  actualReps: string
  actualLoad: string
  status: SetStatus
  comment: string
  onChange: (patch: Partial<{ actualReps: string; actualLoad: string; status: SetStatus; comment: string }>) => void
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-300">
          {setNumber}
        </span>
        <span className="text-sm text-slate-400">Target {targetReps || '—'}</span>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={() => onChange({ status: status === 'done' ? 'pending' : 'done' })}
            className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
              status === 'done'
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="Done"
          >
            <Icon name="check" />
          </button>
          <button
            onClick={() => onChange({ status: status === 'missed' ? 'pending' : 'missed' })}
            className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
              status === 'missed'
                ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="Missed / short"
          >
            <Icon name="x" />
          </button>
        </div>
      </div>

      {status !== 'pending' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            className="field"
            inputMode="numeric"
            placeholder="Reps done"
            value={actualReps}
            onChange={(e) => onChange({ actualReps: e.target.value })}
          />
          <input
            className="field"
            placeholder="Load used"
            value={actualLoad}
            onChange={(e) => onChange({ actualLoad: e.target.value })}
          />
        </div>
      )}

      {status === 'missed' && (
        <input
          className="field mt-2"
          placeholder="What fell short? (comment)"
          value={comment}
          onChange={(e) => onChange({ comment: e.target.value })}
        />
      )}
    </div>
  )
}

// ---------------- Runner ----------------

function Runner({ logId, onExit }: { logId: string; onExit: () => void }) {
  const { data, setLogs } = useAppStore()
  const log = data.logs.find((l) => l.id === logId)
  const [index, setIndex] = useState(0)

  // Live planned exercise (for cues) looked up from the program.
  const plannedById = useMemo(() => {
    const map = new Map<string, Exercise>()
    for (const macro of data.macrocycles)
      for (const meso of macro.mesocycles)
        for (const micro of meso.microcycles)
          for (const w of micro.workouts)
            for (const ex of w.exercises) map.set(ex.id, ex)
    return map
  }, [data.macrocycles])

  if (!log) {
    return (
      <div className="card p-6 text-center text-slate-400">
        Workout not found.
        <div className="mt-3">
          <button className="btn-primary" onClick={onExit}>Back</button>
        </div>
      </div>
    )
  }

  const total = log.exercises.length
  const current = log.exercises[Math.min(index, Math.max(0, total - 1))]
  const planned = current ? plannedById.get(current.exerciseId) : undefined

  const resolvedCount = log.exercises.filter((e) => e.sets.every((s) => s.status !== 'pending')).length
  const progress = total ? Math.round((resolvedCount / total) * 100) : 0

  const updateSet = (setIdx: number, patch: Partial<{ actualReps: string; actualLoad: string; status: SetStatus; comment: string }>) => {
    setLogs((prev) =>
      prev.map((l) =>
        l.id !== log.id
          ? l
          : {
              ...l,
              exercises: l.exercises.map((e, ei) =>
                ei !== index ? e : { ...e, sets: e.sets.map((s, si) => (si === setIdx ? { ...s, ...patch } : s)) },
              ),
            },
      ),
    )
  }

  const finish = () => {
    setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, completedAt: new Date().toISOString() } : l)))
    onExit()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn-ghost px-2" onClick={onExit} title="Back">
          <Icon name="back" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{log.workoutName}</h1>
          <p className="text-xs text-slate-400">
            Exercise {Math.min(index + 1, total)} of {total} · {resolvedCount} done
          </p>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {!current ? (
        <div className="card p-6 text-center text-slate-400">This workout has no exercises.</div>
      ) : (
        <div className="card space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">{current.name || 'Exercise'}</h2>
              {planned && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-300">
                  {planned.sets && <span className="chip border-slate-700">{planned.sets} sets</span>}
                  {planned.reps && <span className="chip border-slate-700">{planned.reps} reps</span>}
                  {planned.load && <span className="chip border-brand-500/30 bg-brand-500/10 text-brand-300">{planned.load}</span>}
                  {planned.tempo && <span className="chip border-slate-700">tempo {planned.tempo}</span>}
                </div>
              )}
            </div>
            <RestTimer rest={planned?.rest ?? ''} />
          </div>

          {planned?.instructions && (
            <p className="rounded-lg bg-slate-800/50 p-3 text-sm text-slate-300">{planned.instructions}</p>
          )}

          <div className="space-y-2">
            {current.sets.map((s, si) => (
              <SetRow
                key={si}
                {...s}
                targetReps={planned?.reps ?? s.targetReps}
                onChange={(patch) => updateSet(si, patch)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button className="btn-ghost flex-1 border border-slate-700" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          Prev
        </button>
        {index < total - 1 ? (
          <button className="btn-primary flex-1" onClick={() => setIndex((i) => i + 1)}>
            Next <Icon name="chevron" />
          </button>
        ) : (
          <button className="btn-primary flex-1" onClick={finish}>
            <Icon name="check" /> Finish
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------- Picker ----------------

export default function Execution() {
  const { data, loading, setLogs } = useAppStore()
  const [activeLogId, setActiveLogId] = useState<string | null>(null)

  const seq = useMemo(() => flattenWorkouts(data.macrocycles), [data.macrocycles])

  // A workout counts as completed once it has at least one finished log.
  const completedIds = useMemo(
    () => new Set(data.logs.filter((l) => l.completedAt !== null).map((l) => l.workoutId)),
    [data.logs],
  )

  // Most-recent unfinished log per workout, so we can resume instead of restarting.
  const inProgressByWorkout = useMemo(() => {
    const map = new Map<string, WorkoutLog>()
    for (const l of data.logs) {
      if (l.completedAt === null && !map.has(l.workoutId)) map.set(l.workoutId, l)
    }
    return map
  }, [data.logs])

  if (activeLogId) {
    return <Runner logId={activeLogId} onExit={() => setActiveLogId(null)} />
  }

  const start = (workout: Workout) => {
    const existing = inProgressByWorkout.get(workout.id)
    if (existing) {
      setActiveLogId(existing.id)
      return
    }
    const log = buildLog(workout)
    setLogs((prev) => [log, ...prev])
    setActiveLogId(log.id)
  }

  // The next workout to do = first one in program order that isn't completed yet.
  const currentIndex = seq.findIndex((s) => !completedIds.has(s.workout.id))
  const current = currentIndex >= 0 ? seq[currentIndex] : null
  const completedCount = seq.filter((s) => completedIds.has(s.workout.id)).length

  const titleOf = (w: Workout) => w.dayLabel || w.name || 'Workout'

  // Build the ordered program list with mesocycle/week headers.
  const rows: JSX.Element[] = []
  let lastGroup = ''
  seq.forEach((item, i) => {
    if (item.groupKey !== lastGroup) {
      lastGroup = item.groupKey
      rows.push(
        <div
          key={`h-${item.groupKey}`}
          className="px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          {item.groupTitle}
        </div>,
      )
    }
    const done = completedIds.has(item.workout.id)
    const running = inProgressByWorkout.has(item.workout.id)
    const isCurrent = currentIndex === i
    rows.push(
      <button
        key={item.workout.id}
        onClick={() => start(item.workout)}
        className={`card flex w-full items-center gap-3 p-3 text-left transition ${
          isCurrent ? 'border-brand-500 ring-1 ring-brand-500/40' : 'hover:border-brand-500/50'
        }`}
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-semibold ${
            done
              ? 'bg-emerald-500/20 text-emerald-300'
              : isCurrent
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800 text-slate-400'
          }`}
        >
          {done ? <Icon name="check" /> : isCurrent ? <Icon name="play" /> : item.seq}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{titleOf(item.workout)}</div>
          {item.workout.name && item.workout.dayLabel && (
            <div className="truncate text-xs text-slate-400">{item.workout.name}</div>
          )}
        </div>
        {done ? (
          <span className="chip border-emerald-500/30 text-emerald-300">Done</span>
        ) : running ? (
          <span className="chip border-amber-500/30 text-amber-300">In progress</span>
        ) : isCurrent ? (
          <span className="chip border-brand-500/40 text-brand-300">Up next</span>
        ) : (
          <span className="chip border-slate-700 text-slate-500">{item.workout.exercises.length} ex</span>
        )}
      </button>,
    )
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Run a workout</h1>
        {seq.length > 0 && (
          <p className="text-sm text-slate-400">
            {completedCount} of {seq.length} workouts done
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : seq.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          No workouts planned yet. Build a program on the Plan tab first.
        </div>
      ) : (
        <>
          {current ? (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Up next</h2>
              <div className="card border-brand-500/40 bg-brand-500/5 p-4">
                <div className="text-xs text-slate-400">{current.groupTitle}</div>
                <div className="mt-0.5 text-lg font-semibold">{titleOf(current.workout)}</div>
                {current.workout.name && current.workout.dayLabel && (
                  <div className="text-sm text-slate-400">{current.workout.name}</div>
                )}
                <div className="mt-1 text-xs text-slate-500">
                  Workout {current.seq} of {seq.length} · {current.workout.exercises.length} exercises
                </div>
                <button className="btn-primary mt-3 w-full" onClick={() => start(current.workout)}>
                  <Icon name="play" /> {inProgressByWorkout.has(current.workout.id) ? 'Resume' : 'Start'}
                </button>
              </div>
            </section>
          ) : (
            <div className="card border-emerald-500/30 bg-emerald-500/5 p-4 text-center text-sm text-emerald-300">
              All workouts complete. Tap any below to repeat it.
            </div>
          )}

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Program</h2>
            <div className="space-y-2">{rows}</div>
          </section>
        </>
      )}
    </div>
  )
}
