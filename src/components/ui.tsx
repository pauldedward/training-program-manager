import { useState, type ReactNode } from 'react'

type IconName =
  | 'plus'
  | 'trash'
  | 'chevron'
  | 'dumbbell'
  | 'play'
  | 'check'
  | 'x'
  | 'clock'
  | 'edit'
  | 'cloud'
  | 'laptop'
  | 'back'
  | 'history'
  | 'search'
  | 'chart'
  | 'target'

export function Icon({
  name,
  className = 'h-4 w-4',
}: {
  name: IconName
  className?: string
}) {
  const paths: Record<IconName, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    trash: (
      <>
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" />
        <path d="M10 11v6M14 11v6" />
      </>
    ),
    chevron: <path d="M9 18l6-6-6-6" />,
    dumbbell: (
      <>
        <path d="M6.5 6.5l11 11M3 9v6M21 9v6" />
        <path d="M5 7v10M19 7v10" />
      </>
    ),
    play: <path d="M6 4l14 8-14 8V4z" />,
    check: <path d="M20 6L9 17l-5-5" />,
    x: <path d="M18 6L6 18M6 6l12 12" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />,
    cloud: <path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6 19h11.5z" />,
    laptop: (
      <>
        <rect x="3" y="5" width="18" height="11" rx="1" />
        <path d="M2 20h20" />
      </>
    ),
    back: <path d="M19 12H5M12 19l-7-7 7-7" />,
    history: (
      <>
        <path d="M3 3v6h6" />
        <path d="M3.5 9a9 9 0 1 1-1 4" />
        <path d="M12 8v4l3 2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l3-3 3 3 5-6" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  )
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  className = '',
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      <input
        className="field"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <textarea
        className="field resize-y"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label?: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <select className="field" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Delete button that requires a second tap to confirm. */
export function ConfirmDelete({
  onConfirm,
  label = 'Delete',
  className = 'btn-danger',
}: {
  onConfirm: () => void
  label?: string
  className?: string
}) {
  const [armed, setArmed] = useState(false)
  return (
    <button
      className={className}
      onClick={() => {
        if (armed) onConfirm()
        else {
          setArmed(true)
          setTimeout(() => setArmed(false), 2500)
        }
      }}
      title={label}
    >
      <Icon name="trash" />
      {armed ? 'Confirm?' : ''}
    </button>
  )
}
