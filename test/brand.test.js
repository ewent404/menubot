import test from "node:test";
import assert from "node:assert/strict";

import { getBrandAriaLabel, renderBrandLockup } from "../src/brand.js";

test("brand wordmark keeps a readable name with styled pieces", () => {
  const html = renderBrandLockup();

  assert.equal(getBrandAriaLabel(), "BigBunny HomeBake");
  assert.match(html, /aria-label="BigBunny HomeBake"/);
  assert.match(html, /class="brand-big"/);
  assert.match(html, /class="brand-bunny"/);
  assert.match(html, /class="brand-home"/);
  assert.doesNotMatch(html, /SIZE MENU/);
});
