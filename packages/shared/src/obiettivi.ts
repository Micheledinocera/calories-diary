import { z } from "zod";

const quota = z.int().min(0).max(100);

/** Target share of kcal from each macro, in percent (sum 100). The app proposes 50/30/20. */
export const ripartizioneMacroSchema = z
  .object({ carboidrati: quota, grassi: quota, proteine: quota })
  .refine(({ carboidrati, grassi, proteine }) => carboidrati + grassi + proteine === 100, {
    message: "la somma deve essere 100",
  });

export type RipartizioneMacro = z.infer<typeof ripartizioneMacroSchema>;

export const ripartizionePredefinita: RipartizioneMacro = {
  carboidrati: 50,
  grassi: 30,
  proteine: 20,
};

/**
 * The user's goals, one value per user (no history yet): daily kcal need, entered by hand
 * (null until set), and the macro split. Body and response of `/obiettivi`.
 */
export const obiettiviSchema = z.object({
  fabbisogno: z.int().min(500).max(10_000).nullable(),
  ripartizione: ripartizioneMacroSchema,
});

export type Obiettivi = z.infer<typeof obiettiviSchema>;
