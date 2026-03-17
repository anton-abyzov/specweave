const AC_CHECKBOX_RE = /^-\s+\[([ xX])\]\s+\*\*(?<acId>AC-[A-Z0-9]+-\d+)\*\*:\s*(?<desc>.+)$/;
const SYNC_MARKER_RE = /<!--\s*specweave:sync\s+(?:spec=(?<specId>[^\s]+)\s+)?us=(?<usId>[^\s]+)\s*-->/;
function parseIssueBody(body) {
  const result = {
    acceptanceCriteria: {}
  };
  if (!body || !body.trim()) {
    return result;
  }
  const lines = body.split("\n");
  let inAcSection = false;
  let foundAcSection = false;
  for (const line of lines) {
    if (/^##\s+Acceptance Criteria/i.test(line)) {
      inAcSection = true;
      foundAcSection = true;
      continue;
    }
    if (inAcSection && /^##\s+/.test(line)) {
      inAcSection = false;
      continue;
    }
    if (inAcSection) {
      const match = line.match(AC_CHECKBOX_RE);
      if (match?.groups) {
        result.acceptanceCriteria[match.groups.acId] = {
          checked: match[1] !== " ",
          description: match.groups.desc.trim()
        };
      }
    }
  }
  if (!foundAcSection) {
    for (const line of lines) {
      const match = line.match(AC_CHECKBOX_RE);
      if (match?.groups) {
        result.acceptanceCriteria[match.groups.acId] = {
          checked: match[1] !== " ",
          description: match.groups.desc.trim()
        };
      }
    }
  }
  const syncMatch = body.match(SYNC_MARKER_RE);
  if (syncMatch?.groups?.usId) {
    result.syncMarker = {
      specId: syncMatch.groups.specId || "",
      userStoryId: syncMatch.groups.usId
    };
  }
  return result;
}
export {
  parseIssueBody
};
