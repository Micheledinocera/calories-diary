import type { Pagina, Paginazione } from "@calories-diary/shared";

/** The requested page of an already filtered and sorted list: only its rows become DTOs. */
export function paginata<R, D>(
  righe: R[],
  { pagina, limite }: Paginazione,
  versoDto: (riga: R) => D,
): Pagina<D> {
  const inizio = (pagina - 1) * limite;
  return {
    elementi: righe.slice(inizio, inizio + limite).map(versoDto),
    totale: righe.length,
    pagina,
  };
}
