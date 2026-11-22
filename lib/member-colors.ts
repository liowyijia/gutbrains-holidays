import type { TeamResponse } from "./calendar";

export const MEMBER_COLORS: Record<string, string> = {
  naama: "#c7add1",
  zach: "#8B9DC3",
  lingyan: "#ba797d",
  claire: "#b6a396",
  caleb: "#c3d17a",
  elizabeth: "#f4e3b5",
  maya: "#f9bac9",
};
const EXTRA_COLORS = ["#a9c9c5", "#edc594", "#a8c7e6", "#c8d5c6", "#d5b9ad", "#bad6d2"];
const firstName = (name: string) => name.normalize("NFKC").trim().toLocaleLowerCase("en-US").split(/\s+/)[0];

export function memberColor(id: string, team: Pick<TeamResponse, "id" | "name">[]): string {
  const member = team.find(person => person.id === id);
  if (!member) return "#b8cbd4";
  const assigned = MEMBER_COLORS[firstName(member.name)];
  if (assigned) return assigned;
  const remaining = team.filter(person => !MEMBER_COLORS[firstName(person.name)]).sort((a, b) => a.id.localeCompare(b.id));
  const index = remaining.findIndex(person => person.id === id);
  return EXTRA_COLORS[index] || `hsl(${Math.round(index * 137.508) % 360} 42% 78%)`;
}
