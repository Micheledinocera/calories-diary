/**
 * Every page needs a session, except /login (which sends a logged user home) and the shared
 * pages, open to anyone with the link. User management is for admins only: the API checks it again.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith("/condivisi/")) return;
  const { sessione } = useSessione();
  if (!sessione.value && to.path !== "/login") return navigateTo("/login");
  if (sessione.value && to.path === "/login") return navigateTo("/");
  if (to.path.startsWith("/utenti") && sessione.value?.utente.ruolo !== "admin") {
    return navigateTo("/");
  }
});
