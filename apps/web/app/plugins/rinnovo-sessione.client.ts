/**
 * Sliding expiry of the session: renews the token when the app opens, comes back online
 * or returns to the foreground (an installed PWA can stay open for days), once it is a day old.
 */
export default defineNuxtPlugin(() => {
  const { sessione, rinnova } = useSessione();

  function seServe() {
    if (sessione.value && navigator.onLine && daRinnovare(sessione.value)) void rinnova();
  }

  seServe();
  window.addEventListener("online", seServe);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") seServe();
  });
});
