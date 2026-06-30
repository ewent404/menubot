export function isAdminRoute(pathname = window.location.pathname) {
  return pathname === "/admin" || pathname === "/admin/";
}

function token() {
  return window.sessionStorage.getItem("bigbunny-admin-token") ?? "";
}

function setToken(value) {
  window.sessionStorage.setItem("bigbunny-admin-token", value);
}

function clearToken() {
  window.sessionStorage.removeItem("bigbunny-admin-token");
}

export function shouldApplyStoredTokenResult({ checkedToken, currentToken, checkId, currentCheckId }) {
  return Boolean(checkedToken && checkedToken === currentToken && checkId === currentCheckId);
}

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

export async function verifyAdminPassword(password, fetchImpl = fetch) {
  if (!password) return false;

  try {
    const response = await fetchImpl("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    return response.ok;
  } catch {
    return false;
  }
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
  let authCheckId = 0;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    authCheckId += 1;
    const password = new FormData(form).get("password").toString();
    status.textContent = "Checking...";

    if (!(await verifyAdminPassword(password))) {
      status.textContent = "Wrong password.";
      return;
    }

    setToken(password);
    status.textContent = "Login ok.";
    renderAdminEditor(root, token());
  });

  authCheckId += 1;
  validateStoredToken(root, status, authCheckId, () => authCheckId);
}

async function validateStoredToken(root, status, checkId, currentCheckId) {
  const storedToken = token();
  if (!storedToken) return;

  status.textContent = "Checking saved login...";
  if (await verifyAdminPassword(storedToken)) {
    if (!shouldApplyStoredTokenResult({ checkedToken: storedToken, currentToken: token(), checkId, currentCheckId: currentCheckId() })) return;
    renderAdminEditor(root, storedToken);
    return;
  }

  if (!shouldApplyStoredTokenResult({ checkedToken: storedToken, currentToken: token(), checkId, currentCheckId: currentCheckId() })) return;
  clearToken();
  status.textContent = "Please log in again.";
}

export async function renderAdminEditor(root, adminToken) {
  let menu = { categories: [], products: [] };
  let selectedProductId = "";

  const loadMenu = async () => {
    root.innerHTML = `
      <main class="admin-shell">
        <header class="admin-header">
          <div>
            <h1>BigBunny Admin</h1>
            <p>Menu control panel</p>
          </div>
        </header>
        <section class="admin-editor" data-admin-token="${adminToken ? "ready" : "missing"}">
          <p class="admin-status">Loading menu...</p>
        </section>
      </main>
    `;

    try {
      const response = await fetch("/api/admin/menu", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      if (!response.ok) throw new Error("Menu load failed");
      const payload = await response.json();
      menu = payload.menu ?? { categories: [], products: [] };
      selectedProductId = products()[0]?.id ?? "";
      render();
    } catch {
      const status = root.querySelector(".admin-status");
      if (status) status.textContent = "Could not load menu.";
    }
  };

  const products = () => menu.products ?? menu.menuItems ?? [];
  const categories = () => menu.categories ?? [];
  const selectedProduct = () => products().find((product) => product.id === selectedProductId) ?? products()[0] ?? null;

  const render = (statusText = "") => {
    const product = selectedProduct();
    root.innerHTML = `
      <main class="admin-shell">
        <header class="admin-header">
          <div>
            <h1>BigBunny Admin</h1>
            <p>Menu control panel</p>
          </div>
          <button type="button" data-admin-save>Save menu</button>
        </header>
        <section class="admin-editor admin-editor-grid" data-admin-token="${adminToken ? "ready" : "missing"}">
          <aside class="admin-sidebar">
            <div class="admin-actions">
              <button type="button" data-add-product>Add product</button>
            </div>
            <div class="admin-product-list">
              ${products().map((item) => renderProductButton(item)).join("") || "<p>No products yet.</p>"}
            </div>
          </aside>
          <form class="admin-form" data-admin-form>
            ${product ? renderProductForm(product) : "<p class=\"admin-status\">Add a product to start editing.</p>"}
            <p class="admin-status" data-save-status>${escapeHtml(statusText)}</p>
          </form>
        </section>
      </main>
    `;
  };

  const renderProductButton = (product) => `
    <button class="${product.id === selectedProductId ? "active" : ""}" type="button" data-select-product="${escapeHtml(product.id)}">
      <strong>${escapeHtml(product.name)}</strong>
      <span>${escapeHtml(product.category)}</span>
    </button>
  `;

  const renderProductForm = (product) => `
    <div class="admin-row">
      <label>
        <span>Name</span>
        <input name="name" value="${escapeHtml(product.name ?? "")}" />
      </label>
      <label>
        <span>Category</span>
        <select name="category">
          ${categories().map((category) => `<option value="${escapeHtml(category.id)}" ${category.id === product.category ? "selected" : ""}>${escapeHtml(category.label ?? category.id)}</option>`).join("")}
        </select>
      </label>
    </div>
    <label>
      <span>Description</span>
      <textarea name="description" rows="3">${escapeHtml(product.description ?? "")}</textarea>
    </label>
    <div class="admin-row">
      <label>
        <span>Shape</span>
        <input name="shape" value="${escapeHtml(product.shape ?? "box")}" />
      </label>
      <label>
        <span>Color</span>
        <input name="color" type="color" value="${escapeHtml(product.color ?? "#7a3f2a")}" />
      </label>
      <label>
        <span>Accent</span>
        <input name="accent" type="color" value="${escapeHtml(product.accent ?? "#fff1d7")}" />
      </label>
      <label class="admin-toggle">
        <span>Active</span>
        <input name="isActive" type="checkbox" ${product.isActive !== false ? "checked" : ""} />
      </label>
    </div>
    <div class="admin-actions">
      <h2>Sizes</h2>
      <button type="button" data-add-size>Add size</button>
    </div>
    ${(product.sizes ?? []).map((size, index) => renderSizeRow(size, index)).join("")}
    <div class="admin-actions">
      <h2>Photos</h2>
      <button type="button" data-add-photo>Add photo URL</button>
    </div>
    ${(product.photos ?? []).map((photo, index) => renderPhotoRow(photo, index)).join("")}
  `;

  const renderSizeRow = (size, index) => `
    <fieldset class="admin-size-row" data-size-index="${index}">
      <label><span>Label</span><input name="size-label" value="${escapeHtml(size.label ?? "")}" /></label>
      <label><span>Pieces</span><input name="size-pieces" value="${escapeHtml(size.pieces ?? "")}" /></label>
      <label><span>Diameter cm</span><input name="size-diameter" type="number" step="0.1" value="${escapeHtml(size.diameterCm ?? "")}" /></label>
      <label><span>Height cm</span><input name="size-height" type="number" step="0.1" value="${escapeHtml(size.heightCm ?? "")}" /></label>
      <label><span>Price</span><input name="size-price" type="number" step="0.01" value="${escapeHtml(size.price ?? "")}" /></label>
      <label><span>Sort</span><input name="size-sort" type="number" step="1" value="${escapeHtml(size.sortOrder ?? index + 1)}" /></label>
      <button type="button" data-remove-size="${index}">Remove</button>
    </fieldset>
  `;

  const renderPhotoRow = (photo, index) => `
    <fieldset class="admin-photo-row" data-photo-index="${index}">
      <label><span>URL/path</span><input name="photo-src" value="${escapeHtml(photo.src ?? "")}" /></label>
      <label><span>Alt text</span><input name="photo-alt" value="${escapeHtml(photo.alt ?? "")}" /></label>
      <label><span>Sort</span><input name="photo-sort" type="number" step="1" value="${escapeHtml(photo.sortOrder ?? index + 1)}" /></label>
      <button type="button" data-remove-photo="${index}">Remove</button>
    </fieldset>
  `;

  const updateProductFromForm = () => {
    const product = selectedProduct();
    const form = root.querySelector("[data-admin-form]");
    if (!product || !form) return;

    const formData = new FormData(form);
    product.name = formData.get("name")?.toString() ?? "";
    product.category = formData.get("category")?.toString() ?? "";
    product.description = formData.get("description")?.toString() ?? "";
    product.shape = formData.get("shape")?.toString() ?? "box";
    product.color = formData.get("color")?.toString() ?? "#7a3f2a";
    product.accent = formData.get("accent")?.toString() ?? "#fff1d7";
    product.isActive = formData.get("isActive") === "on";
    product.sizes = [...form.querySelectorAll("[data-size-index]")].map((row, index) => ({
      label: row.querySelector("[name='size-label']").value,
      pieces: row.querySelector("[name='size-pieces']").value,
      diameterCm: Number(row.querySelector("[name='size-diameter']").value),
      heightCm: Number(row.querySelector("[name='size-height']").value),
      price: Number(row.querySelector("[name='size-price']").value),
      sortOrder: Number(row.querySelector("[name='size-sort']").value || index + 1),
    }));
    product.photos = [...form.querySelectorAll("[data-photo-index]")].map((row, index) => ({
      src: row.querySelector("[name='photo-src']").value,
      alt: row.querySelector("[name='photo-alt']").value,
      sortOrder: Number(row.querySelector("[name='photo-sort']").value || index + 1),
    }));
  };

  root.addEventListener("input", updateProductFromForm);
  root.addEventListener("change", updateProductFromForm);
  root.addEventListener("submit", (event) => {
    event.preventDefault();
    updateProductFromForm();
  });
  root.addEventListener("click", async (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.dataset.selectProduct) {
      updateProductFromForm();
      selectedProductId = target.dataset.selectProduct;
      render();
    }

    if (target.dataset.addProduct !== undefined) {
      updateProductFromForm();
      const categoryId = categories()[0]?.id ?? "tubes";
      const product = createBlankProduct(categoryId);
      if (menu.products) menu.products.push(product);
      else {
        menu.menuItems = products();
        menu.menuItems.push(product);
      }
      selectedProductId = product.id;
      render();
    }

    if (target.dataset.addSize !== undefined) {
      updateProductFromForm();
      const product = selectedProduct();
      product.sizes.push({ label: "New size", pieces: "", diameterCm: 10, heightCm: 5, price: 1, sortOrder: product.sizes.length + 1 });
      render();
    }

    if (target.dataset.addPhoto !== undefined) {
      updateProductFromForm();
      const product = selectedProduct();
      product.photos.push({ src: "./products/brownie-tube.webp", alt: "Product photo", sortOrder: product.photos.length + 1 });
      render();
    }

    if (target.dataset.removeSize) {
      updateProductFromForm();
      selectedProduct().sizes.splice(Number(target.dataset.removeSize), 1);
      render();
    }

    if (target.dataset.removePhoto) {
      updateProductFromForm();
      selectedProduct().photos.splice(Number(target.dataset.removePhoto), 1);
      render();
    }

    if (target.dataset.adminSave !== undefined) {
      updateProductFromForm();
      const status = root.querySelector("[data-save-status]");
      if (status) status.textContent = "Saving...";
      try {
        const response = await fetch("/api/admin/menu", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ menu }),
        });
        if (!response.ok) throw new Error("Save failed");
        const payload = await response.json();
        menu = payload.menu ?? menu;
        render("Saved.");
      } catch {
        if (status) status.textContent = "Could not save menu.";
      }
    }
  });

  await loadMenu();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
