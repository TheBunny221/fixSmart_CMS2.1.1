import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./global.css";
import "./utils/i18n";
import { fixResizeObserverError } from "./utils/resizeObserverFix";

// Preserve original fetch BEFORE any third-party libraries can override it
// This is critical for FullStory and other analytics libraries
if (
  typeof globalThis !== "undefined" &&
  globalThis.fetch &&
  !(globalThis as any).__originalFetch
) {
  (globalThis as any).__originalFetch = globalThis.fetch.bind(globalThis);
}
if (
  typeof window !== "undefined" &&
  window.fetch &&
  !(globalThis as any).__originalFetch
) {
  (globalThis as any).__originalFetch = window.fetch.bind(window);
}

// Initialize comprehensive ResizeObserver error fix
fixResizeObserverError();

// Global error handlers for production-grade error handling
window.addEventListener("error", (event) => {
  // Filter out known harmless errors
  if (
    event.error === null ||
    event.message?.includes(
      "ResizeObserver loop completed with undelivered notifications",
    ) ||
    event.message?.includes("ResizeObserver loop limit exceeded")
  ) {
    // These are harmless warnings that can be safely ignored
    return;
  }

  console.error("Global error caught:", event.error);
  // Prevent the error from bubbling up and causing white screens
  event.preventDefault();
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);

  // Handle specific error types that shouldn't crash the app
  if (
    event.reason?.message?.includes("IFrame evaluation timeout") ||
    event.reason?.message?.includes("Response body is already used") ||
    event.reason?.message?.includes("AbortError") ||
    event.reason?.message?.includes("NetworkError") ||
    event.reason?.message?.includes("WebSocket closed without opened") ||
    event.reason?.message?.includes("WebSocket") ||
    event.reason?.toString?.()?.includes("WebSocket")
  ) {
    // These are non-critical errors that can be safely ignored
    console.warn(
      "Non-critical error ignored:",
      event.reason?.message || event.reason,
    );
    event.preventDefault();
    return;
  }

  // For auth-related errors, don't prevent default to allow proper handling
  if (
    event.reason?.message?.includes("401") ||
    event.reason?.message?.includes("Unauthorized") ||
    event.reason?.message?.includes("token")
  ) {
    console.warn("Auth-related error, allowing normal handling");
    return;
  }

  // Prevent the error from causing app crashes
  event.preventDefault();
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
