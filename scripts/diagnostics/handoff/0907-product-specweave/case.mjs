// Diagnostic fixture only: intentionally incomplete source checkpoint.
// This file is not imported by production code.
export function unfinishedTaskIds(taskIds, events) {
  const completed = new Set(events
    .filter(event => event.e === 'done' || event.e === 'skip')
    .map(event => event.t));
  return taskIds.filter(id => !completed.has(id));
}
