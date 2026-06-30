import test from "node:test";
import assert from "node:assert/strict";
import loginHandler from "../api/admin/login.js";
import menuHandler from "../api/admin/menu.js";

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
  process.env.ADMIN_PASSWORD = "secret-admin";
  const response = createResponse();

  await menuHandler({ method: "GET", headers: {}, body: {} }, response);

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.ok, false);
});

test("admin menu accepts valid save payload", async () => {
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
