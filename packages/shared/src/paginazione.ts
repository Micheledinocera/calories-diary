import { z } from "zod";

/** Query of the paged lists. */
export const paginazioneSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(200).default(100),
});

export type Paginazione = z.output<typeof paginazioneSchema>;

/** One page of a list: `totale` counts the items of every page. */
export const paginaSchema = <T extends z.ZodType>(elemento: T) =>
  z.object({
    elementi: z.array(elemento),
    totale: z.int().nonnegative(),
    pagina: z.int().positive(),
  });

export interface Pagina<T> {
  elementi: T[];
  totale: number;
  pagina: number;
}
