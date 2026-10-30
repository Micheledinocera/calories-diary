/** `%` and `_` typed by the user are literal characters in the search. */
export const escapeLike = (testo: string) => testo.replace(/[\\%_]/g, (c) => `\\${c}`);
