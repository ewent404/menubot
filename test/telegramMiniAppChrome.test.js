import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { isTelegramMiniApp } from "../src/telegramMiniApp.js";

test("telegram mini app is detected even when init data is empty", () => {
  assert.equal(
    isTelegramMiniApp({
      Telegram: {
        WebApp: {
          initData: "",
          platform: "ios",
          version: "8.0",
        },
      },
    }),
    true,
  );
});

test("telegram mini app hides duplicate local header controls", async () => {
  const mainSource = await readFile("src/main.js", "utf8");
  const cssSource = await readFile("src/styles.css", "utf8");

  assert.match(mainSource, /telegram-mini-app/);
  assert.match(mainSource, /isTelegramMiniApp\(\) \? "telegram-mini-app" : ""/);
  assert.match(cssSource, /\.telegram-mini-app \.link-button/);
  assert.match(cssSource, /\.telegram-mini-app \.round-button/);
});

test("telegram mini app order returns the customer to chat", async () => {
  const mainSource = await readFile("src/main.js", "utf8");

  assert.match(mainSource, /miniApp\.sendData\(miniAppOrder\)/);
  assert.match(mainSource, /miniApp\.close\?\.\(\)/);
});
