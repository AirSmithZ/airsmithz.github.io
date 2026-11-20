import { useEffect, useState } from "react"
import { Bar } from "./charts/bar"
import { BarChart } from "./charts/bar-chart"
import { BarYAxis } from "./charts/bar-y-axis"
import { Grid } from "./charts/grid"
import { ChartTooltip } from "./charts/tooltip/chart-tooltip"

function useNarrow() {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)")
    const apply = () => setNarrow(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])
  return narrow
}

type Row = Record<string, unknown>

export function HBar({
  data,
  dataKey,
  unit,
  ratio = "6 / 5",
}: {
  data: Row[]
  dataKey: string
  unit: string
  ratio?: string
}) {
  const narrow = useNarrow()
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  return (
    <div className="chart-host">
      <BarChart
        animationDuration={reduced ? 0 : 700}
        aspectRatio={narrow ? "3 / 4" : ratio}
        barGap={0.28}
        data={data}
        margin={{ top: 12, right: narrow ? 16 : 28, bottom: 8, left: narrow ? 78 : 112 }}
        orientation="horizontal"
        xDataKey="name"
      >
        <Grid horizontal={false} vertical />
        <Bar dataKey={dataKey} lineCap="round" />
        <BarYAxis />
        <ChartTooltip
          rows={(point) => [
            {
              color: "var(--chart-line-primary)",
              label: String(point.name ?? ""),
              value: `${Number(point[dataKey] ?? 0).toLocaleString("zh-CN")}${unit}`,
            },
          ]}
          showDatePill={false}
          showDots={false}
        />
      </BarChart>
    </div>
  )
}
