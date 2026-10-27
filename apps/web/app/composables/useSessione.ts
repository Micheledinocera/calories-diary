import type { CambioPassword, Credenziali, Sessione, Utente } from "@calories-diary/shared";

const CHIAVE = "calories-diary:sessione";

function salvata(): Sessione | null {
  try {
    return leggiSessioneSalvata(localStorage.getItem(CHIAVE));
  } catch {
    return null;
  }
}

/** Session state, loaded from localStorage on first use. Shared by useSessione and useApi. */
export const statoSessione = () => useState<Sessione | null>("sessione", salvata);

/** Updates the state and localStorage. Plain function: safe after an await. */
export function impostaSessione(stato: Ref<Sessione | null>, nuova: Sessione | null) {
  stato.value = nuova;
  try {
    if (nuova) localStorage.setItem(CHIAVE, JSON.stringify(nuova));
    else localStorage.removeItem(CHIAVE);
  } catch {
    // Storage blocked: the session lasts until the page is closed.
  }
}

/**
 * Session of the logged user, kept in localStorage so the app opens offline too.
 * A locally expired token is kept: the API answers 401 at the next call and the app goes to /login.
 */
export function useSessione() {
  const sessione = statoSessione();
  const { api } = useApi();
  const imposta = (nuova: Sessione | null) => impostaSessione(sessione, nuova);

  async function accedi(credenziali: Credenziali) {
    // No retry: every attempt counts towards the login rate limit.
    imposta(await api<Sessione>("/auth/login", { method: "POST", body: credenziali, retry: 0 }));
  }

  /** Sliding expiry: exchanges the token for a new one-week token. Network errors are ignored. */
  async function rinnova() {
    if (!sessione.value) return;
    try {
      imposta(await api<Sessione>("/auth/rinnova", { method: "POST" }));
    } catch {
      // Offline or server asleep: retried at the next opportunity. A 401 is handled by useApi.
    }
  }

  /** The user changes their own username; the session keeps the token. */
  async function cambiaUsername(username: string) {
    const utente = await api<Utente>("/auth/io", { method: "PATCH", body: { username }, retry: 0 });
    if (sessione.value) imposta({ ...sessione.value, utente });
  }

  /** The API logs out the other devices and returns a new session for this one. */
  async function cambiaPassword(dati: CambioPassword) {
    imposta(await api<Sessione>("/auth/password", { method: "PUT", body: dati, retry: 0 }));
  }

  function esci() {
    imposta(null);
  }

  return {
    sessione: readonly(sessione),
    accedi,
    rinnova,
    cambiaUsername,
    cambiaPassword,
    esci,
  };
}
