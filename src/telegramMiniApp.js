export function telegramWebApp(environment = globalThis) {
  return environment.Telegram?.WebApp;
}

export function isTelegramMiniApp(environment = globalThis) {
  const miniApp = telegramWebApp(environment);

  return Boolean(
    miniApp &&
      (miniApp.initData ||
        miniApp.initDataUnsafe ||
        miniApp.platform ||
        miniApp.version ||
        miniApp.sendData),
  );
}
