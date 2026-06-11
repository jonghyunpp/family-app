import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// PWA 서비스 워커 등록
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/family-app/sw.js");
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
