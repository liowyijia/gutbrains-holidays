import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const compiled = await build({ entryPoints: ["lib/member-colors.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const { memberColor } = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const expected = { Naama: "#c7add1", Zach: "#8B9DC3", Lingyan: "#ba797d", Claire: "#b6a396", Caleb: "#c3d17a", Elizabeth: "#f4e3b5", Maya: "#f9bac9" };
const team = Object.keys(expected).map(name => ({ id: name.toLowerCase(), name }));

test("the seven members receive their exact requested colors, including full-name profiles", () => {
  for (const [name, color] of Object.entries(expected)) {
    assert.equal(memberColor(name.toLowerCase(), team), color);
    assert.equal(memberColor("profile", [{ id: "profile", name: `  ${name.toUpperCase()} Surname  ` }]), color);
  }
});

test("other members receive different fallback colors without changing the requested colors", () => {
  const expanded = [...team, { id: "other-a", name: "Tiago" }, { id: "other-b", name: "Yi Jia" }, { id: "other-c", name: "Another member" }];
  const colors = expanded.map(person => memberColor(person.id, expanded));
  assert.equal(new Set(colors).size, expanded.length);
  assert.equal(memberColor("claire", expanded), "#b6a396");
  assert.equal(memberColor("other-a", expanded), memberColor("other-a", [...expanded].reverse()));
});

test("dark text remains readable against all requested card backgrounds", () => {
  const luminance = hex => {
    const rgb = hex.replace("#", "").match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const color of Object.values(expected)) assert.ok((luminance(color) + 0.05) / (luminance("#171717") + 0.05) >= 4.5, color);
});
