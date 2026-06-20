import { handleTelegramUpdate } from "../bot/handler.js";

function telegramApiBase(token) {
  return `https://api.telegram.org/bot${token}`;
}

async function callTelegram(token, method, body = {}) {
  const response = await fetch(`${telegramApiBase(token)}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.description ?? `Telegram ${method} failed`);
  }
  return data.result;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    response.status(500).json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" });
    return;
  }

  try {
    await handleTelegramUpdate(request.body, {
      miniAppUrl: process.env.MINI_APP_URL?.trim(),
      ownerChatId: process.env.OWNER_CHAT_ID?.trim(),
      sendMessage: (chatId, text, options = {}) =>
        callTelegram(token, "sendMessage", {
          chat_id: chatId,
          text,
          ...options,
        }),
    });

    response.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({ ok: false, error: "Webhook failed" });
  }
}
