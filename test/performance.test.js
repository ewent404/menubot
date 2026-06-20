import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("three js is lazy-loaded instead of included in the initial menu bundle", async () => {
  const source = await readFile("src/main.js", "utf8");

  assert.doesNotMatch(source, /from "three"/);
  assert.doesNotMatch(source, /from "three\/examples\/jsm\/webxr\/ARButton\.js"/);
  assert.match(source, /import\("three"\)/);
});
