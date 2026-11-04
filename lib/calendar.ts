export const START = "2026-11-15";
export const END = "2027-01-10";
export type TeamResponse = { id: string; name: string; days: string[]; revision: number; updatedAt: string };
export type EditIdentity = { id: string; token: string };

const dayCount = Math.round((Date.parse(END + "T12:00:00Z") - Date.parse(START + "T12:00:00Z")) / 86400000) + 1;
export const DAYS = Array.from({ length: dayCount }, (_, n) => {
  const date = new Date(START + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
});
export function readable(date: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}
export function weekend(date: string) {
  const day = new Date(date + "T12:00:00Z").getUTCDay();
  return day === 0 || day === 6;
}
export function ranges(days: string[]) {
  const sorted = [...days].sort();
  const grouped: { start: string; end: string }[] = [];
  for (const day of sorted) {
    const last = grouped.at(-1);
    if (last && new Date(day + "T12:00:00Z").getTime() - new Date(last.end + "T12:00:00Z").getTime() === 86400000) last.end = day;
    else grouped.push({ start: day, end: day });
  }
  return grouped.map(({ start, end }) => start === end ? readable(start) : `${readable(start)} – ${readable(end)}`);
}
