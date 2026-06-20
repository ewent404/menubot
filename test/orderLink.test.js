import test from "node:test";
import assert from "node:assert/strict";

import { createOrderPayload, createTelegramOrderLink, telegramBot } from "../src/orderLink.js";

test("telegram order link opens the BigBunny bot with a compact order payload", () => {
  const item = {
    id: "banana-bread",
    name: "Choco Chip / Almond Banana Bread",
  };
  const size = {
    label: "Box",
    diameterCm: 12,
    heightCm: 5,
  };

  const payload = createOrderPayload({ item, size, quantity: 2 });
  const link = createTelegramOrderLink({ item, size, quantity: 2 });

  assert.equal(telegramBot.username, "BigbunnyHomeBrakeBot");
  assert.equal(payload, "order_banana-bread_box_2");
  assert.equal(link, "https://t.me/BigbunnyHomeBrakeBot?start=order_banana-bread_box_2");
});

test("telegram order link never exposes a bot token", () => {
  const link = createTelegramOrderLink({
    item: { id: "brownie-tube", name: "Brownie Tube" },
    size: { label: "Tube", diameterCm: 6, heightCm: 16 },
    quantity: 1,
  });

  assert.doesNotMatch(link, /token/i);
  assert.doesNotMatch(link, /\d{8,}:[\w-]+/);
});
