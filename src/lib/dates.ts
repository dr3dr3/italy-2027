const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parse(d: string): { day: number; month: number; year: number } {
  // Expect YYYY-MM-DD from pg `date` columns.
  const [y, m, day] = d.split("-").map(Number);
  return { day, month: m - 1, year: y };
}

/**
 * Relative time for recent activity (comments, suggestions).
 * < 1m: "just now"
 * < 1h: "Nm ago"
 * < 24h: "Nh ago"
 * yesterday: "yesterday"
 * < 7 days: "N days ago"
 * ≥ 7 days: absolute "12 May"
 *
 * Computed from a Date; the caller owns the now-reference (usually `new Date()`).
 */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "just now"; // future-dated — not expected; treat as now

  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (diffMs < min) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / min)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;

  // Calendar-day-aware check for "yesterday" — not "24–48 hours ago".
  const midnightToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const msSinceMidnight = now.getTime() - midnightToday.getTime();
  if (diffMs - msSinceMidnight < day) return "yesterday";

  const days = Math.floor(diffMs / day);
  if (days < 7) return `${days} days ago`;

  // ≥ 7 days: fall back to absolute.
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return formatDay(iso);
}

export function formatDay(d: string): string {
  const { day, month } = parse(d);
  return `${day} ${MONTHS[month]}`;
}

/**
 * Days between now and a YYYY-MM-DD date, rounded up. Returns null when the
 * date has already passed — callers use this to hide countdown chrome.
 */
export function daysUntil(dateStr: string): number | null {
  const { day, month, year } = parse(dateStr);
  const targetMs = Date.UTC(year, month, day);
  const diff = Math.ceil((targetMs - Date.now()) / 86_400_000);
  return diff > 0 ? diff : null;
}

/**
 * Format a stay range, omitting the year.
 * Same day: "14 May"
 * Same month: "14–18 May"
 * Crosses months: "30 Apr – 2 May"
 */
export function formatRange(arrive: string, depart: string): string {
  const a = parse(arrive);
  const d = parse(depart);
  if (a.day === d.day && a.month === d.month) {
    return `${a.day} ${MONTHS[a.month]}`;
  }
  if (a.month === d.month) {
    return `${a.day}–${d.day} ${MONTHS[a.month]}`;
  }
  return `${a.day} ${MONTHS[a.month]} – ${d.day} ${MONTHS[d.month]}`;
}
