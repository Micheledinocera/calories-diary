export default defineAppConfig({
  ui: {
    colors: {
      primary: "sky",
      neutral: "slate",
      success: "green",
      warning: "orange",
      error: "red",
    },
    // The "velo" token behind sheets and modals.
    drawer: { slots: { overlay: "bg-velo" } },
    modal: { slots: { overlay: "bg-velo" } },
    card: {
      slots: {
        // rounded-lg is 16px with --ui-radius 0.5rem; the shadow becomes a ring in dark mode.
        root: "shadow-card",
      },
      variants: {
        variant: {
          outline: { root: "bg-default ring-0 dark:ring-1 dark:ring-default" },
        },
      },
    },
  },
});
