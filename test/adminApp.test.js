import test from "node:test";
import assert from "node:assert/strict";
import {
  createBlankCategory,
  createBlankProduct,
  hasProductSizeRows,
  isAdminRoute,
  renderAdminEditor,
  updateCategory,
  validateAdminMenu,
  shouldApplyStoredTokenResult,
  verifyAdminPassword,
} from "../src/adminApp.js";

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

test("blank admin product keeps the editable shape defaults", () => {
  const product = createBlankProduct("cookies");

  assert.equal(product.shape, "box");
  assert.equal(product.color, "#7a3f2a");
  assert.equal(product.accent, "#fff1d7");
  assert.equal(product.sizes[0].label, "1 box");
});

test("admin menu validation rejects products without size rows", () => {
  const menu = {
    categories: [{ id: "tubes", label: "Tubes", isActive: true }],
    products: [{ ...createBlankProduct("tubes"), sizes: [] }],
  };

  assert.equal(hasProductSizeRows(menu.products[0]), false);
  assert.deepEqual(validateAdminMenu(menu), {
    ok: false,
    message: "Every product needs at least one size.",
  });
});

test("category editor helpers create and update category state", () => {
  const category = createBlankCategory([{ id: "tubes" }, { id: "cookies" }]);

  assert.match(category.id, /^category-/);
  assert.equal(category.label, "New category");
  assert.equal(category.isActive, true);
  assert.equal(category.sortOrder, 3);

  updateCategory(category, { label: "Seasonal", isActive: false });

  assert.equal(category.label, "Seasonal");
  assert.equal(category.isActive, false);
});

test("renderAdminEditor keeps the final size row and posts the saved menu with auth", async () => {
  const menu = {
    categories: [{ id: "tubes", label: "Tubes", isActive: true }],
    products: [createBlankProduct("tubes")],
  };
  const fetchCalls = [];
  const restoreFetch = globalThis.fetch;
  const restoreFormData = globalThis.FormData;
  const root = createAdminEditorTestRoot();

  globalThis.FormData = class FakeFormData {
    constructor(form) {
      this.form = form;
    }

    get(name) {
      return this.form.fields.get(name)?.value ?? null;
    }
  };

  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    if (!options.method) {
      return {
        ok: true,
        async json() {
          return { menu };
        },
      };
    }

    return {
      ok: true,
      async json() {
        return { menu: JSON.parse(options.body).menu };
      },
    };
  };

  try {
    await renderAdminEditor(root, "admin-secret");

    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, "/api/admin/menu");
    assert.equal(fetchCalls[0].options.headers.authorization, "Bearer admin-secret");

    await root.clickButton({ removeSize: "0" });

    assert.equal(root.querySelector("[data-save-status]").textContent, "Every product needs at least one size.");

    await root.clickButton({ adminSave: "" });

    assert.equal(fetchCalls.length, 2);
    assert.equal(fetchCalls[1].url, "/api/admin/menu");
    assert.equal(fetchCalls[1].options.method, "POST");
    assert.equal(fetchCalls[1].options.headers.authorization, "Bearer admin-secret");
    assert.equal(JSON.parse(fetchCalls[1].options.body).menu.products[0].sizes.length, 1);
  } finally {
    globalThis.fetch = restoreFetch;
    globalThis.FormData = restoreFormData;
  }
});

function createAdminEditorTestRoot() {
  const listeners = new Map();
  const state = {
    html: "",
    saveStatus: "",
    loadingStatus: "",
    form: null,
  };

  const root = {
    addEventListener(type, handler) {
      const handlers = listeners.get(type) ?? [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    querySelector(selector) {
      if (selector === ".admin-status") return createTextNode(state.loadingStatus);
      if (selector === "[data-save-status]") return createTextNode(state.saveStatus);
      if (selector === "[data-admin-form]") return state.form;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-category-index]") return state.form?.categoryRows ?? [];
      return [];
    },
    set innerHTML(value) {
      state.html = value;
      state.loadingStatus = matchText(value, /<p class="admin-status">([^<]*)<\/p>/);
      state.saveStatus = matchText(value, /data-save-status>([^<]*)<\/p>/);
      state.form = value.includes('data-admin-form') ? createFormState(value) : null;
    },
    get innerHTML() {
      return state.html;
    },
    async clickButton(dataset) {
      const handlers = listeners.get("click") ?? [];
      const event = {
        target: {
          dataset,
          closest(selector) {
            return selector === "button" ? this : null;
          },
        },
      };

      for (const handler of handlers) {
        await handler(event);
      }
    },
  };

  return root;
}

function createFormState(html) {
  const fieldValues = new Map([
    ["name", { value: extractInputValue(html, "name") }],
    ["category", { value: extractSelectedOptionValue(html, "category") }],
    ["description", { value: extractTextareaValue(html, "description") }],
    ["shape", { value: extractInputValue(html, "shape") }],
    ["color", { value: extractInputValue(html, "color") }],
    ["accent", { value: extractInputValue(html, "accent") }],
    ["isActive", { value: hasCheckedInput(html, "isActive") ? "on" : null }],
  ]);

  return {
    fields: fieldValues,
    sizeRows: extractFieldsets(html, "admin-size-row", "size-index", [
      ["size-label", "value"],
      ["size-pieces", "value"],
      ["size-diameter", "value"],
      ["size-height", "value"],
      ["size-price", "value"],
      ["size-sort", "value"],
    ]),
    photoRows: extractFieldsets(html, "admin-photo-row", "photo-index", [
      ["photo-src", "value"],
      ["photo-alt", "value"],
      ["photo-sort", "value"],
    ]),
    categoryRows: extractFieldsets(html, "admin-category-row", "category-index", [
      ["category-label", "value"],
      ["category-active", "checked"],
    ]),
    querySelectorAll(selector) {
      if (selector === "[data-size-index]") return this.sizeRows;
      if (selector === "[data-photo-index]") return this.photoRows;
      return [];
    },
  };
}

function extractFieldsets(html, className, dataName, fields) {
  const rows = [];
  const pattern = new RegExp(`<fieldset class="${className}" data-${dataName}="(\\d+)">([\\s\\S]*?)<\\/fieldset>`, "g");

  for (const match of html.matchAll(pattern)) {
    const [, index, rowHtml] = match;
    const controls = new Map(
      fields.map(([name, kind]) => [
        name,
        kind === "checked"
          ? { checked: hasCheckedInput(rowHtml, name) }
          : { value: extractInputValue(rowHtml, name) },
      ]),
    );

    rows.push({
      dataset: { [camelize(dataName)]: index },
      querySelector(selector) {
        const nameMatch = selector.match(/\[name='([^']+)'\]/);
        return nameMatch ? controls.get(nameMatch[1]) ?? null : null;
      },
    });
  }

  return rows;
}

function extractInputValue(html, name) {
  return matchText(html, new RegExp(`<input[^>]*name="${name}"[^>]*value="([^"]*)"`, ""));
}

function extractTextareaValue(html, name) {
  return matchText(html, new RegExp(`<textarea[^>]*name="${name}"[^>]*>([\\s\\S]*?)<\\/textarea>`, ""));
}

function extractSelectedOptionValue(html, name) {
  const selectMatch = html.match(new RegExp(`<select name="${name}">([\\s\\S]*?)<\\/select>`));
  if (!selectMatch) return "";
  return matchText(selectMatch[1], /<option value="([^"]*)" selected>/);
}

function hasCheckedInput(html, name) {
  return new RegExp(`<input[^>]*name="${name}"[^>]*checked`).test(html);
}

function matchText(text, pattern) {
  return text.match(pattern)?.[1] ?? "";
}

function camelize(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function createTextNode(textContent) {
  return { textContent };
}
