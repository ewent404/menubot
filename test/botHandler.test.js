import test from "node:test";
import assert from "node:assert/strict";

import { handleTelegramUpdate } from "../bot/handler.js";

test("telegram handler replies with mini app keyboard on start", async () => {
  const sent = [];

  await handleTelegramUpdate(
    {
      message: {
        chat: { id: 101 },
        from: { first_name: "Customer" },
        text: "/start",
      },
    },
    {
      miniAppUrl: "https://bigbunny.example",
      ownerChatId: "999",
      sendMessage: async (chatId, text, options) => sent.push({ chatId, text, options }),
    },
  );

  assert.equal(sent.length, 1);
  assert.equal(sent[0].chatId, 101);
  assert.match(sent[0].text, /Welcome to BigBunny/);
  assert.equal(sent[0].options.reply_markup.keyboard[0][0].web_app.url, "https://bigbunny.example");
});

test("telegram handler forwards mini app orders to the owner chat", async () => {
  const sent = [];
  const miniAppOrder = JSON.stringify({
    type: "order",
    itemName: "Brownie Tube",
    sizeLabel: "Tube",
    detail: "15-20 pcs · 6 cm x 16 cm",
    quantity: 2,
    totalText: "$9.00",
  });

  await handleTelegramUpdate(
    {
      message: {
        chat: { id: 202 },
        from: { first_name: "Sophea" },
        web_app_data: { data: miniAppOrder },
      },
    },
    {
      miniAppUrl: "https://bigbunny.example",
      ownerChatId: "999",
      sendMessage: async (chatId, text, options) => sent.push({ chatId, text, options }),
    },
  );

  assert.equal(sent.length, 2);
  assert.equal(sent[0].chatId, 202);
  assert.match(sent[0].text, /Order received from Mini App/);
  assert.equal(sent[1].chatId, "999");
  assert.match(sent[1].text, /Customer: Sophea/);
  assert.match(sent[1].text, /Brownie Tube/);
});
