import test from "node:test";
import assert from "node:assert/strict";
import { isAdminRoute, verifyAdminPassword } from "../src/adminApp.js";

test("admin route is detected from /admin", () => {
  assert.equal(isAdminRoute("/admin"), true);
  assert.equal(isAdminRoute("/admin/"), true);
  assert.equal(isAdminRoute("/"), false);
});

test("admin password verification accepts only successful login response", async () => {
  const ok = await verifyAdminPassword("secret", async (url, options) => {
    assert.equal(url, "/api/admin/login");
    assert.equal(options.method, "POST");
    assert.match(options.body, /secret/);
    return { ok: true };
  });

  assert.equal(ok, true);
});

test("admin password verification rejects wrong or unavailable login", async () => {
  const wrong = await verifyAdminPassword("wrong", async () => ({ ok: false }));
  const unavailable = await verifyAdminPassword("secret", async () => {
    throw new Error("offline");
  });
  const empty = await verifyAdminPassword("", async () => ({ ok: true }));

  assert.equal(wrong, false);
  assert.equal(unavailable, false);
  assert.equal(empty, false);
});
