import { uid } from '../lib/id'
import type {
  Exercise,
  Macrocycle,
  Mesocycle,
  Microcycle,
  Workout,
} from '../lib/types'

export const newExercise = (): Exercise => ({
  id: uid(),
  name: '',
  instructions: '',
  sets: '',
  reps: '',
  load: '',
  rpe: '',
  tempo: '',
  rest: '',
  notes: '',
})

export const newWorkout = (index: number): Workout => ({
  id: uid(),
  dayLabel: `Day ${index}`,
  name: '',
  exercises: [],
})

export const newMicrocycle = (index: number): Microcycle => ({
  id: uid(),
  label: `Week ${index}`,
  type: 'loading',
  notes: '',
  workouts: [],
})

export const newMesocycle = (): Mesocycle => ({
  id: uid(),
  name: 'New mesocycle',
  phase: 'hypertrophy',
  focus: '',
  durationWeeks: '4',
  notes: '',
  microcycles: [],
})

export const newMacrocycle = (): Macrocycle => ({
  id: uid(),
  name: 'New macrocycle',
  goal: '',
  model: 'linear',
  startDate: '',
  endDate: '',
  notes: '',
  mesocycles: [],
})
