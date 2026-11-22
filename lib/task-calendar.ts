import { START, END } from "./calendar";

export const CALENDAR_MONTHS = ["2026-11", "2026-12", "2027-01"];

export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function monthDays(month: string): string[] {
  const first = new Date(`${month}-01T12:00:00Z`);
  first.setUTCDate(1 - first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(first.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function selectionRange(anchor: string, end = anchor) {
  const [first, last] = [anchor, end].sort();
  return { start: first < START ? START : first, end: last > END ? END : last };
}

export function inSeason(day: string) {
  return day >= START && day <= END;
}
