import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/lora";
import "@fontsource-variable/jetbrains-mono";
import "@/styles/index.css";
import App from "@/App";

// stamp before first paint so the stored theme never flashes
document.documentElement.dataset.theme =
  localStorage.getItem("f1-theme") === "light" ? "light" : "dark";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
