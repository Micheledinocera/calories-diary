// https://nuxt.com/docs/api/configuration/nuxt-config
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
      theme_color: "#16a34a",
      background_color: "#ffffff",
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
