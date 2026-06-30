# BigBunny Admin Menu Tool Design

## Goal

Create a private admin tool for BigBunny HomeBake so the owner can update the Telegram Mini App menu without editing code or redeploying for every product change.

The admin tool should support adding and editing categories, products, prices, sizes, product dimensions, product photos, and availability.

## Recommended Approach

Build a private `/admin` route inside the existing Vercel app and store editable menu data in Supabase.

The customer menu remains at `/`. The admin tool lives at `/admin`. Admin changes are saved to Supabase, and the customer menu loads the latest active products from Supabase. If Supabase is unavailable or not configured, the app falls back to the current local `src/menuData.js` products so the menu still works.

## Users

- Customer: opens the Telegram Mini App, views products, fills order details, and submits an order.
- Owner/admin: opens `/admin`, logs in, and manages menu content.

## Admin Features

- Login with an admin password.
- View current categories and products.
- Add/edit/delete categories.
- Add/edit products:
  - product name
  - category
  - description
  - 3D preview shape
  - product color/accent color
  - visible/hidden status
- Add/edit sizes:
  - size label
  - pieces text
  - diameter/width in centimeters
  - height in centimeters
  - price
- Add/change product photos.
- Save changes and immediately update the customer menu.

## Data Model

Supabase tables:

- `categories`
  - `id`
  - `label`
  - `sort_order`
  - `is_active`
- `products`
  - `id`
  - `category_id`
  - `name`
  - `description`
  - `shape`
  - `color`
  - `accent`
  - `photo_alt`
  - `sort_order`
  - `is_active`
- `product_sizes`
  - `id`
  - `product_id`
  - `label`
  - `pieces`
  - `diameter_cm`
  - `height_cm`
  - `price`
  - `sort_order`
- `product_photos`
  - `id`
  - `product_id`
  - `src`
  - `alt`
  - `sort_order`

Product images should be stored in Supabase Storage later. For the first implementation, the admin can accept image URLs or existing `/products/...` paths so we can ship the editor without building a full upload pipeline first.

## App Architecture

- Keep local menu data as the fallback source.
- Add a menu repository module that can:
  - return local fallback data
  - normalize Supabase data into the existing `categories` and `menuItems` shape
  - validate required fields before rendering
- Update the customer app to load menu data asynchronously.
- Add `/admin` route detection in the frontend entry point.
- Add admin UI modules for listing and editing products.
- Add serverless API endpoints for admin reads/writes so Supabase service keys never ship to the browser.

## Security

- Admin page requires an `ADMIN_PASSWORD`.
- Serverless admin APIs validate the password before allowing writes.
- Supabase service role key stays only in Vercel environment variables.
- Customer browser only receives public menu data.
- Bot tokens remain server-only.

## API Endpoints

- `GET /api/menu`
  - returns active categories/products for the customer menu
  - falls back to local menu data if Supabase is not configured
- `POST /api/admin/login`
  - validates admin password
- `GET /api/admin/menu`
  - returns all categories/products, including hidden items
- `POST /api/admin/menu`
  - saves categories/products/sizes/photos

For the first version, login can use a short-lived browser session value checked by the admin API. A later version can upgrade to Supabase Auth.

## UX Direction

The admin page should be practical and fast:

- Left side: product list grouped by category.
- Right side: edit form for selected product.
- Clear save state: saving, saved, error.
- Product visibility toggle.
- Size rows with add/remove controls.
- Photo rows with preview.
- Mobile-friendly layout so the owner can edit from a phone.

## Error Handling

- If menu loading fails for customers, show the local fallback menu.
- If admin save fails, keep form data on screen and show the error.
- If required fields are missing, prevent save and highlight fields.
- If image URL/path is broken, keep the product editable and show a placeholder.

## Testing

Add tests for:

- fallback menu remains available
- Supabase rows normalize into the current menu shape
- inactive products/categories are hidden from customer menu
- admin API rejects missing/wrong password
- admin API accepts valid menu payload
- customer app can render async menu data

## First Implementation Scope

Build the admin tool with URL/path-based photos first. Full image upload to Supabase Storage is a follow-up.

This keeps the first release small enough to test quickly while still solving the main problem: changing category, product, price, size, and image references without touching app code.
