import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json" with { type: "json" };
import deploymentEnvironment from "./config/deployment-env.json" with {
  type: "json",
};

const appVersion = packageJson.version ?? "0.0.0";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const localEnvironment = loadEnv(mode, process.cwd(), "VITE_");
  const effectiveDeploymentEnvironment = Object.fromEntries(
    Object.entries(deploymentEnvironment).map(([key, fallback]) => [
      key,
      localEnvironment[key]?.trim() || fallback,
    ]),
  );

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      ...Object.fromEntries(
        Object.entries(effectiveDeploymentEnvironment).map(([key, value]) => [
          `import.meta.env.${key}`,
          JSON.stringify(value),
        ]),
      ),
    },
  };
});
