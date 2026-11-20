import { yuan } from "./data"

export type LedgerRow = {
  name: string
  value: number
  extra?: number
}

export function Ledger({ rows, note }: { rows: LedgerRow[]; note?: string }) {
  const max = Math.max(...rows.map((row) => row.value + (row.extra ?? 0)), 1)

  return (
    <figure className="ledger">
      <ul>
        {rows.map((row) => {
          const extra = row.extra ?? 0
          const sum = row.value + extra
          return (
            <li key={row.name}>
              <span className="name">{row.name}</span>
              <span className="track">
                <span
                  className="fill"
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
                {extra > 0 ? (
                  <span
                    className="extra"
                    style={{
                      left: `${(row.value / max) * 100}%`,
                      width: `${(extra / max) * 100}%`,
                    }}
                  />
                ) : null}
              </span>
              <span className="amt">{yuan(sum)}</span>
            </li>
          )
        })}
      </ul>
      {note ? (
        <p className="legend">
          <span aria-hidden="true" className="swatch" />
          {note}
        </p>
      ) : null}
    </figure>
  )
}
