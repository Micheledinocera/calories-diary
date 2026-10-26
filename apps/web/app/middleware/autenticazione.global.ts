/** Every page needs a session, except /login (which sends a logged user home). */
export default defineNuxtRouteMiddleware((to) => {
  const { sessione } = useSessione();
  if (!sessione.value && to.path !== "/login") return navigateTo("/login");
  if (sessione.value && to.path === "/login") return navigateTo("/");
});
