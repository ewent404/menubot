import test from "node:test";
import assert from "node:assert/strict";
import publicMenuHandler from "../api/menu.js";
import { loadAdminMenu, saveAdminMenu } from "../api/admin/supabaseMenuStore.js";
import { getFallbackMenu, normalizeMenuData } from "../src/menuRepository.js";

test("fallback menu keeps the current products available", () => {
  const menu = getFallbackMenu();

  assert.ok(menu.categories.length >= 3);
  assert.ok(menu.menuItems.some((item) => item.id === "brownie-tube"));
  assert.ok(menu.menuItems.every((item) => item.photos.length >= 2));
});

test("normalizes admin menu records into customer menu shape", () => {
  const menu = normalizeMenuData({
    categories: [
      { id: "cakes", label: "Cakes", sortOrder: 1, isActive: true },
      { id: "hidden", label: "Hidden", sortOrder: 2, isActive: false },
    ],
    products: [
      {
        id: "mini-cake",
        category: "cakes",
        name: "Mini Cake",
        description: "Small cake for one.",
        shape: "box",
        color: "#aa7744",
        accent: "#442211",
        photoAlt: "Mini cake",
        sortOrder: 1,
        isActive: true,
        sizes: [{ label: "1 box", pieces: "1 pc", diameterCm: 9, heightCm: 5, price: 3.25, sortOrder: 1 }],
        photos: [{ src: "./products/banana-bread.webp", alt: "Mini cake", sortOrder: 1 }],
      },
      {
        id: "hidden-cake",
        category: "cakes",
        name: "Hidden Cake",
        description: "Not visible.",
        shape: "box",
        color: "#000000",
        accent: "#ffffff",
        isActive: false,
        sizes: [{ label: "1", diameterCm: 5, heightCm: 4, price: 1 }],
        photos: [{ src: "./products/banana-bread.webp", alt: "Hidden cake" }],
      },
    ],
  });

  assert.deepEqual(menu.categories.map((category) => category.id), ["cakes"]);
  assert.deepEqual(menu.menuItems.map((item) => item.id), ["mini-cake"]);
  assert.equal(menu.menuItems[0].photo, "./products/banana-bread.webp");
  assert.equal(menu.menuItems[0].sizes[0].price, 3.25);
});

test("admin mode includes inactive records for editing", () => {
  const menu = normalizeMenuData(
    {
      categories: [{ id: "hidden", label: "Hidden", sortOrder: 1, isActive: false }],
      products: [
        {
          id: "hidden-cookie",
          category: "hidden",
          name: "Hidden Cookie",
          description: "Draft product.",
          shape: "cookie",
          color: "#552211",
          accent: "#ffeecc",
          isActive: false,
          sizes: [{ label: "1 pc", diameterCm: 7, heightCm: 1.2, price: 0.5 }],
          photos: [{ src: "./products/chocolate-cookie.webp", alt: "Hidden cookie" }],
        },
      ],
    },
    { includeInactive: true },
  );

  assert.deepEqual(menu.categories.map((category) => category.id), ["hidden"]);
  assert.deepEqual(menu.menuItems.map((item) => item.id), ["hidden-cookie"]);
});

test("loads Supabase admin rows and merges product sizes and photos", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co/";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    const path = String(url).replace("https://example.supabase.co/rest/v1/", "");
    const rows = {
      "categories?select=*&order=sort_order.asc": [{ id: "cakes", label: "Cakes", sort_order: 1, is_active: true }],
      "products?select=*&order=sort_order.asc": [
        {
          id: "mini-cake",
          category_id: "cakes",
          name: "Mini Cake",
          description: "Small cake.",
          shape: "box",
          color: "#aa7744",
          accent: "#442211",
          photo_alt: "Mini cake",
          sort_order: 1,
          is_active: true,
        },
      ],
      "product_sizes?select=*&order=sort_order.asc": [
        {
          id: "mini-cake-size-1",
          product_id: "mini-cake",
          label: "1 box",
          pieces: "1 pc",
          diameter_cm: 9,
          height_cm: 5,
          price: 3.25,
          sort_order: 1,
        },
      ],
      "product_photos?select=*&order=sort_order.asc": [
        { id: "mini-cake-photo-1", product_id: "mini-cake", src: "./products/banana-bread.webp", alt: "Mini cake", sort_order: 1 },
      ],
    }[path];
    assert.ok(rows, `unexpected Supabase path ${path}`);
    return { ok: true, status: 200, json: async () => rows };
  };

  try {
    const menu = await loadAdminMenu();

    assert.equal(requests.length, 4);
    assert.equal(requests[0].options.headers.apikey, "service-key");
    assert.deepEqual(menu.categories, [{ id: "cakes", label: "Cakes", sortOrder: 1, isActive: true }]);
    assert.equal(menu.products[0].category, "cakes");
    assert.deepEqual(menu.products[0].sizes, [
      { id: "mini-cake-size-1", label: "1 box", pieces: "1 pc", diameterCm: 9, heightCm: 5, price: 3.25, sortOrder: 1 },
    ]);
    assert.deepEqual(menu.products[0].photos, [
      { id: "mini-cake-photo-1", src: "./products/banana-bread.webp", alt: "Mini cake", sortOrder: 1 },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});

test("loads fallback admin menu when Supabase tables are empty", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => [] });

  try {
    const menu = await loadAdminMenu();

    assert.ok(menu.categories.length >= 3);
    assert.ok(menu.products.some((product) => product.id === "brownie-tube"));
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});

test("saves Supabase admin menu rows with upserts and without deletes", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true, status: 201, json: async () => [] };
  };

  try {
    await saveAdminMenu({
      categories: [{ id: "cakes", label: "Cakes", sortOrder: 1, isActive: true }],
      products: [
        {
          id: "mini-cake",
          category: "cakes",
          name: "Mini Cake",
          description: "Small cake.",
          shape: "box",
          color: "#aa7744",
          accent: "#442211",
          photoAlt: "Mini cake",
          sortOrder: 1,
          isActive: true,
          sizes: [{ label: "1 box", pieces: "1 pc", diameterCm: 9, heightCm: 5, price: 3.25, sortOrder: 1 }],
          photos: [{ src: "./products/banana-bread.webp", alt: "Mini cake", sortOrder: 1 }],
        },
      ],
    });

    assert.deepEqual(
      requests.map((request) => String(request.url).replace("https://example.supabase.co/rest/v1/", "")),
      ["categories", "products", "product_sizes", "product_photos"],
    );
    assert.ok(requests.every((request) => request.options.method === "POST"));
    assert.ok(requests.every((request) => request.options.headers.Prefer === "resolution=merge-duplicates"));
    assert.deepEqual(requests[2].body, [
      {
        id: "mini-cake-size-1",
        product_id: "mini-cake",
        label: "1 box",
        pieces: "1 pc",
        diameter_cm: 9,
        height_cm: 5,
        price: 3.25,
        sort_order: 1,
      },
    ]);
    assert.deepEqual(requests[3].body, [
      {
        id: "mini-cake-photo-1",
        product_id: "mini-cake",
        src: "./products/banana-bread.webp",
        alt: "Mini cake",
        sort_order: 1,
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});

test("skips Supabase upserts for empty child row sets", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true, status: 201, json: async () => [] };
  };

  try {
    await saveAdminMenu({
      categories: [{ id: "cakes", label: "Cakes", sortOrder: 1, isActive: true }],
      products: [
        {
          id: "mini-cake",
          category: "cakes",
          name: "Mini Cake",
          description: "Small cake.",
          shape: "box",
          color: "#aa7744",
          accent: "#442211",
          photoAlt: "Mini cake",
          sortOrder: 1,
          isActive: true,
          sizes: [],
          photos: [],
        },
      ],
    });

    assert.deepEqual(
      requests.map((request) => String(request.url).replace("https://example.supabase.co/rest/v1/", "")),
      ["categories", "products"],
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});

test("public menu API falls back to static menu when Supabase loading fails", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const response = {
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

  try {
    await publicMenuHandler({}, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, getFallbackMenu());
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});
