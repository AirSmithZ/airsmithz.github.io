import { useState, type CSSProperties, type KeyboardEvent } from "react"
import type { CallNode, CallSeat, PersonConfirm, PrepItem } from "./data"

export const dayParts = [
  { id: "前一天", label: "前一天" },
  { id: "仪式前", label: "仪式前" },
  { id: "正式仪式", label: "仪式中" },
  { id: "仪式之后", label: "仪式后" },
  { id: "人员确认", label: "人员确认" },
  { id: "物品确认", label: "物品确认" },
  { id: "待完成事项", label: "待完成事项" },
] as const

export type SheetPart = { id: string; label: string }

type SheetStorage = { people: string; prep: string; tasks: string }

function personStyle(tone: string) {
  return { "--person": `var(--tone-${tone})` } as CSSProperties
}

function standingCrew(seat: CallSeat) {
  const notes = seat.notes?.some((line) => line.trim()) ?? false
  return !notes && (seat.act === "全程拍照" || seat.act === "全程录像")
}

function SeatList({ compact, seats }: { compact: boolean; seats: CallSeat[] }) {
  const crew = compact ? seats.filter(standingCrew) : []
  const shown = crew.length > 1 ? seats.filter((seat) => !standingCrew(seat)) : seats

  return (
    <>
      {shown.length ? (
        <ul className="seats">
          {shown.map((seat) => (
            <li key={seat.who} style={personStyle(seat.tone)}>
              <span className="tag">
                {seat.who}
                <span className="act">{seat.act}</span>
              </span>
              {seat.notes?.length ? (
                <span className="marks">
                  {seat.notes.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {crew.length > 1 ? (
        <p className="crew">{crew.map((seat) => `${seat.who}${seat.act.replace("全程", "")}`).join("，")}</p>
      ) : null}
    </>
  )
}

function readChecked(storageKey: string, items: PrepItem[]) {
  try {
    const raw = localStorage.getItem(storageKey)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    const names = new Set(items.map((item) => item.name))
    return parsed.filter((name): name is string => typeof name === "string" && names.has(name))
  } catch {
    return []
  }
}

function CheckList({ kind, items, storageKey }: { kind: "goods" | "errand"; items: PrepItem[]; storageKey: string }) {
  const [checked, setChecked] = useState<string[]>(() => readChecked(storageKey, items))

  function toggle(name: string) {
    setChecked((current) => {
      const next = current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  const left = items.length - checked.length
  const status = left === 0
    ? (kind === "goods" ? "都对过了" : "都做完了")
    : (kind === "goods" ? `还差 ${left} 件` : `还剩 ${left} 件`)

  return (
    <section className="prep pack">
      <h2>{status}</h2>
      <ul>
        {items.map((item) => {
          const on = checked.includes(item.name)
          return (
            <li className={on ? "done" : undefined} key={item.name}>
              <label>
                <input checked={on} type="checkbox" onChange={() => toggle(item.name)} />
                <span className="mark" aria-hidden="true" />
                <span className="text">
                  <strong>{item.name}</strong>
                  <span className="note">{item.note}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PeopleList({ items, storageKey }: { items: PersonConfirm[]; storageKey: string }) {
  const [checked, setChecked] = useState<string[]>(() => readChecked(storageKey, items))

  function toggle(name: string) {
    setChecked((current) => {
      const next = current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  return (
    <section className="prep roster">
      <h2>
        婚礼前确认
        <span className="count">{checked.length} / {items.length}</span>
      </h2>
      <ul>
        {items.map((item) => {
          const on = checked.includes(item.name)
          return (
            <li className={on ? "done" : undefined} key={item.name}>
              <label>
                <input checked={on} type="checkbox" onChange={() => toggle(item.name)} />
                <span className="mark" aria-hidden="true" />
                <time dateTime={item.time}>
                  {item.time}
                  {item.inferred ? <span className="guess">推算</span> : null}
                </time>
                <span className="who" style={personStyle(item.tone)}>
                  <span className="tag">{item.name}</span>
                  <span className="place">{item.place}</span>
                </span>
                <span className="reach">
                  {item.by}联系。
                  {item.phone ? (
                    <a href={`tel:${item.phone}`}>{item.phone}</a>
                  ) : (
                    <span className="gap">微信联系</span>
                  )}
                  {item.note}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function CallSheet({
  parts,
  nodes,
  people,
  prep,
  tasks,
  storage,
  idPrefix,
  activePart,
  showTabs = true,
  compact = false,
}: {
  parts: readonly SheetPart[]
  nodes: CallNode[]
  people: PersonConfirm[]
  prep: PrepItem[]
  tasks: PrepItem[]
  storage: SheetStorage
  idPrefix: string
  activePart?: string
  showTabs?: boolean
  compact?: boolean
}) {
  const [part, setPart] = useState(activePart ?? parts[0].id)
  const current = activePart ?? part
  const rows = nodes.filter((node) => node.part === current)

  function move(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
    event.preventDefault()
    const index = parts.findIndex((item) => item.id === part)
    const step = event.key === "ArrowRight" ? 1 : -1
    const next = parts[(index + step + parts.length) % parts.length]
    setPart(next.id)
    document.getElementById(`${idPrefix}-${next.id}`)?.focus()
  }

  const currentLabel = parts.find((item) => item.id === current)?.label ?? current

  return (
    <div className="call">
      {showTabs ? (
        <div className="part-tabs" role="tablist" aria-label="流程时段" onKeyDown={move}>
          {parts.map((item) => {
            const selected = current === item.id
            return (
              <button
                aria-selected={selected}
                id={`${idPrefix}-${item.id}`}
                key={item.id}
                role="tab"
                tabIndex={selected ? 0 : -1}
                type="button"
                onClick={() => setPart(item.id)}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      ) : null}
      <div role="tabpanel" aria-label={currentLabel}>
        {current === "人员确认" ? (
          <PeopleList items={people} storageKey={storage.people} />
        ) : current === "物品确认" ? (
          <CheckList key={storage.prep} kind="goods" items={prep} storageKey={storage.prep} />
        ) : current === "待完成事项" ? (
          <CheckList key={storage.tasks} kind="errand" items={tasks} storageKey={storage.tasks} />
        ) : (
          <div className="sheet">
            {rows.map((node) => (
              <section
                className={node.lock ? "cue lock" : "cue"}
                data-music={node.music?.key}
                data-part={node.part === "前一天" ? "eve" : undefined}
                key={node.id}
              >
                <header className={node.music ? "cue-head scored" : "cue-head"}>
                  <time dateTime={node.time}>
                    {node.time}
                    {node.until ? <span>–{node.until}</span> : null}
                    {node.inferred ? <span className="guess">推算</span> : null}
                  </time>
                  {node.music ? <p className="tune">{node.music.title}</p> : null}
                  <h3>
                    {node.title}
                    <span className="place">{node.place}</span>
                  </h3>
                  {node.speak?.length ? (
                    <div className="cue-speak">
                      {node.speak.map((item) => (
                        <span className="tag" key={`${item.who}${item.act}`} style={personStyle(item.tone)}>
                          {item.who}
                          <span className="act">{item.act}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </header>
                <div className="cue-body">
                  {node.note ? <p className="note">{node.note}</p> : null}
                  {node.watch?.map((line) => (
                    <p className="watch" key={line}>{line}</p>
                  ))}
                  <SeatList compact={compact} seats={node.seats} />
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
