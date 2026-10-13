import test from 'node:test';
import assert from 'node:assert/strict';
import { unfinishedTaskIds } from './case.mjs';

// Literal expectations exercise ledger meaning, not the implementation shape.
function check(taskIds, events, expected) {
  const originalIds = structuredClone(taskIds);
  const originalEvents = structuredClone(events);
  Object.freeze(taskIds);
  for (const event of events) Object.freeze(event);
  Object.freeze(events);
  const actual = unfinishedTaskIds(taskIds, events);
  assert.notStrictEqual(actual, taskIds, 'result must be a fresh array');
  assert.deepEqual(actual, expected);
  assert.deepEqual(taskIds, originalIds, 'task IDs must not be mutated');
  assert.deepEqual(events, originalEvents, 'events must not be mutated');
}

test('no-event tasks remain unfinished in supplied order including empty input', () => {
  check([], [], []);
  check(['T-20', 'T-02', 'T-11'], [], ['T-20', 'T-02', 'T-11']);
});

test('done and skip settle tasks without reordering the remainder', () => {
  check(['T-20', 'T-02', 'T-11', 'T-07'], [
    { t: 'T-02', e: 'done' }, { t: 'T-07', e: 'skip' },
  ], ['T-20', 'T-11']);
});

test('a later claim reopens a completed task', () => {
  check(['T-01', 'T-02'], [
    { t: 'T-01', e: 'done' }, { t: 'T-01', e: 'claim' },
    { t: 'T-02', e: 'done' },
  ], ['T-01']);
});

test('release and block reopen previously skipped or completed tasks', () => {
  check(['T-03', 'T-01', 'T-02'], [
    { t: 'T-01', e: 'skip' }, { t: 'T-01', e: 'release' },
    { t: 'T-02', e: 'done' }, { t: 'T-02', e: 'block' },
    { t: 'T-03', e: 'skip' },
  ], ['T-01', 'T-02']);
});

test('a final settling event wins after earlier claim or block', () => {
  check(['T-03', 'T-01', 'T-02'], [
    { t: 'T-01', e: 'claim' }, { t: 'T-01', e: 'block' },
    { t: 'T-01', e: 'done' }, { t: 'T-02', e: 'release' },
    { t: 'T-02', e: 'skip' },
  ], ['T-03']);
});

test('unknown event types and task IDs do not replace recognized task state', () => {
  check(['T-02', 'T-01', 'T-03'], [
    { t: 'T-01', e: 'done' }, { t: 'T-01', e: 'note' },
    { t: 'T-02', e: 'note' }, { t: 'UNKNOWN', e: 'done' },
    { t: 'T-03', e: 'future-event' },
  ], ['T-02', 'T-03']);
});

test('append order wins over contradictory timestamp metadata', () => {
  check(['T-01', 'T-02'], [
    { t: 'T-01', e: 'done', at: '2026-10-14T12:00:00Z' },
    { t: 'T-01', e: 'claim', at: '2026-10-12T12:00:00Z' },
    { t: 'T-02', e: 'claim', at: '2026-10-14T12:00:00Z' },
    { t: 'T-02', e: 'skip', at: '2026-10-12T12:00:00Z' },
  ], ['T-01']);
});
