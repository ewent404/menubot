import { isAdminPassword } from "./supabaseMenuStore.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!isAdminPassword(request.body?.password)) {
    response.status(401).json({ ok: false, error: "Wrong password" });
    return;
  }

  response.status(200).json({ ok: true });
}
