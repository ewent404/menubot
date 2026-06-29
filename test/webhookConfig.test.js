import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("webhook can use a separate order bot token for staff alerts", async () => {
  const source = await readFile("api/telegram-webhook.js", "utf8");

  assert.match(source, /ORDER_BOT_TOKEN/);
  assert.match(source, /orderToken/);
  assert.match(source, /orderSendMessage/);
});

test("mini app has a direct order alert endpoint for devices where Telegram sendData fails", async () => {
  const source = await readFile("api/order-alert.js", "utf8");

  assert.match(source, /ORDER_BOT_TOKEN/);
  assert.match(source, /OWNER_CHAT_ID/);
  assert.match(source, /createMiniAppOrderReply/);
  assert.match(source, /sendMessage/);
});
