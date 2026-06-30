import { getFallbackMenu } from "../../src/menuRepository.js";

let memoryMenu;

function fallbackAdminMenu() {
  const fallback = getFallbackMenu();
  return {
    categories: fallback.categories.map((category, index) => ({
      ...category,
      sortOrder: index + 1,
      isActive: true,
    })),
    products: fallback.menuItems.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
      isActive: true,
    })),
  };
}

export function isAdminPassword(value) {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  return Boolean(expected && value === expected);
}

export function passwordFromRequest(request) {
  const header = request.headers?.authorization ?? request.headers?.Authorization ?? "";
  if (header.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return request.body?.password ?? "";
}

export async function loadAdminMenu() {
  return memoryMenu ?? fallbackAdminMenu();
}

export async function saveAdminMenu(menu) {
  memoryMenu = {
    categories: Array.isArray(menu.categories) ? menu.categories : [],
    products: Array.isArray(menu.products) ? menu.products : [],
  };
  return memoryMenu;
}
