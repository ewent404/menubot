import test from "node:test";
import assert from "node:assert/strict";

import { createMiniAppOrderData, createOrderText } from "../src/orderLink.js";
import { createBotReply, createMenuKeyboard, createMiniAppOrderReply, resolveOrderPayload } from "../bot/messages.js";

test("order text is readable for customer paste into Telegram", () => {
  const text = createOrderText({
    item: { name: "Brownie Tube" },
    size: { label: "Tube", pieces: "15-20 pcs", diameterCm: 6, heightCm: 16, price: 4.5 },
    quantity: 2,
  });

  assert.match(text, /Hello BigBunny HomeBake/);
  assert.match(text, /Product: Brownie Tube/);
  assert.match(text, /Size: Tube/);
  assert.match(text, /Quantity: 2/);
  assert.match(text, /Total: \$9\.00/);
});

test("bot resolves start order payload into a menu item and size", () => {
  const order = resolveOrderPayload("order_banana-bread_box_2");

  assert.equal(order.item.name, "Choco Chip / Almond Banana Bread");
  assert.equal(order.size.label, "Box");
  assert.equal(order.quantity, 2);
  assert.equal(order.total, 5.5);
});

test("bot replies guide customers to send their order details", () => {
  const startReply = createBotReply("/start order_brownie-tube_tube_1");
  const helpReply = createBotReply("/help");

  assert.match(startReply, /Brownie Tube/);
  assert.match(startReply, /Please send/);
  assert.match(helpReply, /Choose product/);
});

test("mini app order data carries the selected product, size, quantity, and total", () => {
  const data = createMiniAppOrderData({
    item: { id: "red-velvet-cookie", name: "Red Velvet Cookie" },
    size: { label: "6 pcs", pieces: "6 pcs", diameterCm: 16, heightCm: 4, price: 3 },
    quantity: 2,
  });

  assert.deepEqual(JSON.parse(data), {
    type: "order",
    itemId: "red-velvet-cookie",
    itemName: "Red Velvet Cookie",
    sizeLabel: "6 pcs",
    detail: "6 pcs · 16 cm x 4 cm",
    quantity: 2,
    total: 6,
    totalText: "$6.00",
  });
});

test("bot confirms mini app orders to customers without echoing full details", () => {
  const orderData = JSON.stringify({
    type: "order",
    itemName: "Butter Tteok",
    sizeLabel: "6 pieces",
    detail: "6 pcs · 14 cm x 4 cm",
    quantity: 1,
    totalText: "$3.50",
  });

  const reply = createBotReply("", { webAppData: orderData });

  assert.match(reply, /Order sent/);
  assert.doesNotMatch(reply, /Product:/);
  assert.doesNotMatch(reply, /Butter Tteok/);
});

test("bot formats full mini app order details for staff alerts", () => {
  const orderData = JSON.stringify({
    type: "order",
    itemName: "Butter Tteok",
    sizeLabel: "6 pieces",
    detail: "6 pcs · 14 cm x 4 cm",
    quantity: 1,
    totalText: "$3.50",
  });

  const reply = createMiniAppOrderReply(orderData);

  assert.match(reply, /Order received from Mini App/);
  assert.match(reply, /Butter Tteok/);
  assert.match(reply, /\$3\.50/);
});

test("bot menu keyboard opens the mini app when a URL is configured", () => {
  const keyboard = createMenuKeyboard("https://example.com/bigbunny\n");

  assert.equal(keyboard.keyboard[0][0].text, "Open Menu");
  assert.equal(keyboard.keyboard[0][0].web_app.url, "https://example.com/bigbunny");
});

test("bot can show the current chat id for group order setup", () => {
  const reply = createBotReply("/chatid", { chatId: -1001234567890 });

  assert.match(reply, /Chat ID:/);
  assert.match(reply, /-1001234567890/);
  assert.match(reply, /OWNER_CHAT_ID/);
});
