import axios from "axios";
import { getApiBaseUrl } from "./jira-deployment-detector.js";
const epicLinkFieldCache = /* @__PURE__ */ new Map();
const projectStyleCache = /* @__PURE__ */ new Map();
async function discoverEpicLinkField(domain, auth) {
  const cached = epicLinkFieldCache.get(domain);
  if (cached !== void 0) return cached;
  try {
    const baseUrl = getApiBaseUrl(domain);
    const response = await axios.get(`${baseUrl}/field`, {
      auth: {
        username: auth.email,
        password: auth.apiToken
      },
      headers: { Accept: "application/json" },
      timeout: 1e4
    });
    const fields = response.data;
    const epicLinkField = fields.find(
      (f) => f.name === "Epic Link" || f.schema?.custom === "com.pyxis.greenhopper.jira:gh-epic-link"
    );
    const fieldId = epicLinkField?.id || null;
    epicLinkFieldCache.set(domain, fieldId);
    return fieldId;
  } catch {
    epicLinkFieldCache.set(domain, null);
    return null;
  }
}
async function detectProjectStyle(domain, projectKey, auth) {
  const cacheKey = `${domain}:${projectKey}`;
  const cached = projectStyleCache.get(cacheKey);
  if (cached) return cached;
  try {
    const baseUrl = getApiBaseUrl(domain);
    const response = await axios.get(`${baseUrl}/project/${projectKey}`, {
      auth: {
        username: auth.email,
        password: auth.apiToken
      },
      headers: { Accept: "application/json" },
      timeout: 1e4
    });
    const project = response.data;
    const isNextGen = project.style === "next-gen" || project.simplified === true;
    const style = isNextGen ? "next-gen" : "classic";
    projectStyleCache.set(cacheKey, style);
    return style;
  } catch {
    projectStyleCache.set(cacheKey, "classic");
    return "classic";
  }
}
async function getEpicLinkFieldForProject(domain, projectKey, auth) {
  const style = await detectProjectStyle(domain, projectKey, auth);
  if (style === "next-gen") {
    return { field: "parent", style };
  }
  const epicLinkFieldId = await discoverEpicLinkField(domain, auth);
  if (!epicLinkFieldId) {
    return { field: "parent", style: "next-gen" };
  }
  return { field: epicLinkFieldId, style };
}
function clearFieldDiscoveryCache() {
  epicLinkFieldCache.clear();
  projectStyleCache.clear();
}
export {
  clearFieldDiscoveryCache,
  detectProjectStyle,
  discoverEpicLinkField,
  getEpicLinkFieldForProject
};
