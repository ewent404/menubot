# Admin Menu Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private `/admin` page that edits BigBunny menu categories, products, sizes, prices, visibility, and photo paths while keeping the customer Telegram Mini App working.

**Architecture:** Keep `src/menuData.js` as the fallback menu. Add a menu repository that normalizes editable menu records into the existing `categories` and `menuItems` shape. Add Vercel serverless APIs for reading public menu data and password-protected admin reads/writes, with Supabase as the production storage target and local fallback behavior when Supabase is not configured.

**Tech Stack:** Vite, plain JavaScript modules, Vercel serverless functions, Node test runner, Supabase REST API through `fetch`, existing CSS.

## Global Constraints

- Customer menu remains at `/`.
- Admin tool lives at `/admin`.
- Admin page requires an `ADMIN_PASSWORD`.
- Supabase service role key stays only in Vercel environment variables.
- Customer browser only receives public menu data.
- Bot tokens remain server-only.
- Keep local menu data as the fallback source.
- First implementation uses image URLs or existing `/products/...` paths; it does not include Supabase Storage upload.

---

## File Structure

- Create `src/menuRepository.js`: normalize local/API/Supabase-style menu data into `{ categories, menuItems }`.
- Modify `src/main.js`: render customer menu from async menu repository data instead of static imports only.
- Create `src/adminApp.js`: render `/admin`, login form, product editor, category editor, size/photo rows, and save behavior.
- Modify `src/styles.css`: add admin layout and form styles without disrupting Mini App styles.
- Create `api/menu.js`: public menu endpoint with fallback data.
- Create `api/admin/login.js`: password validation endpoint.
- Create `api/admin/menu.js`: password-protected admin menu read/write endpoint.
- Create `api/admin/supabaseMenuStore.js`: Supabase REST helpers and in-memory fallback for tests/unconfigured local development.
- Create `test/menuRepository.test.js`: repository normalization and filtering tests.
- Create `test/adminApi.test.js`: admin API auth and payload tests.
- Modify `test/menu.test.js` and `test/telegramMiniAppChrome.test.js`: cover async menu loading and make sure customer UI still renders.

---

### Task 1: Menu Repository And Public Menu API

**Files:**
- Create: `src/menuRepository.js`
- Create: `api/menu.js`
- Test: `test/menuRepository.test.js`

**Interfaces:**
- Consumes: `categories` and `menuItems` from `src/menuData.js`.
- Produces: `getFallbackMenu(): { categories: Category[], menuItems: MenuItem[] }`
- Produces: `normalizeMenuData(input, options): { categories: Category[], menuItems: MenuItem[] }`
- Produces: `loadPublicMenu(fetchImpl = fetch): Promise<{ categories, menuItems }>`

- [ ] **Step 1: Write repository tests**

Create `test/menuRepository.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- test/menuRepository.test.js`

Expected: FAIL because `src/menuRepository.js` does not exist.

- [ ] **Step 3: Implement menu repository**

Create `src/menuRepository.js`:

```js
import { categories as fallbackCategories, menuItems as fallbackMenuItems } from "./menuData.js";

function sortByOrder(left, right) {
  return (left.sortOrder ?? left.sort_order ?? 0) - (right.sortOrder ?? right.sort_order ?? 0);
}

function active(record, includeInactive) {
  return includeInactive || record.isActive !== false && record.is_active !== false;
}

function normalizeCategory(category) {
  return {
    id: String(category.id),
    label: String(category.label ?? category.name ?? category.id),
  };
}

function normalizeSize(size) {
  return {
    label: String(size.label),
    pieces: size.pieces ? String(size.pieces) : undefined,
    diameterCm: Number(size.diameterCm ?? size.diameter_cm ?? size.widthCm ?? size.width_cm ?? 0),
    heightCm: Number(size.heightCm ?? size.height_cm ?? 0),
    price: Number(size.price),
  };
}

function normalizePhoto(photo) {
  return {
    src: String(photo.src),
    alt: String(photo.alt ?? ""),
  };
}

function normalizeProduct(product) {
  const photos = [...(product.photos ?? [])].sort(sortByOrder).map(normalizePhoto);
  const fallbackPhoto = photos[0] ?? {
    src: product.photo ?? "./products/brownie-tube.webp",
    alt: product.photoAlt ?? product.photo_alt ?? product.name,
  };

  return {
    id: String(product.id),
    name: String(product.name),
    category: String(product.category ?? product.categoryId ?? product.category_id),
    description: String(product.description ?? ""),
    shape: String(product.shape ?? "box"),
    color: String(product.color ?? "#7a3f2a"),
    accent: String(product.accent ?? "#fff1d7"),
    photo: fallbackPhoto.src,
    photoAlt: String(product.photoAlt ?? product.photo_alt ?? fallbackPhoto.alt ?? product.name),
    photos: photos.length > 0 ? photos : [fallbackPhoto],
    sizes: [...(product.sizes ?? [])].sort(sortByOrder).map(normalizeSize),
  };
}

export function getFallbackMenu() {
  return {
    categories: fallbackCategories,
    menuItems: fallbackMenuItems,
  };
}

export function normalizeMenuData(input, options = {}) {
  const includeInactive = options.includeInactive === true;
  const categories = [...(input.categories ?? [])]
    .filter((category) => active(category, includeInactive))
    .sort(sortByOrder)
    .map(normalizeCategory);

  const categoryIds = new Set(categories.map((category) => category.id));
  const menuItems = [...(input.products ?? input.menuItems ?? [])]
    .filter((product) => active(product, includeInactive))
    .filter((product) => categoryIds.has(String(product.category ?? product.categoryId ?? product.category_id)))
    .sort(sortByOrder)
    .map(normalizeProduct)
    .filter((product) => product.sizes.length > 0);

  return { categories, menuItems };
}

export async function loadPublicMenu(fetchImpl = fetch) {
  try {
    const response = await fetchImpl("/api/menu");
    if (!response.ok) throw new Error("Menu API failed");
    const payload = await response.json();
    return normalizeMenuData(payload);
  } catch {
    return getFallbackMenu();
  }
}
```

- [ ] **Step 4: Implement public API fallback**

Create `api/menu.js`:

```js
import { getFallbackMenu } from "../src/menuRepository.js";

export default async function handler(_request, response) {
  response.status(200).json(getFallbackMenu());
}
```

- [ ] **Step 5: Run task tests**

Run: `npm test -- test/menuRepository.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/menuRepository.js api/menu.js test/menuRepository.test.js
git commit -m "Add editable menu repository"
```

---

### Task 2: Customer Menu Loads Async Data

**Files:**
- Modify: `src/main.js`
- Test: `test/menu.test.js`
- Test: `test/telegramMiniAppChrome.test.js`

**Interfaces:**
- Consumes: `loadPublicMenu()` from `src/menuRepository.js`.
- Produces: Customer app renders using mutable `categories` and `menuItems` loaded at startup.

- [ ] **Step 1: Add customer async-loading tests**

Modify `test/menu.test.js` with:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMenuData } from "../src/menuRepository.js";

test("customer menu can render from async API-shaped data", () => {
  const menu = normalizeMenuData({
    categories: [{ id: "seasonal", label: "Seasonal", isActive: true, sortOrder: 1 }],
    products: [
      {
        id: "new-cookie",
        category: "seasonal",
        name: "New Cookie",
        description: "Fresh item.",
        shape: "cookie",
        color: "#8a3f2a",
        accent: "#f8dcc4",
        isActive: true,
        sortOrder: 1,
        photos: [{ src: "./products/chocolate-cookie.webp", alt: "New cookie", sortOrder: 1 }],
        sizes: [{ label: "1 pc", diameterCm: 7, heightCm: 1.2, price: 0.75, sortOrder: 1 }],
      },
    ],
  });

  assert.equal(menu.categories[0].label, "Seasonal");
  assert.equal(menu.menuItems[0].name, "New Cookie");
});
```

- [ ] **Step 2: Run tests**

Run: `npm test -- test/menu.test.js`

Expected: PASS after Task 1.

- [ ] **Step 3: Update `src/main.js` imports and menu variables**

Change:

```js
import { categories, menuItems } from "./menuData.js";
```

to:

```js
import { getFallbackMenu, loadPublicMenu } from "./menuRepository.js";
```

Add after imports:

```js
let { categories, menuItems } = getFallbackMenu();
```

- [ ] **Step 4: Add startup menu load**

Near the bottom of `src/main.js`, after event listeners are registered and the first `render()` call exists, add:

```js
async function hydrateMenu() {
  const loadedMenu = await loadPublicMenu();
  categories = loadedMenu.categories;
  menuItems = loadedMenu.menuItems;

  if (!menuItems.some((item) => item.id === state.itemId)) {
    state.categoryId = categories[0]?.id ?? "tubes";
    state.itemId = menuItems.find((item) => item.category === state.categoryId)?.id ?? menuItems[0]?.id ?? "brownie-tube";
    state.sizeIndex = 0;
    state.photoIndex = 0;
  }

  render();
}

hydrateMenu();
```

- [ ] **Step 5: Run customer UI tests**

Run: `npm test -- test/menu.test.js test/telegramMiniAppChrome.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main.js test/menu.test.js test/telegramMiniAppChrome.test.js
git commit -m "Load menu data asynchronously"
```

---

### Task 3: Admin API Auth And Menu Storage Boundary

**Files:**
- Create: `api/admin/supabaseMenuStore.js`
- Create: `api/admin/login.js`
- Create: `api/admin/menu.js`
- Create: `test/adminApi.test.js`

**Interfaces:**
- Produces: `isAdminPassword(value): boolean`
- Produces: `loadAdminMenu(): Promise<{ categories, products }>`
- Produces: `saveAdminMenu(menu): Promise<{ categories, products }>`

- [ ] **Step 1: Write admin API tests**

Create `test/adminApi.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- test/adminApi.test.js`

Expected: FAIL because admin API files do not exist.

- [ ] **Step 3: Implement store helper**

Create `api/admin/supabaseMenuStore.js`:

```js
import { getFallbackMenu } from "../../src/menuRepository.js";

let memoryMenu;

function fallbackAdminMenu() {
  const fallback = getFallbackMenu();
  return {
    categories: fallback.categories.map((category, index) => ({
      ...category,
      sortOrder: index + 1,
      isActive: true,
    })),
    products: fallback.menuItems.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
      isActive: true,
    })),
  };
}

export function isAdminPassword(value) {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  return Boolean(expected && value === expected);
}

export function passwordFromRequest(request) {
  const header = request.headers?.authorization ?? request.headers?.Authorization ?? "";
  if (header.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return request.body?.password ?? "";
}

export async function loadAdminMenu() {
  return memoryMenu ?? fallbackAdminMenu();
}

export async function saveAdminMenu(menu) {
  memoryMenu = {
    categories: Array.isArray(menu.categories) ? menu.categories : [],
    products: Array.isArray(menu.products) ? menu.products : [],
  };
  return memoryMenu;
}
```

- [ ] **Step 4: Implement login API**

Create `api/admin/login.js`:

```js
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
```

- [ ] **Step 5: Implement admin menu API**

Create `api/admin/menu.js`:

```js
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
```

- [ ] **Step 6: Run task tests**

Run: `npm test -- test/adminApi.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/admin test/adminApi.test.js
git commit -m "Add admin menu API boundary"
```

---

### Task 4: Admin Frontend Route And Login

**Files:**
- Create: `src/adminApp.js`
- Modify: `src/main.js`
- Modify: `src/styles.css`
- Test: `test/adminApp.test.js`

**Interfaces:**
- Consumes: `POST /api/admin/login`.
- Produces: `isAdminRoute(pathname = window.location.pathname): boolean`
- Produces: `renderAdminApp(root: Element): void`

- [ ] **Step 1: Write admin route tests**

Create `test/adminApp.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { isAdminRoute } from "../src/adminApp.js";

test("admin route is detected from /admin", () => {
  assert.equal(isAdminRoute("/admin"), true);
  assert.equal(isAdminRoute("/admin/"), true);
  assert.equal(isAdminRoute("/"), false);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- test/adminApp.test.js`

Expected: FAIL because `src/adminApp.js` does not exist.

- [ ] **Step 3: Implement admin route and login shell**

Create `src/adminApp.js`:

```js
export function isAdminRoute(pathname = window.location.pathname) {
  return pathname === "/admin" || pathname === "/admin/";
}

function token() {
  return window.sessionStorage.getItem("bigbunny-admin-token") ?? "";
}

function setToken(value) {
  window.sessionStorage.setItem("bigbunny-admin-token", value);
}

export function renderAdminApp(root) {
  root.innerHTML = `
    <main class="admin-shell">
      <section class="admin-login">
        <h1>BigBunny Admin</h1>
        <p>Edit menu products, prices, sizes, and photos.</p>
        <form data-admin-login>
          <label>
            <span>Password</span>
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <button type="submit">Open admin</button>
          <p class="admin-status" data-admin-status></p>
        </form>
      </section>
    </main>
  `;

  const form = root.querySelector("[data-admin-login]");
  const status = root.querySelector("[data-admin-status]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = new FormData(form).get("password").toString();
    status.textContent = "Checking...";

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      status.textContent = "Wrong password.";
      return;
    }

    setToken(password);
    status.textContent = "Login ok.";
    renderAdminEditor(root, token());
  });

  if (token()) renderAdminEditor(root, token());
}

export async function renderAdminEditor(root, adminToken) {
  root.innerHTML = `
    <main class="admin-shell">
      <header class="admin-header">
        <div>
          <h1>BigBunny Admin</h1>
          <p>Menu control panel</p>
        </div>
      </header>
      <section class="admin-editor">
        <p class="admin-status">Loading menu...</p>
      </section>
    </main>
  `;
}
```

- [ ] **Step 4: Route `src/main.js` before customer render**

At the top of `src/main.js`, add:

```js
import { isAdminRoute, renderAdminApp } from "./adminApp.js";
```

After `const app = document.querySelector("#app");`, add:

```js
if (isAdminRoute()) {
  renderAdminApp(app);
} else {
```

Wrap the existing customer app initialization in that `else` block and close it at the end of the file.

- [ ] **Step 5: Add admin base CSS**

Append to `src/styles.css`:

```css
.admin-shell {
  min-height: 100vh;
  background: #fffaf7;
  color: #111827;
  padding: 24px;
}

.admin-login,
.admin-editor {
  max-width: 960px;
  margin: 0 auto;
}

.admin-login form {
  display: grid;
  gap: 16px;
  max-width: 360px;
}

.admin-login input,
.admin-login button {
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid #d9c9bd;
  padding: 0 12px;
  font: inherit;
}

.admin-login button {
  background: #6b2d1a;
  color: #fff;
  font-weight: 800;
}
```

- [ ] **Step 6: Run task tests**

Run: `npm test -- test/adminApp.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/adminApp.js src/main.js src/styles.css test/adminApp.test.js
git commit -m "Add admin route and login shell"
```

---

### Task 5: Admin Product Editor

**Files:**
- Modify: `src/adminApp.js`
- Modify: `src/styles.css`
- Test: `test/adminApp.test.js`

**Interfaces:**
- Consumes: `GET /api/admin/menu`, `POST /api/admin/menu`.
- Produces: Admin can edit category/product/size/photo JSON and save it.

- [ ] **Step 1: Add editor state test**

Extend `test/adminApp.test.js`:

```js
import { createBlankProduct } from "../src/adminApp.js";

test("blank admin product has editable size and photo rows", () => {
  const product = createBlankProduct("tubes");

  assert.equal(product.category, "tubes");
  assert.equal(product.sizes.length, 1);
  assert.equal(product.photos.length, 2);
  assert.equal(product.isActive, true);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- test/adminApp.test.js`

Expected: FAIL because `createBlankProduct` is missing.

- [ ] **Step 3: Add editor helpers**

In `src/adminApp.js`, add:

```js
export function createBlankProduct(categoryId) {
  const id = `product-${Date.now()}`;
  return {
    id,
    category: categoryId,
    name: "New product",
    description: "",
    shape: "box",
    color: "#7a3f2a",
    accent: "#fff1d7",
    sortOrder: 99,
    isActive: true,
    sizes: [{ label: "1 box", pieces: "", diameterCm: 10, heightCm: 5, price: 1, sortOrder: 1 }],
    photos: [
      { src: "./products/brownie-tube.webp", alt: "Product photo", sortOrder: 1 },
      { src: "./products/brownie-tube-2.webp", alt: "Product photo", sortOrder: 2 },
    ],
  };
}
```

- [ ] **Step 4: Replace loading editor with functional form**

Update `renderAdminEditor` in `src/adminApp.js` to fetch menu, keep `menu` and `selectedProductId` in closure state, render product list and a form, and save with:

```js
await fetch("/api/admin/menu", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify({ menu }),
});
```

The form must include fields for product name, category, description, shape, color, accent, active toggle, all size rows, and all photo rows.

- [ ] **Step 5: Add editor CSS**

Append focused admin styles for:

```css
.admin-header
.admin-editor-grid
.admin-sidebar
.admin-product-list
.admin-form
.admin-row
.admin-size-row
.admin-photo-row
.admin-actions
```

Use restrained cards, 8px radius, clear labels, and mobile stacking below `760px`.

- [ ] **Step 6: Run task tests**

Run: `npm test -- test/adminApp.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/adminApp.js src/styles.css test/adminApp.test.js
git commit -m "Add admin product editor"
```

---

### Task 6: Supabase REST Integration

**Files:**
- Modify: `api/admin/supabaseMenuStore.js`
- Modify: `api/menu.js`
- Test: `test/adminApi.test.js`
- Test: `test/menuRepository.test.js`

**Interfaces:**
- Consumes env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Produces: API reads/writes Supabase when configured and memory fallback when not configured.

- [ ] **Step 1: Add store mode tests**

Extend `test/adminApi.test.js` to clear Supabase env vars before current tests:

```js
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
```

Add:

```js
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
```

- [ ] **Step 2: Run tests**

Run: `npm test -- test/adminApi.test.js`

Expected: PASS before integration changes.

- [ ] **Step 3: Add Supabase fetch helpers**

In `api/admin/supabaseMenuStore.js`, add:

```js
function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseFetch(path, options = {}) {
  const baseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  return response.status === 204 ? null : response.json();
}
```

- [ ] **Step 4: Implement Supabase reads**

Update `loadAdminMenu()` to:

- return memory fallback when Supabase env vars are missing
- fetch `categories?select=*&order=sort_order.asc`
- fetch `products?select=*&order=sort_order.asc`
- fetch `product_sizes?select=*&order=sort_order.asc`
- fetch `product_photos?select=*&order=sort_order.asc`
- merge sizes/photos into products by `product_id`

- [ ] **Step 5: Implement Supabase writes**

Update `saveAdminMenu(menu)` to:

- keep memory fallback when Supabase env vars are missing
- upsert categories into `categories`
- upsert products into `products`
- upsert sizes into `product_sizes`
- upsert photos into `product_photos`

Use stable ids from the admin form. Do not delete missing rows in the first version; inactive status hides records safely.

- [ ] **Step 6: Update public API**

Modify `api/menu.js` to call `loadAdminMenu()` and `normalizeMenuData(adminMenu)`, falling back to `getFallbackMenu()` on error.

- [ ] **Step 7: Run tests**

Run: `npm test -- test/adminApi.test.js test/menuRepository.test.js`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add api/admin/supabaseMenuStore.js api/menu.js test/adminApi.test.js test/menuRepository.test.js
git commit -m "Connect menu APIs to Supabase storage"
```

---

### Task 7: Verification, Docs, And Deployment Notes

**Files:**
- Modify: `BOT_SETUP.md`
- Create: `docs/supabase-admin-schema.sql`

**Interfaces:**
- Produces: Supabase setup SQL and Vercel env var checklist.

- [ ] **Step 1: Create Supabase schema SQL**

Create `docs/supabase-admin-schema.sql` with `create table if not exists` statements for:

- `categories`
- `products`
- `product_sizes`
- `product_photos`

Use text ids, numeric prices/dimensions, boolean `is_active`, integer `sort_order`, and foreign key references from products to categories and sizes/photos to products.

- [ ] **Step 2: Document Vercel env vars**

Add to `BOT_SETUP.md`:

```md
## Admin Menu Tool

Set these Vercel environment variables:

- `ADMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Open the admin panel at:

`https://menubot-nu.vercel.app/admin`

The first image editor version accepts existing product image paths such as `./products/brownie-tube.webp` or full image URLs.
```

- [ ] **Step 3: Run full tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: build succeeds. The known Three.js chunk warning is acceptable.

- [ ] **Step 5: Commit**

```bash
git add BOT_SETUP.md docs/supabase-admin-schema.sql
git commit -m "Document admin menu setup"
```

- [ ] **Step 6: Push and deploy**

Run:

```bash
git push origin main
vercel --prod
```

Expected: Vercel aliases production to `https://menubot-nu.vercel.app`.

