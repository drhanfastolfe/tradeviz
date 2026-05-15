import type { TimelinePoint } from './types';

export function compressTimeline(timeline: TimelinePoint[]): TimelinePoint[] {
  const byDate = new Map<string, TimelinePoint>();
  for (const point of timeline) byDate.set(point.date, point);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
