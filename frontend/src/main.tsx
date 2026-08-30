import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/lora";
import "@fontsource-variable/jetbrains-mono";
import "@/styles/index.css";
import App from "@/App";

// stamp before first paint so nothing ever flashes unstyled
document.documentElement.dataset.theme = "dark";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
