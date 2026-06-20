import test from "node:test";
import assert from "node:assert/strict";

import { getArStatusMessage, resolveArAvailability } from "../src/arSupport.js";

test("AR availability is blocked when the page is not in a secure context", async () => {
  const result = await resolveArAvailability({
    isSecureContext: false,
    xr: {
      isSessionSupported: async () => true,
    },
  });

  assert.deepEqual(result, {
    supported: false,
    reason: "secure-context-required",
  });
});

test("AR availability reports supported when immersive AR exists", async () => {
  const result = await resolveArAvailability({
    isSecureContext: true,
    xr: {
      isSessionSupported: async (mode) => mode === "immersive-ar",
    },
  });

  assert.deepEqual(result, {
    supported: true,
    reason: "available",
  });
});

test("AR status message tells users what to do next", () => {
  assert.equal(
    getArStatusMessage({ supported: true, reason: "available" }),
    "Camera AR is available. Tap Start Camera AR and allow camera access.",
  );
  assert.equal(
    getArStatusMessage({ supported: false, reason: "not-supported" }),
    "Camera AR is not available here. You can still view the product photo and choose a size before ordering.",
  );
});
