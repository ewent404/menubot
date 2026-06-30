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
