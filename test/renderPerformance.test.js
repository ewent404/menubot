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

test("item changes keep the current hero photo visible until the next photo is ready", async () => {
  const mainSource = await readFile("src/main.js", "utf8");

  assert.match(mainSource, /function renderPhotoHero\(\)/);
  assert.match(mainSource, /await preloadImage\(photo\.src/);
  assert.match(mainSource, /if \(token !== photoRenderToken\) return;/);
});

test("selected item photos are warmed before rendering item changes", async () => {
  const mainSource = await readFile("src/main.js", "utf8");

  assert.match(mainSource, /function preloadItemPhotos\(itemId/);
  assert.match(mainSource, /preloadItemPhotos\(item\.dataset\.item\);/);
});
