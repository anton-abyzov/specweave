/** Pure persisted-record validation shared by dashboard, hooks and handoffs. */
import { WORK_STATES, type WorkState, type WorkIntent, type ExecutionSegment } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function textField(value: unknown, max: number, required = false): value is string {
  return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
}
function nullableText(value: unknown, max: number): boolean {
  return value === null || textField(value, max);
}
function timestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}
function validExecution(value: unknown): value is ExecutionSegment {
  return isRecord(value) && textField(value.id, 300, true) &&
    nullableText(value.sessionId, 200) && nullableText(value.harness, 120) &&
    nullableText(value.model, 120) && nullableText(value.effort, 80) &&
    nullableText(value.provider, 120) && nullableText(value.surface, 120) &&
    textField(value.actor, 120, true) && timestamp(value.startedAt) &&
    ['ledger', 'declared', 'session'].includes(value.source as string) && textField(value.note, 500);
}
export function isValidWorkIntent(value: unknown): value is WorkIntent {
  if (!isRecord(value)) return false;
  const keys = ['id', 'title', 'summary', 'state', 'incrementId', 'updatedAt', 'revision', 'executions', 'sessionRefs'];
  return Object.keys(value).every(key => keys.includes(key)) &&
    textField(value.id, 300, true) && textField(value.title, 180, true) &&
    textField(value.summary, 2000) && nullableText(value.incrementId, 180) &&
    WORK_STATES.includes(value.state as WorkState) && timestamp(value.updatedAt) &&
    Number.isSafeInteger(value.revision) && (value.revision as number) > 0 &&
    Array.isArray(value.executions) && value.executions.every(validExecution) &&
    (value.sessionRefs === undefined ||
      (Array.isArray(value.sessionRefs) && value.sessionRefs.every(ref => textField(ref, 300, true))));
}
export function getIntentRecordId(value: unknown): string | undefined {
  return isRecord(value) && textField(value.id, 300, true) ? value.id : undefined;
}
