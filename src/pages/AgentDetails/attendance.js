
const IST_OFFSET = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const dayKey = (value) => {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) return "";

  return new Date(timestamp + IST_OFFSET).toISOString().slice(0, 10);
};

export const formatTime = (value) => {
  if (!value) return "—";

  const timestamp = new Date(value);

  if (!Number.isFinite(timestamp.getTime())) return "—";

  return timestamp.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const hours = (seconds = 0) => {
  const safeSeconds = Number.isFinite(Number(seconds))
    ? Math.max(0, Number(seconds))
    : 0;

  return `${Math.floor(safeSeconds / 3600)}h ${Math.floor(
    (safeSeconds % 3600) / 60
  )}m`;
};

function getValidShifts(shifts = [], now = Date.now()) {
  if (!Array.isArray(shifts)) return [];

  return shifts
    .map((shift) => {
      const start = new Date(shift.startedAt).getTime();
      const end = shift.endedAt
        ? new Date(shift.endedAt).getTime()
        : now;

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start > now ||
        end < start
      ) {
        return null;
      }

      return {
        ...shift,
        _start: start,
        _end: Math.min(end, now),
      };
    })
    .filter(Boolean);
}

function mergeIntervals(intervals) {
  const sorted = intervals
    .filter(
      ([start, end]) =>
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        end > start
    )
    .sort((a, b) => a[0] - b[0]);

  const merged = [];

  for (const interval of sorted) {
    const last = merged[merged.length - 1];

    if (last && interval[0] <= last[1]) {
      last[1] = Math.max(last[1], interval[1]);
    } else {
      merged.push([...interval]);
    }
  }

  return merged;
}

function totalSeconds(intervals) {
  return Math.floor(
    intervals.reduce((total, [start, end]) => total + end - start, 0) /
      1000
  );
}

export function attendance(shifts = [], month, now = Date.now()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) {
    return [];
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(
    Date.UTC(year, monthNumber, 0)
  ).getUTCDate();

  const validShifts = getValidShifts(shifts, now);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const start =
      Date.UTC(year, monthNumber - 1, index + 1) - IST_OFFSET;

    const end = Math.min(start + DAY_MS, now);

    const intervals = validShifts
      .map((shift) => [
        Math.max(start, shift._start),
        Math.min(end, shift._end),
      ])
      .filter(([a, b]) => b > a);

    const merged = mergeIntervals(intervals);

    return {
      day: index + 1,
      date: new Date(start + IST_OFFSET).toISOString().slice(0, 10),
      future: start > now,
      present: merged.length > 0,
      seconds: totalSeconds(merged),
    };
  });
}

export function dailyShiftHistory(shifts = [], now = Date.now()) {
  const validShifts = getValidShifts(shifts, now);
  const groups = new Map();

  for (const shift of validShifts) {
    const day = dayKey(shift._start);

    if (!day) continue;

    const row = groups.get(day) || {
      day,
      startedAt: shift._start,
      endedAt: shift._end,
      active: false,
      count: 0,
      collectedBinCount: 0,
      intervals: [],
    };

    row.startedAt = Math.min(row.startedAt, shift._start);
    row.endedAt = Math.max(row.endedAt, shift._end);
    row.active ||= shift.status === "active" && !shift.endedAt;
    row.count += 1;
    row.collectedBinCount += Number(shift.collectedBinCount || 0);
    row.intervals.push([shift._start, shift._end]);

    groups.set(day, row);
  }

  return [...groups.values()]
    .map(({ intervals, ...row }) => {
      const merged = mergeIntervals(intervals);

      return {
        ...row,
        seconds: totalSeconds(merged),
      };
    })
    .sort((a, b) => b.day.localeCompare(a.day));
}
