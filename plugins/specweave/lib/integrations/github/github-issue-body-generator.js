function generateIssueBody(userStory) {
  const lines = [];
  lines.push("## Description");
  lines.push("");
  lines.push(userStory.description);
  lines.push("");
  lines.push(`**Priority**: ${userStory.priority}`);
  lines.push("");
  if (userStory.acceptanceCriteria.length > 0) {
    lines.push("## Acceptance Criteria");
    lines.push("");
    lines.push("<!-- specweave:ac-start -->");
    for (const ac of userStory.acceptanceCriteria) {
      const checkbox = ac.completed ? "[x]" : "[ ]";
      lines.push(`- ${checkbox} **${ac.id}**: ${ac.description}`);
    }
    lines.push("<!-- specweave:ac-end -->");
    lines.push("");
  }
  const syncParts = [];
  if (userStory.specId) {
    syncParts.push(`spec=${userStory.specId}`);
  }
  syncParts.push(`us=${userStory.id}`);
  lines.push(`<!-- specweave:sync ${syncParts.join(" ")} -->`);
  return lines.join("\n");
}
export {
  generateIssueBody
};
