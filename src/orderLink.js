export const telegramBot = {
  username: "BigbunnyHomeBrakeBot",
};

export function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createOrderPayload({ item, size, quantity }) {
  return ["order", item.id, slug(size.label), quantity].join("_");
}

export function createTelegramOrderLink({ item, size, quantity }) {
  const payload = createOrderPayload({ item, size, quantity });
  return `https://t.me/${telegramBot.username}?start=${encodeURIComponent(payload)}`;
}

function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}

export function formatOrderSize(size) {
  const parts = [];
  if (size.pieces) parts.push(size.pieces);
  if (size.diameterCm && size.heightCm) parts.push(`${size.diameterCm} cm x ${size.heightCm} cm`);
  else if (size.diameterCm) parts.push(`${size.diameterCm} cm wide`);
  else if (size.heightCm) parts.push(`${size.heightCm} cm tall`);
  return parts.join(" · ");
}

export function createOrderText({ item, size, quantity }) {
  const total = size.price * quantity;
  return [
    "Hello BigBunny HomeBake, I want to order:",
    `Product: ${item.name}`,
    `Size: ${size.label}`,
    `Detail: ${formatOrderSize(size)}`,
    `Quantity: ${quantity}`,
    `Total: ${formatMoney(total)}`,
    "",
    "Name:",
    "Pickup/delivery time:",
    "Phone:",
  ].join("\n");
}

export function createMiniAppOrderData({ item, size, quantity }) {
  const total = size.price * quantity;
  return JSON.stringify({
    type: "order",
    itemId: item.id,
    itemName: item.name,
    sizeLabel: size.label,
    detail: formatOrderSize(size),
    quantity,
    total,
    totalText: formatMoney(total),
  });
}
