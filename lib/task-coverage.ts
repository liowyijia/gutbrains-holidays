import { DAYS, type TaskCoverage, type Responsibility, type TeamResponse } from "./calendar";

const daySet = new Set(DAYS);

export function validateCoverage(value: unknown, ownerId: string, start: string, end: string): TaskCoverage[] | null {
  if (!Array.isArray(value) || value.length > DAYS.length) return null;
  const result: TaskCoverage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { profileId, startDate, endDate } = item;
    if (typeof profileId !== "string" || !profileId || profileId.length > 100 || profileId === ownerId || typeof startDate !== "string" || typeof endDate !== "string" || !daySet.has(startDate) || !daySet.has(endDate) || startDate < start || endDate > end || startDate > endDate) return null;
    result.push({ profileId, startDate, endDate });
  }
  result.sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (result.some((item, index) => index > 0 && item.startDate <= result[index - 1].endDate)) return null;
  return result;
}

export function helperOn(task: Pick<Responsibility, "startDate" | "endDate" | "coverage">, day: string) {
  if (day < task.startDate || day > task.endDate) return undefined;
  return task.coverage?.find(entry => !!entry.profileId && day >= entry.startDate && day <= entry.endDate);
}

export function taskMatchesMember(task: Responsibility, member: string, day?: string) {
  if (!member || task.profileId === member) return true;
  return (task.coverage || []).some(entry => entry.profileId === member && (!day || day >= entry.startDate && day <= entry.endDate));
}

export function taskPeopleLabel(task: Responsibility, team: TeamResponse[], day: string) {
  const name = (id: string) => team.find(person => person.id === id)?.name || "Team member";
  const helper = helperOn(task, day);
  return helper ? `${name(task.profileId)} > ${name(helper.profileId)}` : name(task.profileId);
}

export function uncoveredAwayDays(task: Pick<Responsibility, "profileId" | "startDate" | "endDate" | "coverage">, team: TeamResponse[]) {
  const owner = team.find(person => person.id === task.profileId);
  return (owner?.days || []).filter(day => day >= task.startDate && day <= task.endDate && !helperOn(task, day)).sort();
}
