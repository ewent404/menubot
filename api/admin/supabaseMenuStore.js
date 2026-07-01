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

export function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function supabaseFetch(path, options = {}) {
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
  if (response.status === 204) return null;

  const text = await response.text?.();
  if (typeof text === "string") return text ? JSON.parse(text) : null;
  return response.json();
}

function bySortOrder(left, right) {
  return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
}

function fromCategoryRow(row) {
  return {
    id: row.id,
    label: row.label,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function fromProductRow(row) {
  return {
    id: row.id,
    category: row.category_id,
    name: row.name,
    description: row.description,
    shape: row.shape,
    color: row.color,
    accent: row.accent,
    photoAlt: row.photo_alt,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    sizes: [],
    photos: [],
  };
}

function fromSizeRow(row) {
  return {
    id: row.id,
    label: row.label,
    pieces: row.pieces,
    diameterCm: row.diameter_cm,
    heightCm: row.height_cm,
    price: row.price,
    sortOrder: row.sort_order,
  };
}

function fromPhotoRow(row) {
  return {
    id: row.id,
    src: row.src,
    alt: row.alt,
    sortOrder: row.sort_order,
  };
}

function toCategoryRow(category) {
  return {
    id: String(category.id),
    label: String(category.label ?? category.name ?? category.id),
    sort_order: Number(category.sortOrder ?? category.sort_order ?? 0),
    is_active: category.isActive ?? category.is_active ?? true,
  };
}

function toProductRow(product) {
  return {
    id: String(product.id),
    category_id: String(product.category ?? product.categoryId ?? product.category_id),
    name: String(product.name ?? ""),
    description: String(product.description ?? ""),
    shape: String(product.shape ?? "box"),
    color: String(product.color ?? "#7a3f2a"),
    accent: String(product.accent ?? "#fff1d7"),
    photo_alt: String(product.photoAlt ?? product.photo_alt ?? product.name ?? ""),
    sort_order: Number(product.sortOrder ?? product.sort_order ?? 0),
    is_active: product.isActive ?? product.is_active ?? true,
  };
}

function toSizeRow(product, size, index) {
  const sortOrder = Number(size.sortOrder ?? size.sort_order ?? index + 1);
  return {
    id: String(size.id ?? `${product.id}-size-${sortOrder}`),
    product_id: String(product.id),
    label: String(size.label ?? ""),
    pieces: size.pieces ? String(size.pieces) : null,
    diameter_cm: Number(size.diameterCm ?? size.diameter_cm ?? 0),
    height_cm: Number(size.heightCm ?? size.height_cm ?? 0),
    price: Number(size.price ?? 0),
    sort_order: sortOrder,
  };
}

function toPhotoRow(product, photo, index) {
  const sortOrder = Number(photo.sortOrder ?? photo.sort_order ?? index + 1);
  return {
    id: String(photo.id ?? `${product.id}-photo-${sortOrder}`),
    product_id: String(product.id),
    src: String(photo.src ?? ""),
    alt: String(photo.alt ?? product.name ?? ""),
    sort_order: sortOrder,
  };
}

function adminMenuFromRows(categories, products, sizes, photos) {
  const productsById = new Map(products.map((row) => [row.id, fromProductRow(row)]));

  for (const size of sizes) {
    productsById.get(size.product_id)?.sizes.push(fromSizeRow(size));
  }

  for (const photo of photos) {
    productsById.get(photo.product_id)?.photos.push(fromPhotoRow(photo));
  }

  return {
    categories: categories.map(fromCategoryRow).sort(bySortOrder),
    products: [...productsById.values()].map((product) => ({
      ...product,
      sizes: product.sizes.sort(bySortOrder),
      photos: product.photos.sort(bySortOrder),
    })).sort(bySortOrder),
  };
}

function adminMenuFromInput(menu) {
  return {
    categories: Array.isArray(menu.categories) ? menu.categories : [],
    products: Array.isArray(menu.products) ? menu.products : [],
  };
}

async function upsertRows(table, rows) {
  if (rows.length === 0) return null;

  return supabaseFetch(table, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(rows),
  });
}

export async function loadAdminMenu() {
  if (!supabaseConfigured()) {
    return memoryMenu ?? fallbackAdminMenu();
  }

  const [categories, products, sizes, photos] = await Promise.all([
    supabaseFetch("categories?select=*&order=sort_order.asc"),
    supabaseFetch("products?select=*&order=sort_order.asc"),
    supabaseFetch("product_sizes?select=*&order=sort_order.asc"),
    supabaseFetch("product_photos?select=*&order=sort_order.asc"),
  ]);

  return adminMenuFromRows(categories ?? [], products ?? [], sizes ?? [], photos ?? []);
}

export async function saveAdminMenu(menu) {
  const adminMenu = adminMenuFromInput(menu);

  if (!supabaseConfigured()) {
    memoryMenu = adminMenu;
    return memoryMenu;
  }

  const categoryRows = adminMenu.categories.map(toCategoryRow);
  const productRows = adminMenu.products.map(toProductRow);
  const sizeRows = adminMenu.products.flatMap((product) =>
    (Array.isArray(product.sizes) ? product.sizes : []).map((size, index) => toSizeRow(product, size, index)),
  );
  const photoRows = adminMenu.products.flatMap((product) =>
    (Array.isArray(product.photos) ? product.photos : []).map((photo, index) => toPhotoRow(product, photo, index)),
  );

  await upsertRows("categories", categoryRows);
  await upsertRows("products", productRows);
  await upsertRows("product_sizes", sizeRows);
  await upsertRows("product_photos", photoRows);

  return adminMenu;
}
