const CANONICAL_JIRA_KEY_PATH = "external_sync.jira.issueKey";
function readIssueKey(metadata) {
  if (!metadata) return null;
  const canonical = metadata?.external_sync?.jira?.issueKey;
  if (canonical) return canonical;
  const legacyIssue = metadata?.jira?.issue;
  if (legacyIssue) return legacyIssue;
  const legacyKey = metadata?.jira?.issueKey;
  if (legacyKey) return legacyKey;
  return null;
}
function writeIssueKey(metadata, key) {
  if (!metadata) metadata = {};
  if (!metadata.external_sync) metadata.external_sync = {};
  if (!metadata.external_sync.jira) metadata.external_sync.jira = {};
  metadata.external_sync.jira.issueKey = key;
  return metadata;
}
function migrateToCanonical(metadata, cleanup = false) {
  if (!metadata) return metadata;
  const existingKey = readIssueKey(metadata);
  if (!existingKey) return metadata;
  writeIssueKey(metadata, existingKey);
  if (cleanup) {
    if (metadata.jira?.issue) delete metadata.jira.issue;
    if (metadata.jira?.issueKey) delete metadata.jira.issueKey;
    if (metadata.jira && Object.keys(metadata.jira).length === 0) {
      delete metadata.jira;
    }
  }
  return metadata;
}
export {
  CANONICAL_JIRA_KEY_PATH,
  migrateToCanonical,
  readIssueKey,
  writeIssueKey
};
