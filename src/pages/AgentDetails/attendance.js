export const dayKey = (value) => new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 10);
export const formatTime = (value) => value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const hours = (seconds) => `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
export function dailyShiftHistory(shifts, now = Date.now()) {
  const groups = new Map();
  for (const shift of shifts) {
    const start = new Date(shift.startedAt).getTime();
    const end = shift.endedAt ? new Date(shift.endedAt).getTime() : now;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    const day = dayKey(start);
    const row = groups.get(day) || { day, startedAt: start, endedAt: end, active: false, count: 0, collectedBinCount: 0, intervals: [] };
    row.startedAt = Math.min(row.startedAt, start);
    row.endedAt = Math.max(row.endedAt, end);
    row.active ||= shift.status === 'active';
    row.count += 1;
    row.collectedBinCount += Number(shift.collectedBinCount || 0);
    row.intervals.push([start, end]);
    groups.set(day, row);
  }
  return [...groups.values()].map(({ intervals, ...row }) => {
    const merged = [];
    for (const interval of intervals.sort((a, b) => a[0] - b[0])) {
      const last = merged.at(-1);
      if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
      else merged.push([...interval]);
    }
    return { ...row, seconds: Math.floor(merged.reduce((sum, [a, b]) => sum + b - a, 0) / 1000) };
  }).sort((a, b) => b.day.localeCompare(a.day));
}
export function attendance(shifts, month, now = Date.now()) {
  const [year, number] = month.split('-').map(Number);
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => {
    const start = Date.UTC(year, number - 1, i + 1) - 330 * 60000;
    const end = Math.min(start + 86400000, now);
    const intervals = shifts.map(s => [Math.max(start, new Date(s.startedAt).getTime()), Math.min(end, s.endedAt ? new Date(s.endedAt).getTime() : now)])
      .filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const interval of intervals) {
      const last = merged.at(-1);
      if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
      else merged.push([...interval]);
    }
    return { day: i + 1, future: start > now, present: intervals.length > 0, seconds: Math.floor(merged.reduce((sum, [a, b]) => sum + b - a, 0) / 1000) };
  });
}
