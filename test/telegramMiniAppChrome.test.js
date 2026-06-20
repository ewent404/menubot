import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("telegram mini app hides duplicate local header controls", async () => {
  const mainSource = await readFile("src/main.js", "utf8");
  const cssSource = await readFile("src/styles.css", "utf8");

  assert.match(mainSource, /telegram-mini-app/);
  assert.match(mainSource, /isTelegramMiniApp\(\) \? "telegram-mini-app" : ""/);
  assert.match(cssSource, /\.telegram-mini-app \.link-button/);
  assert.match(cssSource, /\.telegram-mini-app \.round-button/);
});
