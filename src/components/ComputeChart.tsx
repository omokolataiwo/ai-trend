import { useId, useMemo, useState } from 'react'
import type { ComputePoint } from '../api'

type Props = {
  series: ComputePoint[]
  /** Compact mode for hero background; interactive for the data section. */
  variant?: 'hero' | 'panel'
}

export function ComputeChart({ series, variant = 'panel' }: Props) {
  const gradId = useId()
  const [active, setActive] = useState<ComputePoint | null>(null)

  const { path, area, points, ticks } = useMemo(() => {
    if (series.length === 0) {
      return { path: '', area: '', points: [], ticks: { flop: [] } }
    }

    const w = 1000
    const h = 420
    const pad = { t: 28, r: 36, b: 48, l: 56 }
    const innerW = w - pad.l - pad.r
    const innerH = h - pad.t - pad.b

    const years = series.map((p) => p.year)
    const logs = series.map((p) => Math.log10(p.flop))
    const minY = Math.min(...years)
    const maxY = Math.max(...years)
    const minL = Math.min(...logs) - 0.3
    const maxL = Math.max(...logs) + 0.3

    const x = (year: number) =>
      pad.l + ((year - minY) / Math.max(maxY - minY, 1)) * innerW
    const y = (log: number) =>
      pad.t + innerH - ((log - minL) / Math.max(maxL - minL, 1e-9)) * innerH

    const coords = series.map((p) => ({
      ...p,
      cx: x(p.year),
      cy: y(Math.log10(p.flop)),
    }))

    const line = coords
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`)
      .join(' ')

    const areaPath = [
      line,
      `L ${coords[coords.length - 1].cx.toFixed(1)} ${(pad.t + innerH).toFixed(1)}`,
      `L ${coords[0].cx.toFixed(1)} ${(pad.t + innerH).toFixed(1)}`,
      'Z',
    ].join(' ')

    const flopTicks = [19, 21, 23, 25, 26].filter(
      (e) => e >= minL && e <= maxL,
    )

    return {
      path: line,
      area: areaPath,
      points: coords,
      ticks: {
        flop: flopTicks.map((e) => ({ e, y: y(e), label: `1e${e}` })),
      },
    }
  }, [series])

  if (series.length === 0) {
    return null
  }

  const isHero = variant === 'hero'
  const shown = active ?? series[series.length - 1]

  return (
    <div className={`chart ${isHero ? 'chart--hero' : 'chart--panel'}`}>
      {!isHero && (
        <div className="chart__meta">
          <p className="chart__eyebrow">Training compute</p>
          <p className="chart__active">
            <span>{shown.label}</span>
            <strong>{formatShort(shown.flop)} FLOP</strong>
          </p>
        </div>
      )}

      <svg
        className="chart__svg"
        viewBox="0 0 1000 420"
        role="img"
        aria-label="Frontier training compute from 2018 to 2025 on a log scale"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {!isHero &&
          ticks.flop.map((t) => (
            <g key={t.e}>
              <line
                x1="56"
                x2="964"
                y1={t.y}
                y2={t.y}
                className="chart__grid"
              />
              <text x="48" y={t.y + 4} className="chart__tick" textAnchor="end">
                {t.label}
              </text>
            </g>
          ))}

        <path d={area} fill={`url(#${gradId})`} className="chart__area" />
        <path d={path} className="chart__line" />

        {points.map((p) => (
          <g key={p.year}>
            <circle
              cx={p.cx}
              cy={p.cy}
              r={isHero ? 5 : active?.year === p.year ? 8 : 6}
              className={`chart__dot${active?.year === p.year ? ' is-active' : ''}`}
              onMouseEnter={() => !isHero && setActive(p)}
              onMouseLeave={() => !isHero && setActive(null)}
              onFocus={() => !isHero && setActive(p)}
              onBlur={() => !isHero && setActive(null)}
              tabIndex={isHero ? -1 : 0}
              role={isHero ? undefined : 'button'}
              aria-label={
                isHero
                  ? undefined
                  : `${p.label}, ${p.year}, ${formatShort(p.flop)} FLOP`
              }
            />
            {!isHero && (
              <text
                x={p.cx}
                y="400"
                className="chart__tick chart__tick--x"
                textAnchor="middle"
              >
                {p.year}
              </text>
            )}
          </g>
        ))}
      </svg>

      {!isHero && (
        <p className="chart__caption">
          Sample frontier estimates · log₁₀(FLOP) · served from Postgres
        </p>
      )}
    </div>
  )
}

function formatShort(flop: number): string {
  const exp = Math.floor(Math.log10(flop))
  const coef = flop / 10 ** exp
  return `${coef % 1 === 0 ? coef.toFixed(0) : coef.toFixed(1)}×10^${exp}`
}
