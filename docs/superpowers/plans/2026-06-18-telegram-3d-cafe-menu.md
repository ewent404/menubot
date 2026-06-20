# Telegram 3D Cafe Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first Telegram-style cafe menu that helps customers understand product sizes before ordering, including camera AR when supported.

**Architecture:** A Vite static app in `dev/` uses focused JavaScript modules for menu data, size formatting, AR support detection, and app behavior. Three.js renders the selected item with scaled 3D geometry, WebXR powers camera AR when available, and the DOM handles product selection, size selection, comparison mode, quantity, AR fallback messaging, and Telegram order link generation.

**Tech Stack:** Vite, vanilla JavaScript modules, Three.js, Node built-in test runner, CSS.

## Global Constraints

- Create the implementation inside `dev/`.
- First version is a prototype with sample cafe products.
- The primary user problem is showing how big or small each size is outside.
- The UI should be mobile-first and feel suitable for opening from Telegram.
- Use real size choices, prices, and comparison modes.
- Camera AR should ask the phone for AR/camera access when WebXR immersive AR is available.
- If Telegram or the browser does not support AR, keep the normal 3D/ruler/hand/phone comparison available.

---

### Task 1: Data And Size Logic

**Files:**
- Create: `dev/src/menuData.js`
- Create: `dev/src/sizeMath.js`
- Test: `dev/test/menu.test.js`

**Interfaces:**
- Produces: `menuItems`, an array of cafe products with `id`, `name`, `category`, `description`, `color`, `shape`, and `sizes`.
- Produces: `formatSizeLabel(size)` returning a customer-readable dimension string.
- Produces: `getScaleForSize(sizes, selectedSize)` returning a proportional 3D scale number.

- [x] Write failing tests for menu data and size math.
- [x] Implement menu data and size helpers.
- [x] Run `npm test` and verify the tests pass.

### Task 2: Mobile Menu UI

**Files:**
- Create: `dev/index.html`
- Create: `dev/src/styles.css`
- Create: `dev/src/main.js`

**Interfaces:**
- Consumes: `menuItems`, `formatSizeLabel`, and `getScaleForSize`.
- Produces: an interactive product list, category tabs, size cards, comparison controls, quantity controls, and order button.

- [x] Render the product list and selected item detail.
- [x] Wire category, product, size, comparison mode, and quantity state.
- [x] Keep all controls code-native and mobile-friendly.

### Task 3: Three.js Size Viewer

**Files:**
- Modify: `dev/src/main.js`
- Modify: `dev/src/styles.css`

**Interfaces:**
- Consumes: selected product shape and selected size scale.
- Produces: an animated 3D preview plus ruler, phone, and hand comparison modes.

- [x] Create the Three.js scene, camera, lights, renderer, and product mesh.
- [x] Rebuild the mesh when product or size changes.
- [x] Update comparison markers when mode changes.

### Task 4: Verification

**Files:**
- Modify as needed based on test and browser findings.

**Interfaces:**
- Consumes: full app behavior.
- Produces: verified local prototype URL.

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Start the Vite dev server.
- [x] Open the app in the browser and verify the customer flow.

### Task 5: Camera AR

**Files:**
- Create: `dev/src/arSupport.js`
- Test: `dev/test/arSupport.test.js`
- Modify: `dev/src/main.js`
- Modify: `dev/src/styles.css`

**Interfaces:**
- Produces: `resolveArAvailability(environment)` and `getArStatusMessage(result)`.
- Consumes: selected product, selected size, and Three.js renderer.
- Produces: an `Open Camera AR` panel that starts WebXR AR when supported and shows fallback messaging when unsupported.

- [x] Write failing tests for AR availability and status messages.
- [x] Implement AR support detection.
- [x] Add WebXR ARButton-based camera AR entry point.
- [x] Render fallback messaging when AR is unavailable.
- [x] Browser-test the AR sheet and fallback path.
