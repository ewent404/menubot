import { existsSync, readFileSync } from "node:fs";

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

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Add it to .env or your shell environment.`);
    process.exit(1);
  }
  return value;
}

async function callTelegram(token, method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description ?? `${method} failed`);
  return data.result;
}

loadDotEnv();

const token = requireEnv("TELEGRAM_BOT_TOKEN");
const miniAppUrl = requireEnv("MINI_APP_URL").replace(/\/$/, "");
const webhookUrl = `${miniAppUrl}/api/telegram-webhook`;

await callTelegram(token, "setWebhook", {
  url: webhookUrl,
  allowed_updates: ["message"],
});

await callTelegram(token, "setChatMenuButton", {
  menu_button: {
    type: "web_app",
    text: "Open Menu",
    web_app: { url: miniAppUrl },
  },
});

console.log(`Webhook set: ${webhookUrl}`);
console.log(`Mini App menu set: ${miniAppUrl}`);
