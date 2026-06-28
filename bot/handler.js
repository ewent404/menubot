import { createBotReply, createMenuKeyboard, createMiniAppOrderReply, createOwnerForwardText } from "./messages.js";

function customerNameFrom(message) {
  return [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");
}

function shouldForwardToOwner({ ownerChatId, text, webAppData }) {
  if (!ownerChatId) return false;
  if (webAppData) return true;
  return !text.startsWith("/start") && !text.startsWith("/help") && !text.startsWith("/menu");
}

export async function handleTelegramMessage(message, { miniAppUrl, ownerChatId, sendMessage, orderSendMessage = sendMessage, log = () => {} }) {
  const chatId = message.chat.id;
  const text = message.text ?? "";
  const webAppData = message.web_app_data?.data;
  const reply = createBotReply(text, { webAppData, chatId });
  const customerName = customerNameFrom(message);

  log(`Message from ${customerName || "Telegram user"} (${chatId})`);

  try {
    await sendMessage(chatId, reply, {
      reply_markup: createMenuKeyboard(miniAppUrl),
    });
  } catch (error) {
    log(`Customer reply failed: ${error.message}`);
    return;
  }

  if (shouldForwardToOwner({ ownerChatId, text, webAppData })) {
    try {
      const ownerMessage = webAppData ? createMiniAppOrderReply(webAppData) : text;
      await orderSendMessage(ownerChatId, createOwnerForwardText({ message: ownerMessage, customerName }));
    } catch (error) {
      log(`Owner forward failed: ${error.message}`);
    }
  }
}

export async function handleTelegramUpdate(update, options) {
  if (!update?.message) return;
  await handleTelegramMessage(update.message, options);
}
