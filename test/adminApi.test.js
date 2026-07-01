import test from "node:test";
import assert from "node:assert/strict";
import loginHandler from "../api/admin/login.js";
import menuHandler from "../api/admin/menu.js";

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("admin login rejects wrong password", async () => {
  process.env.ADMIN_PASSWORD = "secret-admin";
  const response = createResponse();

  await loginHandler({ method: "POST", body: { password: "wrong" } }, response);

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.ok, false);
});

test("admin login accepts correct password", async () => {
  process.env.ADMIN_PASSWORD = "secret-admin";
  const response = createResponse();

  await loginHandler({ method: "POST", body: { password: "secret-admin" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
});

test("admin menu rejects missing password", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.ADMIN_PASSWORD = "secret-admin";
  const response = createResponse();

  await menuHandler({ method: "GET", headers: {}, body: {} }, response);

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.ok, false);
});

test("admin menu uses fallback storage when Supabase is not configured", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.ADMIN_PASSWORD = "secret-admin";
  const response = createResponse();

  await menuHandler({ method: "GET", headers: { authorization: "Bearer secret-admin" }, body: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.menu.categories.length > 0);
  assert.ok(response.body.menu.products.length > 0);
});

test("admin menu returns a setup error when Supabase load fails", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.ADMIN_PASSWORD = "secret-admin";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    text: async () => JSON.stringify({ message: "relation categories does not exist" }),
  });
  const response = createResponse();

  try {
    await menuHandler({ method: "GET", headers: { authorization: "Bearer secret-admin" }, body: {} }, response);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error, /Supabase menu storage is not ready/);
});

test("admin menu accepts valid save payload", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.ADMIN_PASSWORD = "secret-admin";
  const response = createResponse();
  const menu = {
    categories: [{ id: "draft", label: "Draft", sortOrder: 1, isActive: true }],
    products: [
      {
        id: "draft-cookie",
        category: "draft",
        name: "Draft Cookie",
        description: "Draft item.",
        shape: "cookie",
        color: "#552211",
        accent: "#ffeecc",
        isActive: true,
        sortOrder: 1,
        sizes: [{ label: "1 pc", diameterCm: 7, heightCm: 1.2, price: 0.5, sortOrder: 1 }],
        photos: [{ src: "./products/chocolate-cookie.webp", alt: "Draft cookie", sortOrder: 1 }],
      },
    ],
  };

  await menuHandler(
    {
      method: "POST",
      headers: { authorization: "Bearer secret-admin" },
      body: { menu },
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.menu.products[0].id, "draft-cookie");
});
