function buildFingerprint(completed, total) {
  return `<!-- sw-progress:${completed}/${total} -->`;
}
function extractFingerprint(text) {
  const match = text.match(/<!-- sw-progress:(\d+\/\d+) -->/);
  return match ? match[1] : null;
}
function normalizeIssueBody(body) {
  return body.split("\n").map((line) => line.trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
export {
  buildFingerprint,
  extractFingerprint,
  normalizeIssueBody
};
