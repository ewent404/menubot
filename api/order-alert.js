import { createMiniAppOrderReply, createOwnerForwardText } from "../bot/messages.js";

function telegramApiBase(token) {
  return `https://api.telegram.org/bot${token}`;
}

async function sendMessage(token, chatId, text) {
  const response = await fetch(`${telegramApiBase(token)}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.description ?? "Telegram sendMessage failed");
  }
  return data.result;
}

function customerNameFrom(user) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  if (fullName) return fullName;
  if (user?.username) return `@${user.username}`;
  return "";
}

function orderPayloadFrom(request) {
  const order = request.body?.order;
  if (!order || order.type !== "order") return null;
  return order;
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const orderToken = process.env.ORDER_BOT_TOKEN?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim();
  const ownerChatId = process.env.OWNER_CHAT_ID?.trim();

  if (!orderToken || !ownerChatId) {
    response.status(500).json({ ok: false, error: "Missing order bot configuration" });
    return;
  }

  const order = orderPayloadFrom(request);
  if (!order) {
    response.status(400).json({ ok: false, error: "Invalid order" });
    return;
  }

  try {
    const customerName = customerNameFrom(request.body?.telegramUser);
    const orderText = createMiniAppOrderReply(JSON.stringify(order));
    const alertText = createOwnerForwardText({ message: orderText, customerName });

    await sendMessage(orderToken, ownerChatId, alertText);
    response.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({ ok: false, error: "Order alert failed" });
  }
}
