import { execFileNoThrow } from "../../vendor/utils/execFileNoThrow.js";
const labelCache = /* @__PURE__ */ new Map();
async function ensureLabels(repo, labels, env) {
  if (!labelCache.has(repo)) {
    labelCache.set(repo, /* @__PURE__ */ new Set());
  }
  const cached = labelCache.get(repo);
  for (const label of labels) {
    if (cached.has(label)) {
      continue;
    }
    cached.add(label);
    await execFileNoThrow("gh", [
      "label",
      "create",
      label,
      "--repo",
      repo,
      "--color",
      "ededed",
      "--description",
      "SpecWeave auto-label",
      "--force"
    ], { env });
  }
}
function clearLabelCache() {
  labelCache.clear();
}
export {
  clearLabelCache,
  ensureLabels
};
