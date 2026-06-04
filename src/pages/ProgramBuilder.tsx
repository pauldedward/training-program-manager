import { useState } from 'react'
import { useAppStore } from '../store/AppStore'
import {
  MESOCYCLE_PHASES,
  MICROCYCLE_TYPES,
  MICRO_COLORS,
  PERIODIZATION_MODELS,
  PHASE_COLORS,
} from '../lib/constants'
import type {
  Exercise,
  Macrocycle,
  Mesocycle,
  Microcycle,
  Workout,
} from '../lib/types'
import {
  newExercise,
  newMacrocycle,
  newMesocycle,
  newMicrocycle,
  newWorkout,
} from '../store/factories'
import { ConfirmDelete, Field, Icon, Select, TextArea } from '../components/ui'

// Generic helper: replace an item by id in a list.
function replaceById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.map((x) => (x.id === item.id ? item : x))
}

function CollapseHeader({
  open,
  onToggle,
  children,
}: {
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 text-left"
      aria-expanded={open}
    >
      <Icon
        name="chevron"
        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`}
      />
      {children}
    </button>
  )
}

function TitleInput({
  value,
  onChange,
  placeholder,
  size = 'base',
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  size?: 'lg' | 'base' | 'sm'
}) {
  const cls =
    size === 'lg'
      ? 'text-lg font-semibold'
      : size === 'sm'
        ? 'text-sm font-medium'
        : 'text-base font-medium'
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={`w-full bg-transparent text-slate-100 placeholder:text-slate-600 outline-none ${cls}`}
    />
  )
}

// ---------------- Exercise ----------------

function ExerciseRow({
  exercise,
  onChange,
  onDelete,
}: {
  exercise: Exercise
  onChange: (e: Exercise) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const set = (patch: Partial<Exercise>) => onChange({ ...exercise, ...patch })
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2">
        <Icon name="dumbbell" className="h-4 w-4 shrink-0 text-brand-400" />
        <TitleInput
          value={exercise.name}
          onChange={(v) => set({ name: v })}
          placeholder="Exercise name"
          size="sm"
        />
        <button className="btn-ghost px-2 py-1" onClick={() => setOpen((o) => !o)} title="Details">
          <Icon name="edit" />
        </button>
        <ConfirmDelete onConfirm={onDelete} className="btn-danger px-2 py-1" />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Field label="Sets" value={exercise.sets} onChange={(v) => set({ sets: v })} placeholder="4" />
        <Field label="Reps" value={exercise.reps} onChange={(v) => set({ reps: v })} placeholder="8-10" />
        <Field
          label="Load"
          value={exercise.load}
          onChange={(v) => set({ load: v })}
          placeholder="70% / RPE 8"
          className="col-span-1"
        />
        <Field label="Rest" value={exercise.rest} onChange={(v) => set({ rest: v })} placeholder="90s" />
        <Field label="Tempo" value={exercise.tempo} onChange={(v) => set({ tempo: v })} placeholder="3-1-1" />
      </div>

      {open && (
        <div className="mt-2 space-y-2">
          <TextArea
            label="How to do it"
            value={exercise.instructions}
            onChange={(v) => set({ instructions: v })}
            placeholder="Setup, cues, range of motion…"
          />
          <TextArea
            label="Notes (what / when)"
            value={exercise.notes}
            onChange={(v) => set({ notes: v })}
            placeholder="Supersetted with…, warm-up sets…"
          />
        </div>
      )}
    </div>
  )
}

// ---------------- Workout ----------------

function WorkoutCard({
  workout,
  onChange,
  onDelete,
}: {
  workout: Workout
  onChange: (w: Workout) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(true)
  const set = (patch: Partial<Workout>) => onChange({ ...workout, ...patch })

  return (
    <div className="card border-slate-700 p-3">
      <div className="flex items-center gap-2">
        <CollapseHeader open={open} onToggle={() => setOpen((o) => !o)}>
          <div className="min-w-0 flex-1">
            <TitleInput
              value={workout.dayLabel}
              onChange={(v) => set({ dayLabel: v })}
              placeholder="Day label"
              size="sm"
            />
          </div>
        </CollapseHeader>
        <span className="chip border-slate-700 text-slate-400">
          {workout.exercises.length} ex
        </span>
        <ConfirmDelete onConfirm={onDelete} className="btn-danger px-2 py-1" />
      </div>

      {open && (
        <div className="mt-3 space-y-2 pl-6">
          <Field
            value={workout.name}
            onChange={(v) => set({ name: v })}
            placeholder="Focus (e.g. Lower — squat emphasis)"
          />
          {workout.exercises.map((ex) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              onChange={(updated) => set({ exercises: replaceById(workout.exercises, updated) })}
              onDelete={() => set({ exercises: workout.exercises.filter((x) => x.id !== ex.id) })}
            />
          ))}
          <button
            className="btn-ghost w-full border border-dashed border-slate-700"
            onClick={() => set({ exercises: [...workout.exercises, newExercise()] })}
          >
            <Icon name="plus" /> Add exercise
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------- Microcycle ----------------

function MicrocycleCard({
  micro,
  onChange,
  onDelete,
}: {
  micro: Microcycle
  onChange: (m: Microcycle) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(true)
  const set = (patch: Partial<Microcycle>) => onChange({ ...micro, ...patch })

  return (
    <div className="card border-slate-700/70 bg-slate-900/40 p-3">
      <div className="flex items-center gap-2">
        <CollapseHeader open={open} onToggle={() => setOpen((o) => !o)}>
          <div className="min-w-0 flex-1">
            <TitleInput
              value={micro.label}
              onChange={(v) => set({ label: v })}
              placeholder="Week label"
              size="sm"
            />
          </div>
        </CollapseHeader>
        <span className={`chip ${MICRO_COLORS[micro.type]}`}>{micro.type}</span>
        <ConfirmDelete onConfirm={onDelete} className="btn-danger px-2 py-1" />
      </div>

      {open && (
        <div className="mt-3 space-y-2 pl-6">
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Type"
              value={micro.type}
              onChange={(v) => set({ type: v })}
              options={MICROCYCLE_TYPES}
            />
            <Field
              label="Notes"
              value={micro.notes}
              onChange={(v) => set({ notes: v })}
              placeholder="Optional"
            />
          </div>
          {micro.workouts.map((w) => (
            <WorkoutCard
              key={w.id}
              workout={w}
              onChange={(updated) => set({ workouts: replaceById(micro.workouts, updated) })}
              onDelete={() => set({ workouts: micro.workouts.filter((x) => x.id !== w.id) })}
            />
          ))}
          <button
            className="btn-ghost w-full border border-dashed border-slate-700"
            onClick={() => set({ workouts: [...micro.workouts, newWorkout(micro.workouts.length + 1)] })}
          >
            <Icon name="plus" /> Add workout
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------- Mesocycle ----------------

function MesocycleCard({
  meso,
  onChange,
  onDelete,
}: {
  meso: Mesocycle
  onChange: (m: Mesocycle) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(true)
  const set = (patch: Partial<Mesocycle>) => onChange({ ...meso, ...patch })

  return (
    <div className="card p-3">
      <div className="flex items-center gap-2">
        <CollapseHeader open={open} onToggle={() => setOpen((o) => !o)}>
          <div className="min-w-0 flex-1">
            <TitleInput value={meso.name} onChange={(v) => set({ name: v })} placeholder="Mesocycle name" />
          </div>
        </CollapseHeader>
        <span className={`chip ${PHASE_COLORS[meso.phase]}`}>{meso.phase}</span>
        <ConfirmDelete onConfirm={onDelete} className="btn-danger px-2 py-1" />
      </div>

      {open && (
        <div className="mt-3 space-y-2 pl-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Select label="Phase" value={meso.phase} onChange={(v) => set({ phase: v })} options={MESOCYCLE_PHASES} />
            <Field label="Weeks" value={meso.durationWeeks} onChange={(v) => set({ durationWeeks: v })} placeholder="4" />
            <Field label="Focus" value={meso.focus} onChange={(v) => set({ focus: v })} placeholder="e.g. Volume" />
          </div>
          {meso.notes !== undefined && (
            <Field label="Notes" value={meso.notes} onChange={(v) => set({ notes: v })} placeholder="Optional" />
          )}
          {meso.microcycles.map((mc) => (
            <MicrocycleCard
              key={mc.id}
              micro={mc}
              onChange={(updated) => set({ microcycles: replaceById(meso.microcycles, updated) })}
              onDelete={() => set({ microcycles: meso.microcycles.filter((x) => x.id !== mc.id) })}
            />
          ))}
          <button
            className="btn-ghost w-full border border-dashed border-slate-700"
            onClick={() =>
              set({ microcycles: [...meso.microcycles, newMicrocycle(meso.microcycles.length + 1)] })
            }
          >
            <Icon name="plus" /> Add microcycle
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------- Macrocycle ----------------

function MacrocycleCard({
  macro,
  onChange,
  onDelete,
}: {
  macro: Macrocycle
  onChange: (m: Macrocycle) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(true)
  const set = (patch: Partial<Macrocycle>) => onChange({ ...macro, ...patch })

  return (
    <div className="card border-slate-700 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2">
        <CollapseHeader open={open} onToggle={() => setOpen((o) => !o)}>
          <div className="min-w-0 flex-1">
            <TitleInput value={macro.name} onChange={(v) => set({ name: v })} placeholder="Macrocycle name" size="lg" />
          </div>
        </CollapseHeader>
        <span className="chip border-brand-500/30 bg-brand-500/10 text-brand-300 capitalize">
          {macro.model}
        </span>
        <ConfirmDelete onConfirm={onDelete} className="btn-danger px-2 py-1" />
      </div>

      {open && (
        <div className="mt-3 space-y-3 pl-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select label="Model" value={macro.model} onChange={(v) => set({ model: v })} options={PERIODIZATION_MODELS} />
            <Field label="Goal" value={macro.goal} onChange={(v) => set({ goal: v })} placeholder="Peak for…" />
            <label className="block">
              <span className="label">Start</span>
              <input type="date" className="field" value={macro.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">End</span>
              <input type="date" className="field" value={macro.endDate} onChange={(e) => set({ endDate: e.target.value })} />
            </label>
          </div>
          <TextArea label="Notes" value={macro.notes} onChange={(v) => set({ notes: v })} placeholder="Strategy, competitions, constraints…" />

          {macro.mesocycles.map((m) => (
            <MesocycleCard
              key={m.id}
              meso={m}
              onChange={(updated) => set({ mesocycles: replaceById(macro.mesocycles, updated) })}
              onDelete={() => set({ mesocycles: macro.mesocycles.filter((x) => x.id !== m.id) })}
            />
          ))}
          <button
            className="btn-ghost w-full border border-dashed border-slate-700"
            onClick={() => set({ mesocycles: [...macro.mesocycles, newMesocycle()] })}
          >
            <Icon name="plus" /> Add mesocycle
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------- Page ----------------

export default function ProgramBuilder() {
  const { data, loading, setMacrocycles } = useAppStore()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Programs</h1>
          <p className="text-sm text-slate-400">Macro → meso → micro → workout → exercise</p>
        </div>
        <button className="btn-primary" onClick={() => setMacrocycles((prev) => [...prev, newMacrocycle()])}>
          <Icon name="plus" /> Macrocycle
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : data.macrocycles.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Icon name="dumbbell" className="h-8 w-8 text-slate-600" />
          <p className="text-slate-400">No programs yet. Create your first macrocycle to start planning.</p>
          <button className="btn-primary" onClick={() => setMacrocycles((prev) => [...prev, newMacrocycle()])}>
            <Icon name="plus" /> New macrocycle
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.macrocycles.map((m) => (
            <MacrocycleCard
              key={m.id}
              macro={m}
              onChange={(updated) => setMacrocycles((prev) => replaceById(prev, updated))}
              onDelete={() => setMacrocycles((prev) => prev.filter((x) => x.id !== m.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
