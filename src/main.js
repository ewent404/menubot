import { getArStatusMessage, resolveArAvailability } from "./arSupport.js";
import { renderBrandLockup } from "./brand.js";
import { categories, menuItems } from "./menuData.js";
import { createMiniAppOrderData, createOrderText, createTelegramOrderLink } from "./orderLink.js";
import { previewFeatures } from "./previewConfig.js";
import { formatMoney, formatSizeLabel, getScaleForSize } from "./sizeMath.js";
import { isTelegramMiniApp, telegramWebApp } from "./telegramMiniApp.js";
import "./styles.css";

const state = {
  categoryId: "tubes",
  itemId: "brownie-tube",
  sizeIndex: 0,
  photoIndex: 0,
  quantity: 1,
  orderDetailsOpen: false,
  arOpen: false,
  arAvailability: { supported: false, reason: "checking" },
};

const app = document.querySelector("#app");

app.innerHTML = `
  <main class="phone-shell ${isTelegramMiniApp() ? "telegram-mini-app" : ""}">
    <header class="topbar">
      <button class="link-button" type="button">Close</button>
      <div class="brand-lockup">
        ${renderBrandLockup()}
      </div>
      <button class="round-button" type="button" aria-label="More options">•••</button>
    </header>

    <nav class="tabs" aria-label="Menu categories"></nav>

    <section class="content-grid">
      <aside class="product-list" aria-label="Products"></aside>
      <section class="details" aria-live="polite">
        <div class="details-copy"></div>
        <div class="photo-hero"></div>
        <div class="ar-panel"></div>
        <div class="size-panel"></div>
      </section>
    </section>

    <footer class="checkout-bar"></footer>
    <section class="ar-sheet" hidden aria-live="polite"></section>
  </main>
`;

const tabsEl = app.querySelector(".tabs");
const productListEl = app.querySelector(".product-list");
const detailsCopyEl = app.querySelector(".details-copy");
const sizePanelEl = app.querySelector(".size-panel");
const checkoutEl = app.querySelector(".checkout-bar");
const photoHeroEl = app.querySelector(".photo-hero");
const arPanelEl = app.querySelector(".ar-panel");
const arSheetEl = app.querySelector(".ar-sheet");

let scene;
let camera;
let renderer;
let productGroup;
let animationFrame;
let THREE;
let ARButton;
let arRuntimePromise;
let photoRenderToken = 0;
const photoPreloadPromises = new Map();

function selectedItem() {
  return menuItems.find((item) => item.id === state.itemId) ?? menuItems[0];
}

function selectedSize() {
  const item = selectedItem();
  return item.sizes[state.sizeIndex] ?? item.sizes[0];
}

function selectedPhoto() {
  const item = selectedItem();
  return item.photos?.[state.photoIndex] ?? {
    src: item.photo,
    alt: item.photoAlt,
  };
}

function setState(patch, options = {}) {
  Object.assign(state, patch);
  if (options.renderMode === "checkout") {
    renderCheckout();
    return;
  }
  if (options.renderMode === "ar-sheet") {
    renderArSheet();
    return;
  }
  render();
}

function renderTabs() {
  tabsEl.innerHTML = categories
    .map(
      (category) => `
        <button class="tab ${category.id === state.categoryId ? "active" : ""}" data-category="${category.id}" type="button">
          <span>${category.label}</span>
        </button>
      `,
    )
    .join("");
}

function renderProducts() {
  const items = menuItems.filter((item) => item.category === state.categoryId);
  productListEl.innerHTML = items
    .map((item) => {
      const lowestPrice = Math.min(...item.sizes.map((size) => size.price));
      return `
        <button class="product-card ${item.id === state.itemId ? "active" : ""}" data-item="${item.id}" type="button">
          <span class="product-thumb-frame">
            <img class="product-thumb" src="${item.photo}" alt="${item.photoAlt}" loading="eager" decoding="async" />
          </span>
          <span class="product-card-copy">
            <strong>${item.name}</strong>
            <em>${formatMoney(lowestPrice)}</em>
          </span>
        </button>
      `;
    })
    .join("");
}

function renderDetails() {
  const item = selectedItem();
  const size = selectedSize();

  detailsCopyEl.innerHTML = `
    <h2>${item.name}</h2>
    <p>${item.description}</p>
  `;

  renderPhotoHero();
  sizePanelEl.innerHTML = `
    <h3>Choose size</h3>
    <div class="size-options">
      ${item.sizes
        .map(
          (option, index) => `
            <button class="size-card ${index === state.sizeIndex ? "active" : ""}" data-size="${index}" type="button">
              <strong>${option.label}</strong>
              <span>${formatSizeLabel(option)}</span>
              <em>${formatMoney(option.price)}</em>
            </button>
          `,
        )
        .join("")}
    </div>
  `;

  arPanelEl.innerHTML = `
    <button class="ar-open-button" data-open-ar type="button">
      <span>Open Camera AR</span>
      <small>See ${item.name} at real size on your table</small>
    </button>
  `;

  renderCheckout();
  renderArSheet();
}

async function renderPhotoHero() {
  const item = selectedItem();
  const photo = selectedPhoto();
  const token = (photoRenderToken += 1);
  const existingPhoto = photoHeroEl.querySelector(".hero-photo");

  if (!existingPhoto) {
    photoHeroEl.innerHTML = `
      <img class="hero-photo" src="${photo.src}" alt="${photo.alt}" decoding="async" fetchpriority="high" />
      <div class="photo-strip" aria-label="Product photos"></div>
    `;
  }

  renderPhotoStrip(item);

  const heroPhoto = photoHeroEl.querySelector(".hero-photo");
  if (!heroPhoto || heroPhoto.getAttribute("src") === photo.src) {
    if (heroPhoto) heroPhoto.alt = photo.alt;
    return;
  }

  photoHeroEl.classList.add("is-loading-next-photo");
  await preloadImage(photo.src, { fetchPriority: "high" });
  if (token !== photoRenderToken) return;

  heroPhoto.src = photo.src;
  heroPhoto.alt = photo.alt;
  photoHeroEl.classList.remove("is-loading-next-photo");
}

function renderPhotoStrip(item) {
  const strip = photoHeroEl.querySelector(".photo-strip");
  if (!strip) return;

  strip.innerHTML = item.photos
    .map(
      (option, index) => `
        <button class="photo-thumb ${index === state.photoIndex ? "active" : ""}" data-photo="${index}" type="button" aria-label="Show photo ${index + 1}">
          <img src="${option.src}" alt="" loading="eager" decoding="async" />
        </button>
      `,
    )
    .join("");
}

function renderCheckout() {
  const item = selectedItem();
  const size = selectedSize();
  const orderDetails = isTelegramMiniApp() && state.orderDetailsOpen
      ? `
      <form class="order-details" data-order-details>
        <h3>Customer details / ព័ត៌មានអតិថិជន</h3>
        <label>
          <span>Name / ឈ្មោះ</span>
          <input name="customerName" type="text" autocomplete="name" placeholder="Your name / ឈ្មោះ" />
        </label>
        <label>
          <span>Phone number / លេខទូរស័ព្ទ</span>
          <input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="Phone number / លេខទូរស័ព្ទ" required />
        </label>
        <fieldset>
          <legend>Pickup or delivery / មកយក ឬ ដឹកជញ្ជូន</legend>
          <label><input name="fulfillment" type="radio" value="pickup" checked /> Pickup / មកយក</label>
          <label><input name="fulfillment" type="radio" value="delivery" /> Delivery / ដឹកជញ្ជូន</label>
        </fieldset>
        <label>
          <span>Delivery location / ទីតាំងដឹកជញ្ជូន</span>
          <input name="location" type="text" placeholder="Required for delivery / ត្រូវការសម្រាប់ដឹកជញ្ជូន" />
        </label>
        <label>
          <span>Preferred time / ម៉ោងចង់បាន</span>
          <input name="time" type="text" placeholder="Example: today 6 PM / ឧ. ថ្ងៃនេះ 6PM" />
        </label>
        <fieldset>
          <legend>Payment / ការទូទាត់</legend>
          <label><input name="paymentMethod" type="radio" value="pay-now" checked /> Pay now / បង់ឥឡូវនេះ</label>
          <label><input name="paymentMethod" type="radio" value="pay-on-delivery" /> Pay on delivery / pickup</label>
        </fieldset>
        <div class="pay-now-help">
          <strong>Pay now / បង់ឥឡូវនេះ</strong>
          <span>Scan the QR if available, then send payment screenshot in Telegram.</span>
          <img src="/pay-now-qr.png" alt="Pay Now QR" loading="lazy" onerror="this.hidden=true" />
        </div>
        <label>
          <span>Note / ចំណាំ</span>
          <textarea name="note" rows="2" placeholder="Optional / បន្ថែមបើមាន"></textarea>
        </label>
      </form>
    `
    : "";

  checkoutEl.innerHTML = `
    <div>
      <strong>${formatMoney(size.price * state.quantity)}</strong>
      <span>${size.label} · ${formatSizeLabel(size)}</span>
    </div>
    <div class="quantity">
      <button data-qty="-1" type="button" aria-label="Decrease quantity">−</button>
      <span>${state.quantity}</span>
      <button data-qty="1" type="button" aria-label="Increase quantity">+</button>
    </div>
    ${orderDetails}
    <a class="order-button" href="${isTelegramMiniApp() ? "#" : createTelegramOrderLink({ item, size, quantity: state.quantity })}" data-order-text="${encodeURIComponent(createOrderText({ item, size, quantity: state.quantity }))}" data-mini-app-order="${encodeURIComponent(createMiniAppOrderData({ item, size, quantity: state.quantity }))}" target="_blank" rel="noreferrer">${isTelegramMiniApp() && state.orderDetailsOpen ? "Confirm order" : isTelegramMiniApp() ? "Send order to bot" : "Order in Telegram"}</a>
    <p class="order-status" aria-live="polite"></p>
  `;
}

function renderArSheet() {
  const item = selectedItem();
  const size = selectedSize();
  const arStatus = getArStatusMessage(state.arAvailability);

  arSheetEl.hidden = !state.arOpen;
  arSheetEl.innerHTML = state.arOpen
    ? `
      <div class="ar-card">
        <div class="ar-card-header">
          <div>
            <h2>Camera AR size</h2>
            <p>${item.name} · ${size.label} · ${formatSizeLabel(size)}</p>
          </div>
          <button class="ar-close" data-close-ar type="button" aria-label="Close AR panel">×</button>
        </div>
        <div class="ar-instructions">
          <strong>${state.arAvailability.supported ? "Ready for camera" : "AR fallback"}</strong>
          <span>${arStatus}</span>
        </div>
        <div class="ar-button-slot"></div>
        <p class="ar-note">If Telegram does not allow camera AR on this phone, open this menu in the phone browser. The product photo remains available in the menu.</p>
      </div>
    `
    : "";

  if (state.arOpen) {
    mountArButton();
  }
}

async function loadArRuntime() {
  if (!arRuntimePromise) {
    arRuntimePromise = Promise.all([
      import("three"),
      import("three/examples/jsm/webxr/ARButton.js"),
    ]).then(([threeModule, arButtonModule]) => {
      THREE = threeModule;
      ARButton = arButtonModule.ARButton;
    });
  }

  await arRuntimePromise;
}

async function mountArButton() {
  const slot = arSheetEl.querySelector(".ar-button-slot");
  if (!slot) return;

  if (!state.arAvailability.supported) {
    slot.innerHTML = `<button class="ar-disabled-button" type="button" disabled>Camera AR not available here</button>`;
    return;
  }

  slot.innerHTML = `<button class="ar-disabled-button" type="button" disabled>Loading AR...</button>`;
  await initThree();
  if (!renderer) return;

  renderer.xr.enabled = true;
  const arButton = ARButton.createButton(renderer, {
    optionalFeatures: ["dom-overlay", "local-floor"],
    domOverlay: { root: document.body },
  });
  arButton.textContent = "Start Camera AR";
  arButton.className = "ar-start-button";
  slot.replaceChildren(arButton);
}

async function initThree() {
  if (renderer) return;

  await loadArRuntime();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 3.2, 7);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(1, 1);
  renderer.xr.enabled = true;
  renderer.domElement.hidden = true;

  scene.add(new THREE.AmbientLight(0xffffff, 1.7));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const grid = new THREE.GridHelper(7, 14, "#d5dde4", "#edf1f3");
  grid.position.y = -0.68;
  scene.add(grid);

  productGroup = new THREE.Group();
  scene.add(productGroup);

  renderer.xr.addEventListener("sessionstart", () => {
    productGroup.rotation.set(0, 0, 0);
    productGroup.position.set(0, -0.25, -0.65);
    buildProductMesh({ realWorld: true });
  });

  renderer.xr.addEventListener("sessionend", () => {
    productGroup.position.set(0, 0, 0);
    buildProductMesh({ realWorld: false });
  });

  animate();
}

function animate() {
  animationFrame = requestAnimationFrame(animate);
  if (productGroup) {
    productGroup.rotation.y += 0.008;
  }
  renderer.render(scene, camera);
}

function updateProductMesh() {
  if (!productGroup) return;
  buildProductMesh({ realWorld: renderer?.xr?.isPresenting === true });
}

function buildProductMesh({ realWorld }) {
  if (!productGroup) return;

  productGroup.clear();
  const item = selectedItem();
  const size = selectedSize();
  const displayScale = getScaleForSize(item.sizes, size);
  const diameterMeters = (size.diameterCm ?? size.heightCm ?? 10) / 100;
  const heightMeters = (size.heightCm ?? size.diameterCm ?? 8) / 100;
  const scale = realWorld ? 1 : displayScale;
  const radius = realWorld ? diameterMeters / 2 : 1.15 * scale;
  const height = realWorld ? heightMeters : 0.28;
  const material = new THREE.MeshStandardMaterial({
    color: item.color,
    roughness: 0.58,
    metalness: 0.02,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: item.accent,
    roughness: 0.7,
  });

  if (item.shape === "cookie") {
    const cookie = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, realWorld ? Math.max(0.015, height * 0.18) : height, 64), material);
    cookie.rotation.x = Math.PI / 2;
    productGroup.add(cookie);
    addChocolateChips(scale, accentMaterial, realWorld ? radius : null);
  } else if (item.shape === "cup" || item.shape === "mug") {
    const cupHeight = realWorld ? heightMeters : 1.9 * scale;
    const cupRadius = realWorld ? Math.max(0.035, cupHeight * 0.28) : 0.7 * scale;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(cupRadius, cupRadius * 0.72, cupHeight, 48), material);
    productGroup.add(cup);
    const foam = new THREE.Mesh(new THREE.CylinderGeometry(cupRadius * 1.02, cupRadius * 1.02, realWorld ? 0.008 : 0.08, 48), accentMaterial);
    foam.position.y = cupHeight * 0.52;
    productGroup.add(foam);
  } else if (item.shape === "slice") {
    const slice = new THREE.Mesh(new THREE.ConeGeometry(realWorld ? radius : 1.25 * scale, realWorld ? heightMeters : 0.85 * scale, 3), material);
    slice.rotation.y = Math.PI / 3;
    productGroup.add(slice);
    const filling = new THREE.Mesh(new THREE.BoxGeometry(realWorld ? radius : 1.2 * scale, realWorld ? 0.012 : 0.12, realWorld ? 0.018 : 0.18), accentMaterial);
    filling.position.y = realWorld ? 0.008 : 0.08;
    productGroup.add(filling);
  } else if (item.shape === "box") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(realWorld ? diameterMeters : 2.0 * scale, realWorld ? heightMeters : 0.35 * scale, realWorld ? diameterMeters * 0.72 : 1.45 * scale), material);
    productGroup.add(box);
    for (let index = 0; index < 4; index += 1) {
      const cookie = new THREE.Mesh(new THREE.CylinderGeometry(realWorld ? diameterMeters * 0.12 : 0.28 * scale, realWorld ? diameterMeters * 0.13 : 0.3 * scale, realWorld ? 0.008 : 0.08, 24), accentMaterial);
      cookie.rotation.x = Math.PI / 2;
      const x = realWorld ? diameterMeters * 0.22 : 0.45;
      const z = realWorld ? diameterMeters * 0.16 : 0.32;
      cookie.position.set(index % 2 === 0 ? -x : x, realWorld ? heightMeters * 0.62 : 0.28, index < 2 ? -z : z);
      productGroup.add(cookie);
    }
  } else {
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(realWorld ? radius : 0.95 * scale, realWorld ? radius : 0.95 * scale, realWorld ? heightMeters : 0.88 * scale, 64), material);
    productGroup.add(cake);
    const berry = new THREE.Mesh(new THREE.SphereGeometry(realWorld ? radius * 0.16 : 0.16 * scale, 24, 16), accentMaterial);
    berry.position.y = realWorld ? heightMeters * 0.58 : 0.55 * scale;
    productGroup.add(berry);
  }

  productGroup.scale.setScalar(realWorld ? 1 : 0.95);
  productGroup.rotation.set(realWorld ? 0 : -0.08, realWorld ? 0 : 0.45, 0);
}

function addChocolateChips(scale, material, realRadius = null) {
  const positions = [
    [-0.6, 0.17, -0.18],
    [-0.1, 0.18, 0.45],
    [0.46, 0.18, 0.24],
    [0.58, 0.17, -0.36],
    [0.02, 0.19, -0.52],
    [-0.36, 0.18, 0.22],
  ];

  positions.forEach(([x, y, z]) => {
    const chipRadius = realRadius ? realRadius * 0.09 : 0.11 * scale;
    const chip = new THREE.Mesh(new THREE.SphereGeometry(chipRadius, 16, 10), material);
    chip.position.set(realRadius ? x * realRadius * 0.78 : x * scale, realRadius ? chipRadius : y, realRadius ? z * realRadius * 0.78 : z * scale);
    productGroup.add(chip);
  });
}

function bindEvents() {
  app.addEventListener("click", (event) => {
    const category = event.target.closest("[data-category]");
    const item = event.target.closest("[data-item]");
    const size = event.target.closest("[data-size]");
    const qty = event.target.closest("[data-qty]");
    const openAr = event.target.closest("[data-open-ar]");
    const closeAr = event.target.closest("[data-close-ar]");
    const orderLink = event.target.closest(".order-button");

    if (category) {
      const nextCategory = category.dataset.category;
      const firstItem = menuItems.find((menuItem) => menuItem.category === nextCategory);
      preloadItemPhotos(firstItem.id);
      setState({ categoryId: nextCategory, itemId: firstItem.id, sizeIndex: 0, photoIndex: 0, orderDetailsOpen: false });
    }

    if (item) {
      preloadItemPhotos(item.dataset.item);
      setState({ itemId: item.dataset.item, sizeIndex: 0, photoIndex: 0, orderDetailsOpen: false });
    }
    if (size) setState({ sizeIndex: Number(size.dataset.size), orderDetailsOpen: false });
    const photo = event.target.closest("[data-photo]");
    if (photo) setState({ photoIndex: Number(photo.dataset.photo) });
    if (qty) {
      setState({ quantity: Math.max(1, state.quantity + Number(qty.dataset.qty)) }, { renderMode: "checkout" });
    }
    if (openAr) setState({ arOpen: true }, { renderMode: "ar-sheet" });
    if (closeAr) setState({ arOpen: false }, { renderMode: "ar-sheet" });
    if (orderLink) handleOrder(orderLink, event);
  });

  window.addEventListener("resize", () => {
    if (!renderer) return;
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    renderer.setSize(1, 1);
  });
}

async function handleOrder(orderLink, event) {
  const miniApp = telegramWebApp();
  const miniAppOrder = decodeURIComponent(orderLink.dataset.miniAppOrder ?? "");

  if (isTelegramMiniApp() && miniAppOrder) {
    event.preventDefault();
    const status = checkoutEl.querySelector(".order-status");

    if (!state.orderDetailsOpen) {
      setState({ orderDetailsOpen: true }, { renderMode: "checkout" });
      checkoutEl.querySelector("[name='phone']")?.focus();
      return;
    }

    const orderDetails = collectOrderDetails();
    if (!orderDetails.ok) {
      if (status) status.textContent = orderDetails.error;
      return;
    }

    if (status) status.textContent = "Sending order...";
    const finalMiniAppOrder = prepareMiniAppOrder(miniAppOrder, orderDetails.customer);

    try {
      await submitMiniAppOrder(finalMiniAppOrder, miniApp);
      if (status) status.textContent = "Order sent. Returning to Telegram chat...";
      window.setTimeout(() => miniApp?.close?.(), 650);
    } catch {
      if (miniApp?.sendData) {
        miniApp.sendData(finalMiniAppOrder);
        if (status) status.textContent = "Order sent. Returning to Telegram chat...";
        window.setTimeout(() => miniApp.close?.(), 650);
        return;
      }

      if (status) status.textContent = "Could not send order. Please try again.";
    }
    return;
  }

  await copyOrderText(orderLink);
}

function createOrderNumber(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `BB-${month}${day}-${hour}${minute}${second}`;
}

function collectOrderDetails() {
  const form = checkoutEl.querySelector("[data-order-details]");
  if (!form) return { ok: false, error: "Please add customer details first." };

  const formData = new FormData(form);
  const customer = {
    name: String(formData.get("customerName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    fulfillment: String(formData.get("fulfillment") ?? "pickup"),
    location: String(formData.get("location") ?? "").trim(),
    time: String(formData.get("time") ?? "").trim(),
    paymentMethod: String(formData.get("paymentMethod") ?? "pay-now"),
    note: String(formData.get("note") ?? "").trim(),
  };

  if (!customer.phone) {
    return { ok: false, error: "Phone number is required." };
  }

  if (customer.fulfillment === "delivery" && !customer.location) {
    return { ok: false, error: "Delivery location is required." };
  }

  return { ok: true, customer };
}

function prepareMiniAppOrder(miniAppOrder, customer) {
  const order = JSON.parse(miniAppOrder);
  order.orderNumber = createOrderNumber();
  order.customer = customer;
  return JSON.stringify(order);
}

async function submitMiniAppOrder(miniAppOrder, miniApp) {
  const order = JSON.parse(miniAppOrder);

  const response = await fetch("/api/order-alert", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      order,
      telegramUser: miniApp?.initDataUnsafe?.user,
    }),
  });

  if (!response.ok) {
    throw new Error("Order alert failed");
  }
}

async function copyOrderText(orderLink) {
  const status = checkoutEl.querySelector(".order-status");
  const orderText = decodeURIComponent(orderLink.dataset.orderText ?? "");

  if (!navigator.clipboard || !orderText) {
    if (status) status.textContent = "Telegram opened. Send your order to confirm.";
    return;
  }

  try {
    await navigator.clipboard.writeText(orderText);
    if (status) status.textContent = "Order copied. Paste it in Telegram to confirm.";
  } catch {
    if (status) status.textContent = "Telegram opened. Send your order to confirm.";
  }
}

function render() {
  renderTabs();
  renderProducts();
  renderDetails();
}

function preloadProductPhotos() {
  const preload = () => {
    for (const item of menuItems) {
      preloadItemPhotos(item.id);
    }
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preload, { timeout: 2000 });
    return;
  }

  window.setTimeout(preload, 300);
}

function preloadItemPhotos(itemId) {
  const item = menuItems.find((menuItem) => menuItem.id === itemId);
  if (!item) return;

  for (const photo of item.photos ?? []) {
    preloadImage(photo.src);
  }
}

function preloadImage(src, { fetchPriority = "auto" } = {}) {
  if (photoPreloadPromises.has(src)) return photoPreloadPromises.get(src);

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    if ("fetchPriority" in image) image.fetchPriority = fetchPriority;
    image.onload = () => resolve(src);
    image.onerror = () => resolve(src);
    image.src = src;
    if (image.decode) image.decode().then(() => resolve(src)).catch(() => resolve(src));
  });

  photoPreloadPromises.set(src, promise);
  return promise;
}

bindEvents();
preloadItemPhotos(state.itemId);
render();
preloadProductPhotos();

telegramWebApp()?.ready();
telegramWebApp()?.expand();

resolveArAvailability({
  isSecureContext: window.isSecureContext,
  xr: navigator.xr,
  telegramMiniApp: isTelegramMiniApp(),
  userAgent: navigator.userAgent,
}).then((arAvailability) => {
  setState({ arAvailability }, { renderMode: "ar-sheet" });
});

window.addEventListener("beforeunload", () => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
});
