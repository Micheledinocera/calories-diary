// https://nuxt.com/docs/api/configuration/nuxt-config
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * "v<package version> · <short commit>", fixed at build time and shown in the footer:
 * the version changes only with a release, the commit with every deploy.
 * Vercel has no .git in the build: it gives the commit in VERCEL_GIT_COMMIT_SHA.
 */
function versioneApp(): string {
  const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
  let commit = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!commit) {
    try {
      commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    } catch {
      commit = undefined;
    }
  }
  return commit ? `v${version} · ${commit.slice(0, 7)}` : `v${version}`;
}

export default defineNuxtConfig({
  compatibilityDate: "2026-10-25",
  // Private, offline-first app: SPA served as static files, no SSR.
  ssr: false,
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "@nuxt/eslint", "@vite-pwa/nuxt"],
  css: ["~/assets/css/main.css"],

  app: {
    head: {
      htmlAttrs: { lang: "it" },
      title: "Calories Diary",
    },
  },

  runtimeConfig: {
    public: {
      // Overridden by NUXT_PUBLIC_API_BASE.
      apiBase: "http://localhost:3001",
      versione: versioneApp(),
    },
  },

  $development: {
    runtimeConfig: { public: { apiBase: "/api" } },
    // Same origin in dev: the phone (dev server on 0.0.0.0) reaches the API through Nuxt.
    nitro: {
      devProxy: { "/api": { target: "http://localhost:3001", changeOrigin: true } },
    },
  },

  typescript: { strict: true },

  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "Calories Diary",
      short_name: "Calorie",
      description: "Diario personale di calorie e macronutrienti",
      lang: "it",
      theme_color: "#0369a1",
      background_color: "#f1f5f9",
      display: "standalone",
    },
    // Icons generated from public/logo.svg (pwa-assets.config.ts) and added to the manifest.
    pwaAssets: { config: true },
    workbox: {
      navigateFallback: "/",
      globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
    },
    client: { installPrompt: true },
    devOptions: { enabled: false, type: "module" },
  },
});
