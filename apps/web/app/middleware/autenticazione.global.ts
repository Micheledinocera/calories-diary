/**
 * Every page needs a session, except /login (which sends a logged user home).
 * User management is for admins only: the API checks it again.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { sessione } = useSessione();
  if (!sessione.value && to.path !== "/login") return navigateTo("/login");
  if (sessione.value && to.path === "/login") return navigateTo("/");
  if (to.path.startsWith("/utenti") && sessione.value?.utente.ruolo !== "admin") {
    return navigateTo("/");
  }
});
