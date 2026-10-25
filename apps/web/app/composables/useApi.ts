import type { NitroFetchOptions } from "nitropack";

// The free API host sleeps when idle: the first call can take up to ~1 minute.
const TIMEOUT_PRIMA_CHIAMATA_MS = 90_000;
const TIMEOUT_MS = 15_000;

/** True after the API has answered once in this session (server awake). */
const apiSveglia = () => useState("api-sveglia", () => false);

/**
 * $fetch bound to the API base URL, with the session token as `Authorization: Bearer`.
 * Errors are thrown as `ErroreNormalizzato`; a 401 NON_AUTENTICATO ends the session and opens /login.
 * The first call uses a long timeout to survive the cold start of the server.
 */
export function useApi() {
  const { apiBase } = useRuntimeConfig().public;
  const sveglia = apiSveglia();
  const sessione = statoSessione();
  // Captured now: composables are not safe after an await.
  const router = useRouter();

  async function api<T>(path: string, opzioni: NitroFetchOptions<string> = {}): Promise<T> {
    const token = sessione.value?.token;
    try {
      const risposta = await $fetch<T>(path, {
        baseURL: apiBase,
        timeout: sveglia.value ? TIMEOUT_MS : TIMEOUT_PRIMA_CHIAMATA_MS,
        retry: 1,
        ...opzioni,
        headers: token ? { Authorization: `Bearer ${token}`, ...opzioni.headers } : opzioni.headers,
      });
      sveglia.value = true;
      return risposta as T;
    } catch (err) {
      const errore = normalizzaErrore(err);
      if (token && errore.codice === "NON_AUTENTICATO") {
        impostaSessione(sessione, null);
        await router.push("/login");
      }
      throw errore;
    }
  }

  return { api, sveglia: readonly(sveglia) };
}
