import React from "react";
import ReactDOM from "react-dom/client";
import { Inspector } from "react-dev-inspector";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app/App";

// Automatically register and update service worker for PWA
if (typeof window !== "undefined") {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log("[PWA] New version available.");
    },
    onOfflineReady() {
      console.log("[PWA] Application cached and ready for faster startup.");
    },
    onRegisterError(error) {
      console.warn("[PWA] Service worker registration error:", error);
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Dev-only: Ctrl+Shift+Alt+C → click element → opens file:line in Cursor */}
    <Inspector />
    <App />
  </React.StrictMode>
);
