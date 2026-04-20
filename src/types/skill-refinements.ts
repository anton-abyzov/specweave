/**
 * Skill refinements ledger — append-only record of applied/rejected
 * refinements targeting a given skill. Stored at
 * `.specweave/state/skill-refinements.json`.
 *
 * Shape (from 0671 plan.md §"Data Schemas"):
 * ```
 * {
 *   "refinements": [
 *     {
 *       "id": "ref_<hex>",
 *       "targetSkill": "<slug>",
 *       "author": "<email>",
 *       "signalIds": ["sig_..."],
 *       "diffSha": "<git commit SHA | ''>",
 *       "rationale": "<string>",
 *       "appliedAt": "<ISO-8601>",
 *       "status": "applied" | "rejected",
 *       "rejectionReason"?: "<string>"
 *     }
 *   ]
 * }
 * ```
 *
 * @module types/skill-refinements
 */

import { z } from 'zod';

export type RefinementStatus = 'applied' | 'rejected';

export interface RefinementLedgerEntry {
  id: string;
  targetSkill: string;
  author: string;
  signalIds: string[];
  /** Git commit SHA for applied entries; empty string for rejected entries. */
  diffSha: string;
  rationale: string;
  appliedAt: string;
  status: RefinementStatus;
  rejectionReason?: string;
}

export interface RefinementLedger {
  refinements: RefinementLedgerEntry[];
}

export const RefinementLedgerEntrySchema = z.object({
  id: z.string(),
  targetSkill: z.string(),
  author: z.string(),
  signalIds: z.array(z.string()),
  diffSha: z.string(),
  rationale: z.string(),
  appliedAt: z.string(),
  status: z.enum(['applied', 'rejected']),
  rejectionReason: z.string().optional(),
});

export const RefinementLedgerSchema = z.object({
  refinements: z.array(RefinementLedgerEntrySchema),
});

export const EMPTY_LEDGER: RefinementLedger = { refinements: [] };
