import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json";

const appVersion = packageJson.version ?? "0.0.0";
const devConsoleFilter = `
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  const originalConsoleWarn = console.warn.bind(console);
  console.warn = (...args) => {
    const [firstArg] = args;
    if (
      typeof firstArg === "string" &&
      firstArg.includes("Something has shimmed the React DevTools global hook")
    ) {
      return;
    }
    originalConsoleWarn(...args);
  };
}
`;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: "moemoe-dev-console-filter",
      transformIndexHtml: {
        order: "pre",
        handler() {
          return [
            {
              tag: "script",
              children: devConsoleFilter,
              injectTo: "head-prepend",
            },
          ];
        },
      },
    },
    react(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
});
