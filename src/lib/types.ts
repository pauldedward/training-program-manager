// Domain model for periodized training programs.
// Hierarchy: Macrocycle -> Mesocycle -> Microcycle -> Workout -> Exercise

import type { TrackedExercise } from './trackerTypes'

export type PeriodizationModel = 'linear' | 'undulating' | 'block' | 'none'

export type MesocyclePhase =
  | 'preparatory'
  | 'competitive'
  | 'transition'
  | 'hypertrophy'
  | 'strength'
  | 'power'
  | 'peaking'
  | 'deload'

export type MicrocycleType = 'loading' | 'recovery' | 'deload'

export interface Exercise {
  id: string
  name: string
  instructions: string // how to do it
  sets: string // e.g. "4"
  reps: string // e.g. "8-10"
  load: string // e.g. "70% / 60kg / RPE 8"
  rpe: string // optional separate RPE/tempo cue
  tempo: string
  rest: string // e.g. "90s"
  notes: string // what / when cues
}

export interface Workout {
  id: string
  dayLabel: string // e.g. "Day 1 — Lower"
  name: string
  exercises: Exercise[]
}

export interface Microcycle {
  id: string
  label: string // e.g. "Week 1"
  type: MicrocycleType
  notes: string
  workouts: Workout[]
}

export interface Mesocycle {
  id: string
  name: string
  phase: MesocyclePhase
  focus: string
  durationWeeks: string
  notes: string
  microcycles: Microcycle[]
}

export interface Macrocycle {
  id: string
  name: string
  goal: string
  model: PeriodizationModel
  startDate: string
  endDate: string
  notes: string
  mesocycles: Mesocycle[]
}

// ---- Workout execution logs ----

export type SetStatus = 'pending' | 'done' | 'missed'

export interface SetLog {
  setNumber: number
  targetReps: string
  actualReps: string
  actualLoad: string
  status: SetStatus
  comment: string
}

export interface ExerciseLog {
  exerciseId: string
  name: string
  sets: SetLog[]
}

export interface WorkoutLog {
  id: string
  workoutId: string
  workoutName: string
  date: string // ISO date
  completedAt: string | null
  exercises: ExerciseLog[]
}

export interface AppData {
  macrocycles: Macrocycle[]
  logs: WorkoutLog[]
  trackedExercises: TrackedExercise[]
}

export const emptyAppData = (): AppData => ({
  macrocycles: [],
  logs: [],
  trackedExercises: [],
})
