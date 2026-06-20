export async function resolveArAvailability(environment = globalThis) {
  if (!environment.isSecureContext) {
    return { supported: false, reason: "secure-context-required" };
  }

  if (environment.telegramMiniApp && isAppleMobileUserAgent(environment.userAgent)) {
    return { supported: false, reason: "telegram-ios-webview" };
  }

  if (!environment.xr?.isSessionSupported) {
    return { supported: false, reason: "not-supported" };
  }

  try {
    const supported = await environment.xr.isSessionSupported("immersive-ar");
    return supported
      ? { supported: true, reason: "available" }
      : { supported: false, reason: "not-supported" };
  } catch {
    return { supported: false, reason: "not-supported" };
  }
}

export function getArStatusMessage(result) {
  if (result.supported) {
    return "Camera AR is available. Tap Start Camera AR and allow camera access.";
  }

  if (result.reason === "secure-context-required") {
    return "Camera AR needs HTTPS or localhost. Open this app from a secure link to use the camera.";
  }

  if (result.reason === "telegram-ios-webview") {
    return "Telegram on iPhone does not allow this camera AR mode. Use the product photos and real size details here, or try AR from a supported Android Chrome browser.";
  }

  return "Camera AR is not available here. You can still view the product photo and choose a size before ordering.";
}

function isAppleMobileUserAgent(userAgent = "") {
  return /iPhone|iPad|iPod/i.test(userAgent);
}
