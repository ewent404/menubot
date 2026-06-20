import { menuItems } from "../src/menuData.js";
import { createOrderText, slug } from "../src/orderLink.js";

function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}

export function resolveOrderPayload(payload) {
  if (!payload?.startsWith("order_")) return null;

  for (const item of menuItems) {
    const itemPrefix = `order_${item.id}_`;
    if (!payload.startsWith(itemPrefix)) continue;

    const remainder = payload.slice(itemPrefix.length);
    const separatorIndex = remainder.lastIndexOf("_");
    if (separatorIndex === -1) return null;

    const sizeSlug = remainder.slice(0, separatorIndex);
    const quantity = Number(remainder.slice(separatorIndex + 1));
    const size = item.sizes.find((candidate) => slug(candidate.label) === sizeSlug);

    if (!size || !Number.isInteger(quantity) || quantity < 1) return null;

    return {
      item,
      size,
      quantity,
      total: size.price * quantity,
    };
  }

  return null;
}

function createMenuHelp() {
  return [
    "Welcome to BigBunny HomeBake.",
    "Tap Open Menu. Choose product, size, and quantity inside Telegram.",
    "You can also send your order here with product name, quantity, pickup or delivery time, and phone number.",
  ].join("\n");
}

export function createMenuKeyboard(miniAppUrl) {
  if (!miniAppUrl) return undefined;

  return {
    keyboard: [
      [
        {
          text: "Open Menu",
          web_app: { url: miniAppUrl },
        },
      ],
    ],
    resize_keyboard: true,
  };
}

export function createMiniAppOrderReply(data) {
  let order;
  try {
    order = JSON.parse(data);
  } catch {
    return "I could not read that order. Please open the menu and try again.";
  }

  if (order?.type !== "order") {
    return "I could not read that order. Please open the menu and try again.";
  }

  return [
    "Order received from Mini App.",
    `Product: ${order.itemName}`,
    `Size: ${order.sizeLabel}`,
    `Detail: ${order.detail}`,
    `Quantity: ${order.quantity}`,
    `Total: ${order.totalText}`,
    "",
    "Please send your name, pickup/delivery time, and phone number to confirm.",
  ].join("\n");
}

export function createBotReply(text = "", { webAppData } = {}) {
  if (webAppData) return createMiniAppOrderReply(webAppData);

  const trimmed = text.trim();

  if (trimmed === "/help" || trimmed === "/menu") {
    return createMenuHelp();
  }

  if (trimmed.startsWith("/start")) {
    const payload = trimmed.replace("/start", "").trim();
    const order = resolveOrderPayload(payload);

    if (!order) return createMenuHelp();

    return [
      "I opened your order.",
      createOrderText(order),
      "",
      `Estimated total: ${formatMoney(order.total)}`,
      "Please send your name, pickup/delivery time, and phone number to confirm.",
    ].join("\n");
  }

  return [
    "Thank you. We received your message.",
    "Please make sure your order includes product, quantity, pickup/delivery time, and phone number.",
  ].join("\n");
}

export function createOwnerForwardText({ message, customerName }) {
  return [
    "New BigBunny order message",
    customerName ? `Customer: ${customerName}` : "Customer: Telegram user",
    "",
    message,
  ].join("\n");
}
