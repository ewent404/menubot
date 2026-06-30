import { loadAdminMenu } from "./admin/supabaseMenuStore.js";
import { getFallbackMenu, normalizeMenuData } from "../src/menuRepository.js";

export default async function handler(_request, response) {
  try {
    const adminMenu = await loadAdminMenu();
    response.status(200).json(normalizeMenuData(adminMenu));
  } catch {
    response.status(200).json(getFallbackMenu());
  }
}
