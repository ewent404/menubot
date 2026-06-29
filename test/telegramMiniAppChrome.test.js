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

test("telegram mini app order posts directly to the server before returning to chat", async () => {
  const mainSource = await readFile("src/main.js", "utf8");

  assert.match(mainSource, /fetch\("\/api\/order-alert"/);
  assert.match(mainSource, /method: "POST"/);
  assert.match(mainSource, /collectOrderDetails/);
  assert.match(mainSource, /telegramUser: miniApp\?\.initDataUnsafe\?\.user/);
  assert.match(mainSource, /window\.setTimeout\(\(\) => miniApp\.close\?\.\(\), 650\)/);
  assert.doesNotMatch(mainSource, /showAlert/);
});

test("telegram mini app collects fulfillment and payment details before sending", async () => {
  const mainSource = await readFile("src/main.js", "utf8");
  const cssSource = await readFile("src/styles.css", "utf8");

  assert.match(mainSource, /Customer details/);
  assert.match(mainSource, /name="phone"/);
  assert.match(mainSource, /name="fulfillment"/);
  assert.match(mainSource, /name="paymentMethod"/);
  assert.match(mainSource, /name="location"/);
  assert.match(mainSource, /Delivery location is required/);
  assert.match(cssSource, /\.order-details/);
});
