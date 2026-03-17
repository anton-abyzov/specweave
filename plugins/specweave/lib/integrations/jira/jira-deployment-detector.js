import axios from "axios";
const deploymentCache = /* @__PURE__ */ new Map();
async function detectDeploymentType(domain, auth) {
  const cached = deploymentCache.get(domain);
  if (cached) return cached;
  try {
    const response = await axios.get(
      `https://${domain}/rest/api/2/serverInfo`,
      {
        auth: {
          username: auth.email,
          password: auth.apiToken
        },
        headers: {
          Accept: "application/json"
        },
        timeout: 1e4
      }
    );
    const data = response.data;
    const deploymentType = (data.deploymentType || "").toLowerCase();
    const isCloud2 = deploymentType === "cloud" || domain.endsWith(".atlassian.net");
    const info = {
      type: isCloud2 ? "cloud" : "server",
      apiVersion: isCloud2 ? "3" : "2",
      baseUrl: `https://${domain}/rest/api/${isCloud2 ? "3" : "2"}`
    };
    deploymentCache.set(domain, info);
    return info;
  } catch {
    const isCloud2 = domain.endsWith(".atlassian.net");
    const info = {
      type: isCloud2 ? "cloud" : "server",
      apiVersion: isCloud2 ? "3" : "2",
      baseUrl: `https://${domain}/rest/api/${isCloud2 ? "3" : "2"}`
    };
    deploymentCache.set(domain, info);
    return info;
  }
}
function getApiBaseUrl(domain) {
  const cached = deploymentCache.get(domain);
  if (cached) return cached.baseUrl;
  return `https://${domain}/rest/api/3`;
}
function getApiVersion(domain) {
  const cached = deploymentCache.get(domain);
  return cached?.apiVersion ?? "3";
}
function isCloud(domain) {
  const cached = deploymentCache.get(domain);
  return cached ? cached.type === "cloud" : domain.endsWith(".atlassian.net");
}
function clearDeploymentCache() {
  deploymentCache.clear();
}
export {
  clearDeploymentCache,
  detectDeploymentType,
  getApiBaseUrl,
  getApiVersion,
  isCloud
};
