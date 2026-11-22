import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const compiled = await build({ entryPoints: ["lib/task-coverage.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const { validateCoverage, helperOn, taskMatchesMember, taskPeopleLabel, uncoveredAwayDays } = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const cover = (profileId, startDate, endDate = startDate) => ({ profileId, startDate, endDate });
const first = cover("lingyan", "2026-12-24", "2026-12-26");
const second = cover("tiago", "2026-12-28", "2026-12-29");
const task = { id: "task", profileId: "claire", title: "Daily Pheno Check", startDate: "2026-12-20", endDate: "2026-12-31", notes: "", revision: 1, updatedAt: "", coverage: [first, second] };
const team = [{ id: "claire", name: "Claire" }, { id: "lingyan", name: "Lingyan" }, { id: "tiago", name: "Tiago" }];

test("calendar labels preserve ownership and show the helper only on inclusive coverage dates", () => {
  assert.equal(taskPeopleLabel(task, team, "2026-12-23"), "Claire");
  assert.equal(taskPeopleLabel(task, team, "2026-12-24"), "Claire > Lingyan");
  assert.equal(taskPeopleLabel(task, team, "2026-12-26"), "Claire > Lingyan");
  assert.equal(taskPeopleLabel(task, team, "2026-12-27"), "Claire");
  assert.equal(taskPeopleLabel(task, team, "2026-12-28"), "Claire > Tiago");
  assert.equal(helperOn(task, "2027-01-01"), undefined);
  assert.equal(taskPeopleLabel({ ...task, coverage: undefined }, team, "2026-12-24"), "Claire");
  assert.equal(taskPeopleLabel(task, team.map(person => person.id === "lingyan" ? { ...person, name: "Lingyan Updated" } : person), "2026-12-24"), "Claire > Lingyan Updated");
});

test("member filters include helpers on their coverage dates and owners throughout the task", () => {
  assert.equal(taskMatchesMember(task, "claire", "2026-12-27"), true);
  assert.equal(taskMatchesMember(task, "lingyan", "2026-12-24"), true);
  assert.equal(taskMatchesMember(task, "lingyan", "2026-12-27"), false);
  assert.equal(taskMatchesMember(task, "lingyan"), true);
  assert.equal(taskMatchesMember(task, "unrelated"), false);
});

test("coverage rejects self-assignment, invalid ranges, task overflow and overlapping inclusive dates", () => {
  for (const value of [null, {}, [cover("claire", "2026-12-24")], [cover("", "2026-12-24")], [cover("lingyan", "2026-12-32")], [cover("lingyan", "2026-12-19")], [cover("lingyan", "2026-12-24", "2027-01-01")], [cover("lingyan", "2026-12-25", "2026-12-24")], [first, cover("tiago", "2026-12-26")]]) {
    assert.equal(validateCoverage(value, "claire", task.startDate, task.endDate), null);
  }
  assert.deepEqual(validateCoverage([], "claire", task.startDate, task.endDate), []);
  assert.deepEqual(validateCoverage([second, first], "claire", task.startDate, task.endDate), [first, second]);
  assert.ok(validateCoverage([first, cover("tiago", "2026-12-27")], "claire", task.startDate, task.endDate));
});

test("outstanding coverage includes only recorded absences inside the task without a helper", () => {
  const schedules = team.map(person => ({ ...person, days: person.id === "claire" ? ["2026-12-19", "2026-12-24", "2026-12-26", "2026-12-27", "2027-01-01"] : [] }));
  assert.deepEqual(uncoveredAwayDays(task, schedules), ["2026-12-27"]);
  assert.deepEqual(uncoveredAwayDays({ ...task, coverage: [] }, schedules), ["2026-12-24", "2026-12-26", "2026-12-27"]);
  assert.deepEqual(uncoveredAwayDays(task, team), []);
  assert.deepEqual(uncoveredAwayDays({ ...task, coverage: [{ ...first, profileId: "" }] }, schedules), ["2026-12-24", "2026-12-26", "2026-12-27"]);
});
