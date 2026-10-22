import skies from './data/dayWeather.json';

export interface DaySky {
  emoji: string;
  text: string;
  temp_min: number;
  temp_max: number;
}

export function skyFor(date: string): DaySky | null {
  const row = (skies.days as Record<string, DaySky | undefined>)[date];
  if (!row?.emoji || !row.text) return null;
  if (typeof row.temp_min !== 'number' || typeof row.temp_max !== 'number') return null;
  return row;
}

export function skyTitle(sky: DaySky): string {
  return `${sky.text}，${sky.temp_min}–${sky.temp_max}°`;
}
