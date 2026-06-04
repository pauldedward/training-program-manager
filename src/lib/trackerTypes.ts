// Decoupled "Exercise Tracker" module.
// Hierarchy: TrackedExercise -> ExerciseEntry
//
// Exercise = "Bench press"
// Entry    = one dated log, tagged with a `type` ("1RM", "Volume", "Speed").
//            The `type` separates progression streams (e.g. conjugate methods)
//            without an extra nesting level.

export type EntryStatus = 'success' | 'partial'

// One set within a "varied" day (ramping / pyramid). Used only when an entry's
// `setRows` is non-empty; otherwise the flat `sets/reps/load` describe the day.
export interface SetRow {
  id: string
  reps: string // alphanumeric ("5", "30s")
  load: string // alphanumeric ("60kg", "BW+10")
}

export interface ExerciseEntry {
  id: string
  date: string // ISO 'yyyy-mm-dd'
  type: string // progression stream tag ("1RM", "Volume", "Speed", "")
  sets: string // alphanumeric, optional ("", "1", "3")
  reps: string // alphanumeric ("12", "30s", "AMRAP")
  load: string // alphanumeric ("40kg", "BW+10", "")
  // Per-set loads for ramping/pyramid days. When non-empty this OVERRIDES the
  // flat sets/reps/load for scoring and display. Empty = uniform mode.
  setRows: SetRow[]
  rpe: string // optional effort rating ("8", "7.5")
  tempo: string // optional tempo code ("3010", "3/1/4/2")
  notes: string
  status: EntryStatus
}

export interface TrackedExercise {
  id: string
  name: string // searchable ("Bench press")
  notes: string
  entries: ExerciseEntry[]
}

// Which value drives the progress graph's Y axis.
export type ScoreMode = 'load' | 'duration' | 'rpe' | 'volume'
