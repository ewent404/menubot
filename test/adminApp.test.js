import test from "node:test";
import assert from "node:assert/strict";
import { createBlankProduct, isAdminRoute, shouldApplyStoredTokenResult, verifyAdminPassword } from "../src/adminApp.js";

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

test("stored admin login checks do not apply after a newer auth attempt", () => {
  assert.equal(
    shouldApplyStoredTokenResult({
      checkedToken: "old-token",
      currentToken: "new-token",
      checkId: 1,
      currentCheckId: 2,
    }),
    false,
  );

  assert.equal(
    shouldApplyStoredTokenResult({
      checkedToken: "admin-token",
      currentToken: "admin-token",
      checkId: 2,
      currentCheckId: 2,
    }),
    true,
  );
});

test("blank admin product has editable size and photo rows", () => {
  const product = createBlankProduct("tubes");

  assert.equal(product.category, "tubes");
  assert.equal(product.sizes.length, 1);
  assert.equal(product.photos.length, 2);
  assert.equal(product.isActive, true);
});
