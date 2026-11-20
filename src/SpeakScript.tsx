import type { CSSProperties } from "react"
import { speechBlocks, type SpeechBeat, type SpeechLine } from "./speechData"

function personStyle(tone?: string): CSSProperties | undefined {
  if (!tone) return undefined
  return { "--person": `var(--tone-${tone})` } as CSSProperties
}

function Line({ line }: { line: SpeechLine }) {
  const kind = line.kind ?? "say"
  if (kind === "note") {
    return <p className="speech-note">{line.text}</p>
  }
  if (kind === "slot") {
    return <p className="speech-slot">{line.text}</p>
  }
  return (
    <p className="speech-say">
      {line.who ? (
        <span className="tag" style={personStyle(line.tone)}>
          {line.who}
        </span>
      ) : null}
      <span className="words">{line.text}</span>
    </p>
  )
}

function Beat({ beat }: { beat: SpeechBeat }) {
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
          <Line key={`${beat.id}-${index}`} line={line} />
        ))}
      </div>
    </section>
  )
}

export function Speeches() {
  return (
    <div className="speech">
      {speechBlocks.map((block) => (
        <section className="speech-block" key={block.id}>
          <header className="speech-block-head">
            <h2>{block.title}</h2>
            {block.note ? <p className="speech-block-note">{block.note}</p> : null}
          </header>
          <div className="speech-beats">
            {block.beats.map((beat) => (
              <Beat beat={beat} key={beat.id} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
