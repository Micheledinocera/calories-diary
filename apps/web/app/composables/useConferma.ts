import { LazyModaleConferma } from "#components";

export interface OpzioniConferma {
  titolo: string;
  descrizione?: string;
  /** Label of the confirm button, "Elimina" by default. */
  azione?: string;
  icona?: string;
}

/**
 * Asks for a confirmation with the app's modal and resolves `true` only on the confirm button.
 * The only way to confirm an action: the browser's confirm() is never used.
 */
export function useConferma() {
  const overlay = useOverlay();
  return async (opzioni: OpzioniConferma): Promise<boolean> => {
    const modale = overlay.create(LazyModaleConferma, { destroyOnClose: true, props: opzioni });
    return (await modale.open()) === true;
  };
}
