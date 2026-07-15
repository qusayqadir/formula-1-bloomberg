import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/wix-madefor-text";
import "@fontsource-variable/wix-madefor-display";
import "@fontsource-variable/lora";
import "@fontsource-variable/jetbrains-mono";
import "@/styles/index.css";
import App from "@/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
