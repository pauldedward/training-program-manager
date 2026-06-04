import { useRef, useState } from 'react'
import { maxLabel, type ScorePoint } from '../lib/metricMath'

const fmtDate = (iso: string) => {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const fmtNum = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

// Least-squares slope/intercept of value vs. index (0..n-1).
function linearFit(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length
  const sumX = (n * (n - 1)) / 2
  const sumXX = ys.reduce((s, _, i) => s + i * i, 0)
  const sumY = ys.reduce((s, v) => s + v, 0)
  const sumXY = ys.reduce((s, v, i) => s + i * v, 0)
  const denom = n * sumXX - sumX * sumX || 1
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

// Lightweight inline SVG line chart. X = entry date, Y = computed score.
export function MiniChart({
  points,
  height = 120,
}: {
  points: ScorePoint[]
  height?: number
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState<number | null>(null)

  if (points.length < 2) {
    return (
      <div className="grid place-items-center rounded-lg border border-slate-800 bg-slate-900/40 py-6 text-xs text-slate-500">
        Need at least 2 data points to graph.
      </div>
    )
  }

  const W = 320
  const H = height
  const padX = 10
  const padY = 18

  const xs = points.map((_, i) => i)
  const ys = points.map((p) => p.value)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanY = maxY - minY || 1

  const x = (i: number) => padX + (i / (xs.length - 1 || 1)) * (W - padX * 2)
  const yRaw = (v: number) => padY + (1 - (v - minY) / spanY) * (H - padY * 2)
  const y = (v: number) => Math.max(padY, Math.min(H - padY, yRaw(v)))

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ')
  const area = `${line} L ${x(xs.length - 1)} ${H - padY} L ${x(0)} ${H - padY} Z`

  const maxIdx = ys.indexOf(maxY)
  const peak = points[maxIdx]

  // Trend line (linear regression) across the visible range.
  const { slope, intercept } = linearFit(ys)
  const trendStart = intercept
  const trendEnd = intercept + slope * (ys.length - 1)
  const rising = trendEnd >= trendStart

  // First -> last delta summary.
  const first = ys[0]
  const lastVal = ys[ys.length - 1]
  const delta = lastVal - first
  const pct = first ? (delta / first) * 100 : 0
  const up = delta >= 0

  // Horizontal gridlines at max / mid / min for visual reference.
  const gridVals = [maxY, (minY + maxY) / 2, minY]

  const onMove = (clientX: number) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = ((clientX - rect.left) / (rect.width || 1)) * W
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(x(i) - px)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    setActive(best)
  }

  const ap = active != null ? points[active] : null
  const tipLeftPct = active != null ? (x(active) / W) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${
            up ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
          }`}
        >
          <span>{up ? '▲' : '▼'}</span>
          {up ? '+' : ''}
          {fmtNum(delta)}
          {first ? ` (${up ? '+' : ''}${pct.toFixed(0)}%)` : ''}
        </span>
        <span className="text-slate-500">over {points.length} sessions</span>
      </div>

      <div
        ref={wrapRef}
        className="relative rounded-lg border border-slate-800 bg-slate-950/40 p-1.5"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          role="img"
          aria-label="Progress chart"
        >
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {gridVals.map((v, i) => (
            <g key={i}>
              <line
                x1={padX}
                x2={W - padX}
                y1={y(v)}
                y2={y(v)}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray={i === 1 ? '3 3' : undefined}
              />
              <text x={W - padX} y={y(v) - 2} textAnchor="end" className="fill-slate-600 text-[8px]">
                {fmtNum(v)}
              </text>
            </g>
          ))}
          <path d={area} fill="url(#grad)" />
          <line
            x1={x(0)}
            y1={y(trendStart)}
            x2={x(ys.length - 1)}
            y2={y(trendEnd)}
            stroke={rising ? '#34d399' : '#fb7185'}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.7"
          />
          <path
            d={line}
            fill="none"
            stroke="#818cf8"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {ap && (
            <line
              x1={x(active!)}
              x2={x(active!)}
              y1={padY}
              y2={H - padY}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}
          {points.map((p, i) => (
            <circle
              key={p.entry.id}
              cx={x(i)}
              cy={y(p.value)}
              r={i === active ? 4.5 : i === maxIdx ? 5 : 2.5}
              fill={i === maxIdx ? '#34d399' : i === active ? '#818cf8' : '#c7d2fe'}
              stroke={i === maxIdx || i === active ? '#0b1120' : 'none'}
              strokeWidth={i === maxIdx || i === active ? 2.5 : 0}
            />
          ))}
          {!ap && (
            <text
              x={x(maxIdx)}
              y={y(maxY) - 9}
              textAnchor="middle"
              className="fill-emerald-300 text-[11px] font-bold"
            >
              {fmtNum(maxY)}
            </text>
          )}
          {!ap && (
            <>
              <text x={padX} y={H - 4} className="fill-slate-500 text-[9px]">
                {points[0].date.slice(5)}
              </text>
              <text x={W - padX} y={H - 4} textAnchor="end" className="fill-slate-500 text-[9px]">
                {points[points.length - 1].date.slice(5)}
              </text>
            </>
          )}
        </svg>
        {ap && (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2"
            style={{ left: `clamp(3.5rem, ${tipLeftPct}%, calc(100% - 3.5rem))` }}
          >
            <div className="rounded-md border border-slate-700 bg-slate-900/95 px-2 py-1 text-center shadow-lg shadow-slate-950/50">
              <div className="text-[11px] font-bold text-brand-200">{fmtNum(ap.value)}</div>
              <div className="whitespace-nowrap text-[10px] text-slate-300">{maxLabel(ap.entry)}</div>
              <div className="text-[9px] text-slate-500">{fmtDate(ap.date)}</div>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400/80">Max</span>
        <span className="text-sm font-semibold text-emerald-100">{maxLabel(peak.entry)}</span>
        <span className="ml-auto text-xs text-slate-400">{fmtDate(peak.date)}</span>
      </div>
    </div>
  )
}

