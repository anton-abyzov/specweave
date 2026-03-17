function mapAdoStateToSpecweave(adoState) {
  const map = {
    "New": "planned",
    "To Do": "planned",
    "Active": "active",
    "Doing": "active",
    "In Progress": "active",
    "Resolved": "completed",
    "Closed": "completed",
    "Done": "completed",
    "Removed": "abandoned"
  };
  return map[adoState] ?? "active";
}
function pullAdoChanges(ctx) {
  if (!ctx.canUpsertInternalItems) {
    return { changed: false, reason: "canUpsertInternalItems is false" };
  }
  const mappedStatus = mapAdoStateToSpecweave(ctx.adoState);
  if (mappedStatus === ctx.localStatus) {
    return { changed: false, reason: "states are equivalent" };
  }
  if (ctx.adoModifiedAt.getTime() <= ctx.localUpdatedAt.getTime()) {
    return { changed: false, reason: "local is newer" };
  }
  return {
    changed: true,
    newStatus: mappedStatus,
    reason: `ADO state "${ctx.adoState}" is newer \u2014 updating to "${mappedStatus}"`
  };
}
export {
  mapAdoStateToSpecweave,
  pullAdoChanges
};
