export function isAdminRoute(pathname = window.location.pathname) {
  return pathname === "/admin" || pathname === "/admin/";
}

function token() {
  return window.sessionStorage.getItem("bigbunny-admin-token") ?? "";
}

function setToken(value) {
  window.sessionStorage.setItem("bigbunny-admin-token", value);
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = new FormData(form).get("password").toString();
    status.textContent = "Checking...";

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      status.textContent = "Wrong password.";
      return;
    }

    setToken(password);
    status.textContent = "Login ok.";
    renderAdminEditor(root, token());
  });

  if (token()) renderAdminEditor(root, token());
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
