import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const compiled = await build({ entryPoints: ["lib/task-calendar.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const calendar = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));

test("month grids include only weeks that intersect the month, including year boundaries", () => {
  const november = calendar.monthDays("2026-11");
  assert.equal(november.length, 35);
  assert.equal(november[0], "2026-11-01");
  assert.equal(november.at(-1), "2026-12-05");
  assert.equal(november.includes("2026-12-06"), false);
  const february = calendar.monthDays("2026-02");
  assert.equal(february.length, 28);
  assert.equal(february.at(-1), "2026-02-28");
  const december = calendar.monthDays("2026-12");
  assert.equal(december.length, 35);
  assert.equal(december[0], "2026-11-29");
  assert.equal(december.at(-1), "2027-01-02");
  const january = calendar.monthDays("2027-01");
  assert.equal(january[0], "2026-12-27");
  assert.equal(january.at(-1), "2027-02-06");
  assert.equal(new Set(january).size, 42);
});

test("click and reverse-drag ranges preserve inclusive dates across New Year", () => {
  assert.deepEqual(calendar.selectionRange("2026-12-25"), { start: "2026-12-25", end: "2026-12-25" });
  assert.deepEqual(calendar.selectionRange("2027-01-03", "2026-12-29"), { start: "2026-12-29", end: "2027-01-03" });
  assert.deepEqual(calendar.selectionRange("2026-11-01", "2027-02-01"), { start: "2026-11-15", end: "2027-01-10" });
  assert.equal(calendar.inSeason("2026-11-14"), false);
  assert.equal(calendar.inSeason("2026-11-15"), true);
  assert.equal(calendar.inSeason("2027-01-10"), true);
  assert.equal(calendar.inSeason("2027-01-11"), false);
});

test("today uses browser-local dates and member colors remain stable", () => {
  assert.equal(calendar.localDate(new Date(2027, 0, 1, 0, 1)), "2027-01-01");
  assert.equal(calendar.ownerColor("member-one"), calendar.ownerColor("member-one"));
  assert.match(calendar.ownerColor("member-two"), /^(blue|green|purple|rust|teal|rose)$/);
});

test("all seven lab profiles have distinct, stable colors and Naama uses lilac", () => {
  const members = [
    ["Naama", "71db31fc-669d-4830-9391-2005f604a9c8"],
    ["Zach", "f78c1ceb-814a-4582-811c-60733b07360c"],
    ["Lingyan", "3f24ab68-f23c-452a-a9e3-888c3875d84a"],
    ["Claire", "e3a2db14-f030-4482-acaa-f5c48c65f5cf"],
    ["Caleb", "444fd3d3-29e3-4783-89d3-bfccd0348ea0"],
    ["Elizabeth", "52e6ed36-6a99-4a53-bacf-a2a3adce6a62"],
    ["Maya", "ef102be5-636e-4ea7-ac12-57715c35280b"],
  ];
  const colors = members.map(([, id]) => calendar.ownerColor(id));
  assert.equal(new Set(colors).size, members.length);
  assert.equal(calendar.ownerColor(members[0][1]), "purple");
  assert.equal(calendar.ownerColor(members[2][1]), "rust");
  assert.equal(calendar.ownerColor(members[4][1]), "blue");
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /\.event-rust\{[^}]*background:#fae8db[;}]/);
  assert.match(css, /\.event-blue\{[^}]*background:#e1ecf7[;}]/);
  for (const color of colors) assert.ok(css.includes(`.event-${color}{`), `Missing ${color} style`);
});

test("the clean month includes labeled adjacent-month dates and date-click controls", async () => {
  const output = path.resolve("outputs/calendar-component-check.mjs");
  await mkdir(path.dirname(output), { recursive: true });
  await build({ entryPoints: ["app/responsibilities.tsx"], bundle: true, outfile: output, format: "esm", platform: "node", packages: "external" });
  const { default: Calendar } = await import(pathToFileURL(output).href);
  const html = renderToStaticMarkup(createElement(Calendar, { apiBase: "", team: [], profile: null, profileReady: false, onChange() {}, onDraftChange() {}, onBusyChange() {} }));
  assert.equal((html.match(/role="cell"/g) || []).length, 35);
  assert.equal((html.match(/class="day-hit-area"/g) || []).length, 35);
  assert.equal((html.match(/class="day-number adjacent-date /g) || []).length, 5);
  assert.doesNotMatch(html, /Add responsibility on Sunday, December 6, 2026/);
  assert.match(html, /Add responsibility on Tuesday, December 1, 2026/);
  assert.match(html, /class="day-number adjacent-date ">Dec 1<\/span>/);
  assert.doesNotMatch(html, /empty-day|>Today<|>Export tasks CSV</);
  assert.match(html, /id="holiday-calendar-season"/);
  assert.match(html, /Nov 15, 2026/);
  assert.match(html, /Jan 10, 2027/);
  assert.match(html, /Add responsibility on Sunday, November 15, 2026/);
  assert.match(html, /aria-label="Next month"/);
  assert.match(html, /<dialog[^>]+aria-labelledby="task-dialog-title"/);
  assert.equal((html.match(/type="date"/g) || []).length, 2);
  assert.match(html, /disabled="" aria-label="Add responsibility on Sunday, November 1, 2026; outside holiday planning dates" aria-describedby="holiday-calendar-season"/);
});
