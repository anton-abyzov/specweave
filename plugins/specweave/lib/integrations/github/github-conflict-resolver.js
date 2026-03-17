class GitHubConflictResolver {
  constructor(config) {
    this.statusResolution = config?.defaultStatusResolution ?? "github-wins";
    this.contentResolution = config?.defaultContentResolution ?? "prompt";
    this.acResolution = config?.defaultACResolution ?? "github-wins";
  }
  /**
   * Detect conflicts between spec and GitHub states.
   */
  detectConflicts(specState, githubState) {
    const conflicts = [];
    if (specState.title !== githubState.title) {
      conflicts.push({
        field: "title",
        specValue: specState.title,
        githubValue: githubState.title,
        defaultResolution: this.contentResolution
      });
    }
    const githubStatus = githubState.state;
    const specStatus = specState.status;
    const statusMismatch = this.isStatusConflict(specStatus, githubStatus);
    if (statusMismatch) {
      conflicts.push({
        field: "status",
        specValue: specStatus,
        githubValue: githubStatus,
        defaultResolution: this.statusResolution
      });
    }
    const ghAcMap = new Map(
      githubState.acceptanceCriteria.map((ac) => [ac.id, ac.completed])
    );
    for (const specAc of specState.acceptanceCriteria) {
      const ghCompleted = ghAcMap.get(specAc.id);
      if (ghCompleted !== void 0 && specAc.completed !== ghCompleted) {
        conflicts.push({
          field: `ac:${specAc.id}`,
          specValue: String(specAc.completed),
          githubValue: String(ghCompleted),
          defaultResolution: this.acResolution
        });
      }
    }
    return conflicts;
  }
  /**
   * Resolve all conflicts using their default resolution strategy.
   */
  resolveConflicts(conflicts) {
    return conflicts.map((c) => this.resolveConflict(c));
  }
  /**
   * Resolve a single conflict with optional override.
   */
  resolveConflict(conflict, resolution) {
    const effectiveResolution = resolution ?? conflict.defaultResolution;
    let resolvedValue;
    switch (effectiveResolution) {
      case "github-wins":
        resolvedValue = conflict.githubValue;
        break;
      case "spec-wins":
        resolvedValue = conflict.specValue;
        break;
      case "prompt":
        resolvedValue = conflict.specValue;
        break;
    }
    return {
      field: conflict.field,
      specValue: conflict.specValue,
      githubValue: conflict.githubValue,
      resolution: effectiveResolution,
      resolvedValue,
      resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Check if spec status and GitHub state represent a conflict.
   */
  isStatusConflict(specStatus, githubState) {
    if (specStatus === "completed" && githubState === "open") return true;
    if (specStatus !== "completed" && githubState === "closed") return true;
    return false;
  }
}
export {
  GitHubConflictResolver
};
