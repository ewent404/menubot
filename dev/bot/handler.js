import { createBotReply, createMenuKeyboard, createOwnerForwardText } from "./messages.js";

function customerNameFrom(message) {
  return [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");
}

function shouldForwardToOwner({ ownerChatId, text, webAppData }) {
  if (!ownerChatId) return false;
  if (webAppData) return true;
  return !text.startsWith("/start") && !text.startsWith("/help") && !text.startsWith("/menu");
}

export async function handleTelegramMessage(message, { miniAppUrl, ownerChatId, sendMessage, log = () => {} }) {
  const chatId = message.chat.id;
  const text = message.text ?? "";
  const webAppData = message.web_app_data?.data;
  const reply = createBotReply(text, { webAppData });
  const customerName = customerNameFrom(message);

  log(`Message from ${customerName || "Telegram user"} (${chatId})`);

  await sendMessage(chatId, reply, {
    reply_markup: createMenuKeyboard(miniAppUrl),
  });

  if (shouldForwardToOwner({ ownerChatId, text, webAppData })) {
    await sendMessage(ownerChatId, createOwnerForwardText({ message: webAppData ? reply : text, customerName }));
  }
}

export async function handleTelegramUpdate(update, options) {
  if (!update?.message) return;
  await handleTelegramMessage(update.message, options);
}
