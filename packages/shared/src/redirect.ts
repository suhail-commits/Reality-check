import { z } from "zod";

/**
 * How much evidence stands behind an opening.
 *
 * The product promises to show you where the opening is, which creates constant
 * pressure to find one whether or not the evidence supports it. Grading the
 * redirect is what relieves that pressure honestly: a weak opening can still be
 * reported, labelled as weak, instead of being dressed up as a strong one.
 */
export const RedirectStrength = z.enum(["strong", "thin", "speculative"]);
export type RedirectStrength = z.infer<typeof RedirectStrength>;

/**
 * Where to build instead, or where to aim.
 *
 * Computed by `packages/rubric`, never written by a model. The heaviest
 * recurring complaint that the user's own angle does not already address is,
 * definitionally, the opening -- so this is arithmetic over evidence rather
 * than an opinion about a market.
 *
 * `evidenceIds` has a minimum of one at every strength, including `speculative`.
 * What varies with strength is confidence in the *inference*, never whether
 * there is a source. A redirect with no citation would undo the citation pass,
 * the verbatim-quote check and the rubric's purity in a single field.
 */
export const Redirect = z.object({
  /** The complaint theme the opening is built on. */
  theme: z.string().min(1),
  strength: RedirectStrength,
  /** Why this is the opening, in plain words. Composed by the rubric. */
  basis: z.string().min(1),
  /** Never empty. See above. */
  evidenceIds: z.array(z.string().min(1)).min(1),
  /** How many products share the complaint. Two or more is a category-level gap. */
  competitorIds: z.array(z.string().min(1)),
});
export type Redirect = z.infer<typeof Redirect>;
