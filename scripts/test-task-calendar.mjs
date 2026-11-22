import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const compiled = await build({ entryPoints: ["lib/task-calendar.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const calendar = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));

test("month grids stay Sunday-first through the year boundary", () => {
  const december = calendar.monthDays("2026-12");
  assert.equal(december.length, 42);
  assert.equal(december[0], "2026-11-29");
  assert.equal(december.at(-1), "2027-01-09");
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

test("the rendered calendar has 42 date cells, date-click controls and a task dialog", async () => {
  const output = path.resolve("outputs/calendar-component-check.mjs");
  await mkdir(path.dirname(output), { recursive: true });
  await build({ entryPoints: ["app/responsibilities.tsx"], bundle: true, outfile: output, format: "esm", platform: "node", packages: "external" });
  const { default: Calendar } = await import(pathToFileURL(output).href);
  const html = renderToStaticMarkup(createElement(Calendar, { apiBase: "", team: [], profile: null, profileReady: false, onChange() {}, onDraftChange() {}, onBusyChange() {} }));
  assert.equal((html.match(/role="cell"/g) || []).length, 42);
  assert.equal((html.match(/class="day-hit-area"/g) || []).length, 42);
  assert.match(html, /Add responsibility on Sunday, November 15, 2026/);
  assert.match(html, /aria-label="Next month"/);
  assert.match(html, /<dialog[^>]+aria-labelledby="task-dialog-title"/);
  assert.equal((html.match(/type="date"/g) || []).length, 2);
  assert.match(html, /disabled="" aria-label="Add responsibility on Sunday, November 1, 2026"/);
});
