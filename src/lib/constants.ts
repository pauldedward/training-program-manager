import type {
  MesocyclePhase,
  MicrocycleType,
  PeriodizationModel,
} from './types'

export const PERIODIZATION_MODELS: { value: PeriodizationModel; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'undulating', label: 'Undulating (DUP)' },
  { value: 'block', label: 'Block' },
  { value: 'none', label: 'None / Custom' },
]

export const MESOCYCLE_PHASES: { value: MesocyclePhase; label: string }[] = [
  { value: 'preparatory', label: 'Preparatory' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'transition', label: 'Transition' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'strength', label: 'Strength' },
  { value: 'power', label: 'Power' },
  { value: 'peaking', label: 'Peaking' },
  { value: 'deload', label: 'Deload' },
]

export const MICROCYCLE_TYPES: { value: MicrocycleType; label: string }[] = [
  { value: 'loading', label: 'Loading' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'deload', label: 'Deload' },
]

export const PHASE_COLORS: Record<MesocyclePhase, string> = {
  preparatory: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  competitive: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  transition: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  hypertrophy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  strength: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  power: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  peaking: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  deload: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
}

export const MICRO_COLORS: Record<MicrocycleType, string> = {
  loading: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  recovery: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  deload: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
}
