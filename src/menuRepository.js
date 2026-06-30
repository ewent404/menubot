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
