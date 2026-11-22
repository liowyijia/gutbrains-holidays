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

// Assign the current team by stable profile ID so names and task counts cannot change colors.
const TEAM_COLORS: Record<string, string> = {
  "71db31fc-669d-4830-9391-2005f604a9c8": "purple", // Naama: lilac
  "f78c1ceb-814a-4582-811c-60733b07360c": "blue", // Zach
  "3f24ab68-f23c-452a-a9e3-888c3875d84a": "ochre", // Lingyan: crisp ochre yellow
  "e3a2db14-f030-4482-acaa-f5c48c65f5cf": "rose", // Claire
  "444fd3d3-29e3-4783-89d3-bfccd0348ea0": "sand", // Caleb: #ccc8b1
  "52e6ed36-6a99-4a53-bacf-a2a3adce6a62": "green", // Elizabeth
  "ef102be5-636e-4ea7-ac12-57715c35280b": "gold", // Maya
};

export function ownerColor(id: string) {
  if (Object.hasOwn(TEAM_COLORS, id)) return TEAM_COLORS[id];
  const colors = ["blue", "green", "purple", "rust", "teal", "rose"];
  const hash = [...id].reduce((sum, character) => sum * 31 + character.charCodeAt(0) | 0, 0);
  return colors[Math.abs(hash) % colors.length];
}
