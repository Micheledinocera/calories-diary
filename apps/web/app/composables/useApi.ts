import type { NitroFetchOptions } from "nitropack";

// The free API host sleeps when idle: the first call can take up to ~1 minute.
const TIMEOUT_PRIMA_CHIAMATA_MS = 90_000;
const TIMEOUT_MS = 15_000;

/** True after the API has answered once in this session (server awake). */
const apiSveglia = () => useState("api-sveglia", () => false);

/**
 * $fetch bound to the API base URL. Errors are thrown as `ErroreNormalizzato`.
 * The first call uses a long timeout to survive the cold start of the server.
 */
export function useApi() {
  const { apiBase } = useRuntimeConfig().public;
  const sveglia = apiSveglia();

  async function api<T>(path: string, opzioni: NitroFetchOptions<string> = {}): Promise<T> {
    try {
      const risposta = await $fetch<T>(path, {
        baseURL: apiBase,
        timeout: sveglia.value ? TIMEOUT_MS : TIMEOUT_PRIMA_CHIAMATA_MS,
        retry: 1,
        ...opzioni,
      });
      sveglia.value = true;
      return risposta as T;
    } catch (err) {
      throw normalizzaErrore(err);
    }
  }

  return { api, sveglia: readonly(sveglia) };
}
