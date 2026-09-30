import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Carnet de voyage hors ligne : service worker uniquement sur les pages de voyage partagé
if ("serviceWorker" in navigator && import.meta.env.PROD && window.location.pathname.startsWith("/share/")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
