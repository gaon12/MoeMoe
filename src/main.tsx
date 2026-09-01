import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n/config.ts";
import { App } from "./App.tsx";
import { AppProvider } from "./contexts/AppContext.tsx";
import { registerServiceWorker } from "./utils/serviceWorker.ts";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root application mount element");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);

registerServiceWorker();
