import { useEffect, useRef } from 'react';
import { skyFor, skyTitle } from '../sky';
import type { DayPlan } from '../types';

/** 日期条上只留三个字。更长的现象留在按钮的名字里。 */
function chipText(text: string): string {
  if (text.length <= 3) return text;
  if (text.includes('雷')) return '雷雨';
  if (text.includes('雪')) return '有雪';
  if (text.includes('沙') || text.includes('尘')) return '沙尘';
  if (text.includes('雾') || text.includes('霾')) return '有雾';
  if (text.includes('雨')) return '有雨';
  if (text.includes('阴') || text.includes('云')) return '多云';
  return text.slice(0, 2);
}

interface DayStripProps {
  days: DayPlan[];
  dayIndex: number;
  locked: boolean;
  onPick: (index: number) => void;
}

export function DayStrip({ days, dayIndex, locked, onPick }: DayStripProps) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = scroller.current;
    const current = box?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!box || !current) return;
    const left = current.offsetLeft - box.clientWidth / 2 + current.clientWidth / 2;
    box.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [dayIndex]);

  return (
    <div className="day-strip" ref={scroller} role="tablist" aria-label="日期">
      {days.map((day, index) => {
        const on = index === dayIndex;
        const sky = skyFor(day.date);
        const label = [
          `D${day.day_index}`,
          `${day.date.slice(5)} ${day.weekday}`,
          day.region,
          sky ? skyTitle(sky) : '',
        ]
          .filter(Boolean)
          .join('，');
        return (
          <button
            key={day.date}
            type="button"
            role="tab"
            className={`day-chip${on ? ' is-on' : ''}${sky ? ' has-wx' : ''}`}
            aria-selected={on}
            aria-label={label}
            title={sky ? skyTitle(sky) : undefined}
            disabled={locked && !on}
            onClick={() => onPick(index)}
          >
            <span className="day-kicker">
              <b>D{day.day_index}</b>
              {sky ? (
                <span className="day-wx">
                  <span className="day-wx__mark" aria-hidden="true">
                    {sky.emoji}
                  </span>
                  <span className="day-wx__text">{chipText(sky.text)}</span>
                  <span className="day-wx__temp">
                    {sky.temp_min}–{sky.temp_max}°
                  </span>
                </span>
              ) : null}
            </span>
            <span className="day-date">
              {day.date.slice(5)}
              <i>{day.weekday}</i>
            </span>
            {day.region ? <small className="day-place">{day.region}</small> : null}
          </button>
        );
      })}
    </div>
  );
}
