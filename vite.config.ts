import { execFileSync } from "node:child_process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json" with { type: "json" };
import deploymentEnvironment from "./config/deployment-env.json" with {
  type: "json",
};

const appVersion = packageJson.version ?? "0.0.0";

/**
 * The commit this bundle was built from, used at runtime to tell whether the
 * deployed build is behind the repository.
 *
 * An explicit `VITE_APP_COMMIT` wins so a CI build can supply the SHA it
 * checked out. Otherwise it is read from git, and an empty string is a valid
 * answer -- a build from a source tarball has no commit, and the update check
 * stays switched off rather than comparing against a made-up value.
 */
function resolveCommitSha(
  // Typed with `undefined` because an absent key really is absent, which is
  // what makes the optional chain below meaningful rather than defensive.
  environment: Record<string, string | undefined>,
): string {
  const configured = environment.VITE_APP_COMMIT?.trim();
  if (configured) {
    return configured;
  }
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

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
      __APP_COMMIT__: JSON.stringify(resolveCommitSha(localEnvironment)),
      ...Object.fromEntries(
        Object.entries(effectiveDeploymentEnvironment).map(([key, value]) => [
          `import.meta.env.${key}`,
          JSON.stringify(value),
        ]),
      ),
    },
  };
});
