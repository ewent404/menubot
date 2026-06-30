import { isAdminPassword, loadAdminMenu, passwordFromRequest, saveAdminMenu } from "./supabaseMenuStore.js";

function authorized(request) {
  return isAdminPassword(passwordFromRequest(request));
}

export default async function handler(request, response) {
  if (!authorized(request)) {
    response.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  if (request.method === "GET") {
    const menu = await loadAdminMenu();
    response.status(200).json({ ok: true, menu });
    return;
  }

  if (request.method === "POST") {
    const menu = await saveAdminMenu(request.body?.menu ?? {});
    response.status(200).json({ ok: true, menu });
    return;
  }

  response.status(405).json({ ok: false, error: "Method not allowed" });
}
