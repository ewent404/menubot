import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("quantity changes update checkout without rebuilding product photos", async () => {
  const mainSource = await readFile("src/main.js", "utf8");

  assert.match(mainSource, /function renderCheckout\(\)/);
  assert.match(mainSource, /if \(qty\) \{\s*setState\(\{ quantity: Math\.max\(1, state\.quantity \+ Number\(qty\.dataset\.qty\)\) }, \{ renderMode: "checkout" }\);/);
});

test("product photos are preloaded after initial render", async () => {
  const mainSource = await readFile("src/main.js", "utf8");

  assert.match(mainSource, /function preloadProductPhotos\(\)/);
  assert.match(mainSource, /preloadProductPhotos\(\);/);
});
