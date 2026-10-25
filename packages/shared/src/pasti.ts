import { z } from "zod";

export const pastoSchema = z.object({
  id: z.uuid(),
  nome: z.string().min(1),
  ordine: z.int().nonnegative(),
});

export type Pasto = z.infer<typeof pastoSchema>;

export const listaPastiSchema = z.array(pastoSchema);
