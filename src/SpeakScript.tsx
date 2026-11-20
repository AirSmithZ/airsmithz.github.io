import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from "react"
import { speechBlocks, type SpeechBeat, type SpeechLine } from "./speechData"

const STORAGE_KEY = "wedding-speech-edits"

type SpeechEdits = Record<string, string>

function personStyle(tone?: string): CSSProperties | undefined {
  if (!tone) return undefined
  return { "--person": `var(--tone-${tone})` } as CSSProperties
}

function lineKey(beatId: string, index: number) {
  return `${beatId}:${index}`
}

function readEdits(): SpeechEdits {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    const next: SpeechEdits = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") next[key] = value
    }
    return next
  } catch {
    return {}
  }
}

function writeEdits(edits: SpeechEdits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits))
  } catch {
    /* 写不进就先留在内存里 */
  }
}

function resolveLine(line: SpeechLine, beatId: string, index: number, edits: SpeechEdits): SpeechLine {
  const stored = edits[lineKey(beatId, index)]
  if (stored === undefined) return line
  return { ...line, text: stored }
}

function fitTextarea(node: HTMLTextAreaElement | null) {
  if (!node) return
  node.style.height = "auto"
  node.style.height = `${node.scrollHeight}px`
}

function EditableWords({
  className,
  value,
  editable,
  onCommit,
}: {
  className: string
  value: string
  editable: boolean
  onCommit: (next: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useLayoutEffect(() => {
    if (editable) fitTextarea(ref.current)
  }, [editable, draft])

  if (!editable) {
    return <span className={className}>{value}</span>
  }

  function commit() {
    const next = draft.replace(/\s+$/u, "")
    if (next !== value) onCommit(next)
    else if (draft !== value) setDraft(value)
  }

  function onChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value)
    fitTextarea(event.target)
  }

  return (
    <textarea
      aria-label="编辑发言"
      className={`${className} speech-edit`}
      onBlur={commit}
      onChange={onChange}
      ref={ref}
      rows={1}
      spellCheck={false}
      value={draft}
    />
  )
}

function Line({
  beatId,
  editable,
  index,
  line,
  onEdit,
}: {
  beatId: string
  editable: boolean
  index: number
  line: SpeechLine
  onEdit: (beatId: string, index: number, text: string) => void
}) {
  const kind = line.kind ?? "say"
  const words = (
    <EditableWords
      className={kind === "say" ? "words" : kind === "note" ? "speech-note-text" : "speech-slot-text"}
      editable={editable}
      onCommit={(text) => onEdit(beatId, index, text)}
      value={line.text}
    />
  )

  if (kind === "note") {
    return <p className="speech-note">{words}</p>
  }
  if (kind === "slot") {
    return <p className="speech-slot">{words}</p>
  }
  return (
    <p className="speech-say">
      {line.who ? (
        <span className="tag" style={personStyle(line.tone)}>
          {line.who}
        </span>
      ) : null}
      {words}
    </p>
  )
}

function Beat({
  beat,
  editable,
  onEdit,
}: {
  beat: SpeechBeat
  editable: boolean
  onEdit: (beatId: string, index: number, text: string) => void
}) {
  return (
    <section className="speech-beat">
      <header className="speech-meta">
        {beat.time ? <time dateTime={beat.time}>{beat.time}</time> : <span className="speech-time-gap" />}
        <div className="speech-who">
          {beat.who ? (
            <span className="tag" style={personStyle(beat.tone)}>
              {beat.who}
            </span>
          ) : null}
          {beat.hint ? <span className="speech-hint">{beat.hint}</span> : null}
        </div>
      </header>
      <div className="speech-body">
        {beat.lines.map((line, index) => (
          <Line
            beatId={beat.id}
            editable={editable}
            index={index}
            key={`${beat.id}-${index}`}
            line={line}
            onEdit={onEdit}
          />
        ))}
      </div>
    </section>
  )
}

export function Speeches({ editable = false }: { editable?: boolean }) {
  const [edits, setEdits] = useState<SpeechEdits>(() => (editable ? readEdits() : {}))

  useEffect(() => {
    if (!editable) return
    setEdits(readEdits())
  }, [editable])

  function onEdit(beatId: string, index: number, text: string) {
    const key = lineKey(beatId, index)
    setEdits((current) => {
      const baseline = speechBlocks
        .flatMap((block) => block.beats)
        .find((beat) => beat.id === beatId)
        ?.lines[index]?.text
      const next = { ...current }
      if (baseline !== undefined && text === baseline) delete next[key]
      else next[key] = text
      writeEdits(next)
      return next
    })
  }

  return (
    <div className={editable ? "speech speech-editable" : "speech"}>
      {speechBlocks.map((block) => (
        <section className="speech-block" key={block.id}>
          <header className="speech-block-head">
            <h2>{block.title}</h2>
            {block.note ? <p className="speech-block-note">{block.note}</p> : null}
          </header>
          <div className="speech-beats">
            {block.beats.map((beat) => (
              <Beat
                beat={{
                  ...beat,
                  lines: beat.lines.map((line, index) => resolveLine(line, beat.id, index, edits)),
                }}
                editable={editable}
                key={beat.id}
                onEdit={onEdit}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
