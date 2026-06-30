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
}
