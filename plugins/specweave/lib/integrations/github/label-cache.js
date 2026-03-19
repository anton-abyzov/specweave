import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import * as path from "path";
import { execFileNoThrow } from "../../vendor/utils/execFileNoThrow.js";
const labelCache = /* @__PURE__ */ new Map();
let diskCachePath = null;
let diskLoaded = false;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1e3;
function setLabelCacheDir(stateDir) {
  diskCachePath = path.join(stateDir, "github-label-cache.json");
  diskLoaded = false;
}
function loadFromDisk() {
  if (diskLoaded || !diskCachePath) return;
  diskLoaded = true;
  if (!existsSync(diskCachePath)) return;
  try {
    const raw = readFileSync(diskCachePath, "utf-8");
    const data = JSON.parse(raw);
    for (const [repo, entry] of Object.entries(data)) {
      const age = Date.now() - new Date(entry.cachedAt).getTime();
      if (age >= CACHE_MAX_AGE_MS) continue;
      if (!labelCache.has(repo)) {
        labelCache.set(repo, /* @__PURE__ */ new Set());
      }
      const cached = labelCache.get(repo);
      for (const label of entry.labels) {
        cached.add(label);
      }
    }
  } catch {
  }
}
function saveToDisk() {
  if (!diskCachePath) return;
  try {
    const dir = path.dirname(diskCachePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const data = {};
    for (const [repo, labels] of labelCache) {
      data[repo] = {
        labels: [...labels],
        cachedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    writeFileSync(diskCachePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
  }
}
async function ensureLabels(repo, labels, env) {
  loadFromDisk();
  if (!labelCache.has(repo)) {
    labelCache.set(repo, /* @__PURE__ */ new Set());
  }
  const cached = labelCache.get(repo);
  let created = false;
  for (const label of labels) {
    if (cached.has(label)) {
      continue;
    }
    cached.add(label);
    created = true;
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
  if (created) {
    saveToDisk();
  }
}
function clearLabelCache() {
  labelCache.clear();
  diskCachePath = null;
  diskLoaded = false;
}
export {
  clearLabelCache,
  ensureLabels,
  setLabelCacheDir
};
