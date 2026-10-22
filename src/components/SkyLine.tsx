import { skyTitle, type DaySky } from '../sky';

/** 总览日期下的一行天气：现象、细线、温度。窄列里现象会截断，完整句子在 title 里。 */
export function SkyLine({ sky }: { sky: DaySky }) {
  return (
    <span className="ov-sky" title={skyTitle(sky)}>
      <span className="ov-sky__mark" aria-hidden="true">
        {sky.emoji}
      </span>
      <span className="ov-sky__text">{sky.text}</span>
      <span className="ov-sky__rule" aria-hidden="true" />
      <span className="ov-sky__temp">
        {sky.temp_min}–{sky.temp_max}°
      </span>
    </span>
  );
}
