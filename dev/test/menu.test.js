import test from "node:test";
import assert from "node:assert/strict";

import { menuItems } from "../src/menuData.js";
import { previewFeatures } from "../src/previewConfig.js";
import { getScaleForSize, formatSizeLabel } from "../src/sizeMath.js";

test("menu items expose size choices with prices and real dimensions", () => {
  assert.ok(menuItems.length >= 6);

  const brownieTube = menuItems.find((item) => item.id === "brownie-tube");
  assert.equal(brownieTube.name, "Brownie Tube");
  assert.equal(brownieTube.sizes[0].label, "Tube");
  assert.equal(brownieTube.sizes[0].price, 4.5);
  assert.equal(brownieTube.sizes[0].pieces, "15-20 pcs");

  const bananaBread = menuItems.find((item) => item.id === "banana-bread");
  assert.equal(bananaBread.name, "Choco Chip / Almond Banana Bread");
  assert.deepEqual(
    bananaBread.sizes.map((size) => size.label),
    ["Mini tube", "Box"],
  );
  assert.equal(bananaBread.sizes[0].price, 2);
  assert.equal(bananaBread.sizes[1].price, 2.75);
});

test("every menu item has at least two local product photos", () => {
  for (const item of menuItems) {
    assert.match(item.photo, /^\.\/products\/[a-z0-9-]+\.png$/);
    assert.equal(item.photoAlt.length > 0, true);
    assert.equal(Array.isArray(item.photos), true);
    assert.equal(item.photos.length >= 2, true);
    for (const photo of item.photos) {
      assert.match(photo.src, /^\.\/products\/[a-z0-9-]+(?:-\d+)?\.png$/);
      assert.equal(photo.alt.length > 0, true);
    }
  }
});

test("menu keeps AR-focused size preview without manual compare modes", () => {
  assert.deepEqual(previewFeatures, ["photo", "ar"]);
});

test("size labels make physical dimensions readable for customers", () => {
  assert.equal(formatSizeLabel({ diameterCm: 10 }), "10 cm wide");
  assert.equal(formatSizeLabel({ volumeMl: 350 }), "350 ml");
  assert.equal(formatSizeLabel({ diameterCm: 15, heightCm: 8 }), "15 cm x 8 cm");
  assert.equal(formatSizeLabel({ pieces: "15-20 pcs", diameterCm: 6, heightCm: 16 }), "15-20 pcs · 6 cm x 16 cm");
});

test("3D scale grows proportionally from the smallest available size", () => {
  const sizes = [
    { label: "Small", diameterCm: 7 },
    { label: "Regular", diameterCm: 10 },
    { label: "Large", diameterCm: 12.5 },
  ];

  assert.equal(getScaleForSize(sizes, sizes[0]), 1);
  assert.equal(getScaleForSize(sizes, sizes[1]), 1.43);
  assert.equal(getScaleForSize(sizes, sizes[2]), 1.79);
});
