import { isAdminPassword, loadAdminMenu, passwordFromRequest, saveAdminMenu } from "./supabaseMenuStore.js";

function authorized(request) {
  return isAdminPassword(passwordFromRequest(request));
}

function storageError(response) {
  response.status(500).json({
    ok: false,
    error: "Supabase menu storage is not ready. Run docs/supabase-admin-schema.sql in Supabase SQL Editor, then try again.",
  });
}

export default async function handler(request, response) {
  if (!authorized(request)) {
    response.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  if (request.method === "GET") {
    try {
      const menu = await loadAdminMenu();
      response.status(200).json({ ok: true, menu });
    } catch {
      storageError(response);
    }
    return;
  }

  if (request.method === "POST") {
    try {
      const menu = await saveAdminMenu(request.body?.menu ?? {});
      response.status(200).json({ ok: true, menu });
    } catch {
      storageError(response);
    }
    return;
  }

  response.status(405).json({ ok: false, error: "Method not allowed" });
}
