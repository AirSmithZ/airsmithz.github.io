import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type TransitionEvent } from "react"
import { HBar } from "./Chart"
import { Ledger } from "./Ledger"
import { CallSheet, dayParts } from "./CallSheet"
import { Speeches } from "./SpeakScript"
import {
  callNodes,
  circles,
  expenseBars,
  expenseLines,
  openTasks,
  parties,
  peopleConfirm,
  prepItems,
  rooms,
  tableCompare,
  unpriced,
  yuan,
  paid,
  quotedUnpaid,
  total,
} from "./data"
import { lzdNodes, lzdParts, lzdPeople, lzdPrep, lzdTasks } from "./lzd"

const panels = [
  { id: "money", label: "开销" },
  { id: "people", label: "人数" },
  { id: "day", label: "流程" },
  { id: "day2", label: "流程2" },
  { id: "speak", label: "发言" },
] as const

type PanelId = (typeof panels)[number]["id"]

const phoneQuery = "(max-width: 720px)"

const phoneParts = dayParts.filter(
  (item) =>
    item.id === "前一天" ||
    item.id === "仪式前" ||
    item.id === "正式仪式" ||
    item.id === "仪式之后",
)

type PhoneSection = (typeof phoneParts)[number]["id"] | "speak"

function storedTheme(): "light" | "dark" {
  try {
    if (localStorage.getItem("theme") === "light") return "light"
  } catch {
    /* 读不到时用深色 */
  }
  return "dark"
}

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(phoneQuery).matches)

  useEffect(() => {
    const media = window.matchMedia(phoneQuery)
    const onChange = () => setNarrow(media.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  return narrow
}

function applyTheme(mode: "light" | "dark") {
  if (mode === "dark") document.documentElement.dataset.theme = "dark"
  else delete document.documentElement.dataset.theme
}

export default function App() {
  const narrow = useNarrow()
  const [panel, setPanel] = useState<PanelId>("money")
  const [theme, setTheme] = useState<"light" | "dark">(storedTheme)

  useEffect(() => {
    applyTheme(narrow ? "dark" : theme)
  }, [narrow, theme])

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    localStorage.setItem("theme", next)
    setTheme(next)
  }

  if (narrow) return <Phone />

  return (
    <div className="shell">
      <nav className="rail" aria-label="看板">
        {panels.map((item) => (
          <button
            aria-pressed={panel === item.id}
            className={panel === item.id ? "on" : undefined}
            key={item.id}
            onClick={() => setPanel(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
        <button
          aria-pressed={theme === "dark"}
          className="theme"
          onClick={toggleTheme}
          type="button"
        >
          深色
        </button>
      </nav>
      <main>
        {panel === "money" ? <Money /> : null}
        {panel === "people" ? <People /> : null}
        {panel === "day" ? <Day /> : null}
        {panel === "day2" ? <Day2 /> : null}
        {panel === "speak" ? <Speak /> : null}
      </main>
    </div>
  )
}

function Money() {
  return (
    <article>
      <h1>20 桌口径下，已经有数的开销</h1>
      <p>
        合计 {yuan(total)} 元。其中已经付出 {yuan(paid)} 元，报价还没记进实付的有{" "}
        {yuan(quotedUnpaid)} 元。国窖按 4 件、每件 6 瓶，不跟着桌数改。住宿 8
        间都按 1 晚。改口费 19,998 元是父母给新人的，不在这张图里。
      </p>
      <Ledger rows={expenseBars.map((row) => ({ name: row.name, value: row.yuan }))} />
      <h2>15 桌和 20 桌差在午宴</h2>
      <p>
        两列都含酒、住宿和红包。从 20 桌改到 15 桌，少的是 5 桌午餐 12,995
        元。再少 10 个占座的人，大约少 1 桌、2,599 元，酒和房间不动。20
        桌要收到每人 624 元才盖住，15 桌是每人 745 元。
      </p>
      <Ledger
        note="暖色那一截是 5 桌午餐，12,995 元。"
        rows={tableCompare}
      />
      <h2>这 {yuan(total)} 里有什么</h2>
      <table>
        <thead>
          <tr>
            <th>项</th>
            <th>怎么来的</th>
            <th>元</th>
          </tr>
        </thead>
        <tbody>
          {expenseLines.map(([name, how, amount]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{how}</td>
              <th>{amount}</th>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>还没有价，所以没加进合计</h2>
      <ul>
        {unpriced.map(([name, detail]) => (
          <li key={name}>
            <strong>{name}</strong>
            <span>{detail}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function People() {
  return (
    <article>
      <h1>会到的人，和还没锁给酒店的桌</h1>
      <p>
        朋友、同学、同事 68 人会到，还有 1 人没定。男方家里 55 人会到，大奶奶家
        2 人可能不来。女方约 30 人，名单没拆。主桌约 8 人。加在一起大约 161
        人、17 桌。预算这轮仍按 20 桌午宴算，多出来的 3 桌还没从酒店减掉。
      </p>
      <h2>朋友同事里谁会到</h2>
      <HBar data={circles} dataKey="heads" ratio="3 / 1" unit=" 人" />
      <h2>四档人数</h2>
      <HBar data={parties} dataKey="heads" ratio="4 / 1" unit=" 人" />
      <h2>四档桌数</h2>
      <HBar data={parties} dataKey="tables" ratio="4 / 1" unit=" 桌" />
      <h2>已经订的 8 间</h2>
      <p>交子国际酒店，370 元一晚。朋友 5、女方亲戚 2、男方父母 1，合计 2,960 元。新人自己的房不在这 8 间里。</p>
      <table>
        <thead>
          <tr>
            <th>房</th>
            <th>谁</th>
            <th>几人</th>
            <th>几晚</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map(([no, who, count, nights]) => (
            <tr key={no}>
              <td>{no}</td>
              <td>{who}</td>
              <td>{count}</td>
              <td>{nights}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

function Day() {
  return (
    <article className="day">
      <h1>11.21 先到位，11.22 从 5:00 到敬酒</h1>
      <p>
        前一天：上午搬物资，下午彩排对接、取礼服、买水果，晚上入住吃饭。当天：敬茶后换迎宾纱再换主婚纱，空镜 10:50，11:58 走 T 台不挪。切歌归李宗达。12:50 敬酒可顺延。
      </p>
      <CallSheet
        idPrefix="day"
        nodes={callNodes}
        parts={dayParts}
        people={peopleConfirm}
        prep={prepItems}
        storage={{
          people: "wedding-people-checked",
          prep: "wedding-prep-checked",
          tasks: "wedding-open-tasks",
        }}
        tasks={openTasks}
      />
    </article>
  )
}

function Day2() {
  return (
    <article className="day">
      <h1>11 月 1 日，金牛宾馆天丰厅</h1>
      <p>
        李宗达、朱若凌，34 桌。化妆和两场敬茶在仪式前，回酒店之后换主纱、空镜、入席也在仪式前。抢亲和婚车分开。仪式写着 12:08，这是预估，人到了再开。
      </p>
      <CallSheet
        idPrefix="lzd"
        nodes={lzdNodes}
        parts={lzdParts}
        people={lzdPeople}
        prep={lzdPrep}
        storage={{
          people: "lzd-people-checked",
          prep: "lzd-prep-checked",
          tasks: "lzd-open-tasks",
        }}
        tasks={lzdTasks}
      />
    </article>
  )
}

function Speak({ bare = false, editable = false }: { bare?: boolean; editable?: boolean }) {
  return (
    <article className="speak-page">
      {bare ? null : (
        <>
          <h1>台上发言，按时间往下念</h1>
          <p>
            左侧是时间，彩色名字是谁开口。灰字是动作提示，【】是誓词全文位置。原文未写发言人的段落只留台词。
          </p>
        </>
      )}
      <Speeches editable={editable} />
    </article>
  )
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function swipeTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("textarea, input, button, a, label"))
}

function Phone() {
  const [section, setSection] = useState<PhoneSection>("前一天")
  const [shift, setShift] = useState(0)
  const [moving, setMoving] = useState(false)
  const order: PhoneSection[] = [...phoneParts.map((item) => item.id), "speak"]
  const mainRef = useRef<HTMLElement>(null)
  const sectionRef = useRef(section)
  const pending = useRef<PhoneSection | null>(null)
  const focusAfter = useRef(false)
  const gesture = useRef<{ id: number; x: number; y: number; axis: "x" | "y" | null } | null>(null)
  sectionRef.current = section

  function sheetWidth() {
    return mainRef.current?.clientWidth || 320
  }

  function land(next: PhoneSection) {
    pending.current = null
    setMoving(false)
    setShift(0)
    setSection(next)
    if (focusAfter.current) document.getElementById(`phone-${next}`)?.focus()
    focusAfter.current = false
  }

  function go(next: PhoneSection, focus = false) {
    if (next === sectionRef.current || pending.current) return
    focusAfter.current = focus
    if (reducedMotion()) {
      land(next)
      return
    }
    const dir = order.indexOf(next) > order.indexOf(sectionRef.current) ? -1 : 1
    pending.current = next
    setMoving(true)
    setShift(dir * sheetWidth())
  }

  function move(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
    event.preventDefault()
    const index = order.indexOf(section)
    const step = event.key === "ArrowRight" ? 1 : -1
    const next = order[(index + step + order.length) % order.length]
    go(next, true)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (pending.current || swipeTarget(event.target)) return
    if (event.pointerType === "mouse" && event.button !== 0) return
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current
    if (!current || current.id !== event.pointerId) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (!current.axis) {
      if (Math.hypot(dx, dy) < 10) return
      current.axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? "x" : "y"
      if (current.axis === "y") {
        gesture.current = null
        return
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const index = order.indexOf(sectionRef.current)
    let x = dx
    if ((index <= 0 && x > 0) || (index >= order.length - 1 && x < 0)) x *= 0.32
    setMoving(false)
    setShift(x)
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current
    if (!current || current.id !== event.pointerId) return
    gesture.current = null
    if (current.axis !== "x") {
      setShift(0)
      return
    }
    const dx = event.clientX - current.x
    const index = order.indexOf(sectionRef.current)
    const width = sheetWidth()
    const commit = Math.abs(dx) > Math.min(72, width * 0.18)
    const next = commit && dx < 0 && index < order.length - 1
      ? order[index + 1]
      : commit && dx > 0 && index > 0
        ? order[index - 1]
        : null
    if (next && reducedMotion()) {
      land(next)
      return
    }
    if (next) {
      pending.current = next
      setMoving(true)
      setShift(dx < 0 ? -width : width)
      return
    }
    pending.current = null
    setMoving(true)
    setShift(0)
  }

  function onTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") return
    const next = pending.current
    if (!next) return
    land(next)
  }

  useEffect(() => {
    if (!moving || !pending.current) return
    const timer = window.setTimeout(() => {
      if (pending.current) land(pending.current)
    }, 320)
    return () => window.clearTimeout(timer)
  }, [moving, shift])

  return (
    <div className="shell phone">
      <nav aria-label="当天" className="phone-nav" onKeyDown={move} role="tablist">
        {phoneParts.map((item) => {
          const selected = section === item.id
          return (
            <button
              aria-selected={selected}
              id={`phone-${item.id}`}
              key={item.id}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
              onClick={() => go(item.id)}
            >
              {item.label}
            </button>
          )
        })}
        <button
          aria-selected={section === "speak"}
          id="phone-speak"
          role="tab"
          tabIndex={section === "speak" ? 0 : -1}
          type="button"
          onClick={() => go("speak")}
        >
          发言
        </button>
      </nav>
      <main
        ref={mainRef}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className={moving ? "phone-sheet turn" : "phone-sheet"}
          onTransitionEnd={onTransitionEnd}
          style={shift ? { transform: `translate3d(${shift}px, 0, 0)` } : undefined}
        >
          {section === "speak" ? (
            <Speak bare editable />
          ) : (
            <article className="day">
              <CallSheet
                activePart={section}
                compact
                idPrefix="phone-sheet"
                nodes={callNodes}
                parts={phoneParts}
                people={peopleConfirm}
                prep={prepItems}
                showTabs={false}
                storage={{
                  people: "wedding-people-checked",
                  prep: "wedding-prep-checked",
                  tasks: "wedding-open-tasks",
                }}
                tasks={openTasks}
              />
            </article>
          )}
        </div>
      </main>
    </div>
  )
}
