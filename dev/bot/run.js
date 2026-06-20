import { existsSync, readFileSync } from "node:fs";

import { handleTelegramUpdate } from "./handler.js";

function loadDotEnv() {
  if (!existsSync(".env")) return;

  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
const ownerChatId = process.env.OWNER_CHAT_ID;
const miniAppUrl = process.env.MINI_APP_URL;

if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN. Create dev/.env from dev/.env.example first.");
  process.exit(1);
}

const apiBase = `https://api.telegram.org/bot${token}`;
let offset = 0;

async function callTelegram(method, body = {}) {
  const response = await fetch(`${apiBase}/${method}`, {
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

async function sendMessage(chatId, text, options = {}) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    ...options,
  });
}

async function configureMiniAppMenu() {
  if (!miniAppUrl) return;

  await callTelegram("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Open Menu",
      web_app: { url: miniAppUrl },
    },
  });
  console.log(`Mini App menu button configured: ${miniAppUrl}`);
}

async function poll() {
  try {
    const updates = await callTelegram("getUpdates", {
      offset,
      timeout: 25,
      allowed_updates: ["message"],
    });

    for (const update of updates) {
      offset = update.update_id + 1;
      await handleTelegramUpdate(update, {
        miniAppUrl,
        ownerChatId,
        sendMessage,
        log: console.log,
      });
    }
  } catch (error) {
    console.error(error.message);
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }

  poll();
}

console.log("BigBunny bot is running. Press Ctrl+C to stop.");
configureMiniAppMenu()
  .catch((error) => console.error(`Mini App menu setup skipped: ${error.message}`))
  .finally(() => poll());
