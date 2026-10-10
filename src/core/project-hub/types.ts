import { z } from 'zod';

const text = (max: number) => z.string().max(max);
export const artifactSchema = z.object({
  id: z.string().uuid(), title: text(180).min(1), location: text(2000).min(1),
  kind: z.enum(['file', 'link']), intentId: text(180).nullable(), createdAt: z.string().datetime(),
}).strict();
export const routineSchema = z.object({
  id: z.string().uuid(), title: text(180).min(1), instructions: text(8000).min(1),
  cadence: text(180).min(1), enabled: z.boolean(), createdAt: z.string().datetime(),
}).strict();
export const hubSchema = z.object({
  version: z.literal(1), revision: z.number().int().nonnegative(), updatedAt: z.string().datetime().nullable(),
  name: text(180), goal: text(2000), context: text(16000),
  artifacts: z.array(artifactSchema).max(200), routines: z.array(routineSchema).max(100),
}).strict();
export type ProjectHub = z.infer<typeof hubSchema>;
export type ProjectArtifact = z.infer<typeof artifactSchema>;
export type ProjectRoutine = z.infer<typeof routineSchema>;
