import https from "https";
class AdoClientV2 {
  /**
   * Create ADO client from sync profile
   */
  constructor(profile, personalAccessToken) {
    if (profile.provider !== "ado") {
      throw new Error(`Expected ADO profile, got ${profile.provider}`);
    }
    const config = profile.config;
    this.organization = config.organization;
    this.workItemTypes = config.workItemTypes;
    if (config.projects && config.projects.length > 0) {
      this.isMultiProject = true;
      this.projects = config.projects;
      this.baseUrl = `https://dev.azure.com/${this.organization}`;
    } else if (config.customQuery) {
      this.isMultiProject = true;
      this.customQuery = config.customQuery;
      this.baseUrl = `https://dev.azure.com/${this.organization}`;
    } else {
      this.isMultiProject = false;
      this.project = config.project;
      this.areaPaths = config.areaPaths;
      this.baseUrl = `https://dev.azure.com/${this.organization}/${this.project}`;
    }
    this.authHeader = "Basic " + Buffer.from(`:${personalAccessToken}`).toString("base64");
  }
  /**
   * Create client from organization/project directly
   */
  static fromProject(organization, project, personalAccessToken) {
    const profile = {
      provider: "ado",
      displayName: `${organization}/${project}`,
      config: { organization, project },
      timeRange: { default: "1M", max: "6M" }
    };
    return new AdoClientV2(profile, personalAccessToken);
  }
  // ==========================================================================
  // Authentication & Setup
  // ==========================================================================
  /**
   * Resolve PAT for an organization.
   * Priority: AZURE_DEVOPS_PAT_{ORG_UPPER} > AZURE_DEVOPS_PAT > fallback
   */
  static resolvePatForOrg(organization, fallbackPat) {
    const orgKey = `AZURE_DEVOPS_PAT_${organization.toUpperCase().replace(/-/g, "_")}`;
    const orgPat = process.env[orgKey];
    if (orgPat) return orgPat;
    const genericPat = process.env.AZURE_DEVOPS_PAT;
    if (genericPat) return genericPat;
    return fallbackPat || "";
  }
  /**
   * Test connection and authentication
   */
  async testConnection() {
    try {
      if (this.isMultiProject) {
        await this.request("GET", `https://dev.azure.com/${this.organization}/_apis/projects?api-version=7.1`);
      } else {
        await this.request("GET", `https://dev.azure.com/${this.organization}/_apis/projects/${this.project}?api-version=7.1`);
      }
      return { success: true };
    } catch (error) {
      const statusMatch = error.message?.match(/HTTP (\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;
      let hint = "";
      if (status === 401) hint = " (check your Personal Access Token)";
      else if (status === 404) hint = " (check organization/project name)";
      return { success: false, error: error.message + hint };
    }
  }
  // ==========================================================================
  // Work Items
  // ==========================================================================
  /**
   * Create epic work item
   */
  async createEpic(request) {
    const workItemType = this.workItemTypes?.epic || "Epic";
    const url = `/_apis/wit/workitems/$${workItemType}?api-version=7.1`;
    const operations = [
      {
        op: "add",
        path: "/fields/System.Title",
        value: request.title
      }
    ];
    if (request.description) {
      operations.push({
        op: "add",
        path: "/fields/System.Description",
        value: `<pre>${request.description}</pre>`
      });
    }
    if (request.areaPath || this.areaPaths && this.areaPaths.length > 0) {
      operations.push({
        op: "add",
        path: "/fields/System.AreaPath",
        value: request.areaPath || this.areaPaths[0]
      });
    }
    if (request.iterationPath) {
      operations.push({
        op: "add",
        path: "/fields/System.IterationPath",
        value: request.iterationPath
      });
    }
    if (request.tags && request.tags.length > 0) {
      operations.push({
        op: "add",
        path: "/fields/System.Tags",
        value: request.tags.join("; ")
      });
    }
    return this.request("POST", url, operations, {
      "Content-Type": "application/json-patch+json"
    });
  }
  /**
   * Create child work item (feature/story) linked to epic
   */
  async createChildWorkItem(request, parentId, childType = "User Story") {
    const url = `/_apis/wit/workitems/$${childType}?api-version=7.1`;
    const operations = [
      {
        op: "add",
        path: "/fields/System.Title",
        value: request.title
      },
      {
        op: "add",
        path: "/relations/-",
        value: {
          rel: "System.LinkTypes.Hierarchy-Reverse",
          url: `${this.baseUrl}/_apis/wit/workItems/${parentId}`
        }
      }
    ];
    if (request.description) {
      operations.push({
        op: "add",
        path: "/fields/System.Description",
        value: `<pre>${request.description}</pre>`
      });
    }
    if (request.tags && request.tags.length > 0) {
      operations.push({
        op: "add",
        path: "/fields/System.Tags",
        value: request.tags.join("; ")
      });
    }
    return this.request("POST", url, operations, {
      "Content-Type": "application/json-patch+json"
    });
  }
  /**
   * Get work item by ID
   */
  async getWorkItem(id) {
    return this.request("GET", `/_apis/wit/workitems/${id}?api-version=7.1`);
  }
  /**
   * Update work item
   */
  async updateWorkItem(id, updates) {
    const url = `/_apis/wit/workitems/${id}?api-version=7.1`;
    const operations = [];
    if (updates.state) {
      operations.push({
        op: "add",
        path: "/fields/System.State",
        value: updates.state
      });
    }
    if (updates.title) {
      operations.push({
        op: "add",
        path: "/fields/System.Title",
        value: updates.title
      });
    }
    if (updates.description) {
      operations.push({
        op: "add",
        path: "/fields/System.Description",
        value: `<pre>${updates.description}</pre>`
      });
    }
    if (updates.tags) {
      operations.push({
        op: "add",
        path: "/fields/System.Tags",
        value: updates.tags.join("; ")
      });
    }
    return this.request("PATCH", url, operations, {
      "Content-Type": "application/json-patch+json"
    });
  }
  /**
   * Add comment to work item
   */
  async addComment(workItemId, comment) {
    const url = `/_apis/wit/workItems/${workItemId}/comments?api-version=7.1-preview.3`;
    await this.request("POST", url, { text: comment });
  }
  // ==========================================================================
  // Query & Time Range Filtering
  // ==========================================================================
  /**
   * Execute WIQL query
   */
  async queryWorkItems(wiql) {
    const queryUrl = this.isMultiProject ? `https://dev.azure.com/${this.organization}/_apis/wit/wiql?api-version=7.1` : `/_apis/wit/wiql?api-version=7.1`;
    const queryResult = await this.request("POST", queryUrl, {
      query: wiql
    });
    if (queryResult.workItems.length === 0) {
      return [];
    }
    const allIds = queryResult.workItems.map((wi) => wi.id);
    const batchUrl = this.isMultiProject ? `https://dev.azure.com/${this.organization}/_apis/wit/workitemsbatch?api-version=7.1` : `/_apis/wit/workitemsbatch?api-version=7.1`;
    const batchFields = [
      "System.Id",
      "System.Title",
      "System.Description",
      "System.State",
      "System.CreatedDate",
      "System.ChangedDate",
      "System.WorkItemType",
      "System.Tags",
      "System.AreaPath",
      "System.IterationPath",
      "System.TeamProject"
    ];
    const PAGE_SIZE = 200;
    const allWorkItems = [];
    for (let i = 0; i < allIds.length; i += PAGE_SIZE) {
      const pageIds = allIds.slice(i, i + PAGE_SIZE);
      const workItems = await this.request("POST", batchUrl, {
        ids: pageIds,
        fields: batchFields
      });
      allWorkItems.push(...workItems.value || []);
    }
    return allWorkItems;
  }
  /**
   * List work items within time range
   */
  async listWorkItemsInTimeRange(timeRange, customStart, customEnd) {
    const { since, until } = this.calculateTimeRange(
      timeRange,
      customStart,
      customEnd
    );
    if (this.customQuery) {
      return this.queryWorkItems(this.customQuery);
    }
    if (this.isMultiProject && this.projects) {
      return this.queryWorkItemsAcrossProjects(since, until);
    }
    const wiql = `
      SELECT [System.Id], [System.Title], [System.State], [System.CreatedDate]
      FROM WorkItems
      WHERE [System.TeamProject] = '${this.project}'
      AND [System.CreatedDate] >= '${since}'
      AND [System.CreatedDate] <= '${until}'
      ORDER BY [System.CreatedDate] DESC
    `;
    return this.queryWorkItems(wiql);
  }
  /**
   * Query work items across multiple projects (multi-project mode)
   */
  async queryWorkItemsAcrossProjects(since, until) {
    if (!this.projects || this.projects.length === 0) {
      return [];
    }
    const allWorkItems = [];
    for (const projectName of this.projects) {
      const wiql = this.buildProjectWIQL(projectName, since, until);
      try {
        const workItems = await this.queryWorkItems(wiql);
        allWorkItems.push(...workItems);
      } catch (error) {
        console.error(`Failed to query project ${projectName}:`, error.message);
      }
    }
    return allWorkItems;
  }
  /**
   * Build WIQL query for a specific project
   */
  buildProjectWIQL(projectName, since, until) {
    const conditions = [];
    conditions.push(`[System.TeamProject] = '${projectName}'`);
    conditions.push(`[System.CreatedDate] >= '${since}'`);
    conditions.push(`[System.CreatedDate] <= '${until}'`);
    if (this.areaPaths && this.areaPaths.length > 0) {
      const areaPathConditions = this.areaPaths.map((ap) => {
        const normalizedAp = ap.replace(/\//g, "\\");
        if (normalizedAp === projectName || normalizedAp.startsWith(`${projectName}\\`)) {
          return `[System.AreaPath] UNDER '${normalizedAp}'`;
        }
        return `[System.AreaPath] UNDER '${projectName}\\${normalizedAp}'`;
      }).join(" OR ");
      conditions.push(`(${areaPathConditions})`);
    }
    if (this.workItemTypes) {
      const types = Object.values(this.workItemTypes).filter(Boolean);
      if (types.length > 0) {
        const typeConditions = types.map((type) => `[System.WorkItemType] = '${type}'`).join(" OR ");
        conditions.push(`(${typeConditions})`);
      }
    }
    return `
      SELECT [System.Id], [System.Title], [System.State], [System.CreatedDate], [System.WorkItemType]
      FROM WorkItems
      WHERE ${conditions.join("\n      AND ")}
      ORDER BY [System.CreatedDate] DESC
    `;
  }
  /**
   * Calculate date range from preset
   */
  calculateTimeRange(timeRange, customStart, customEnd) {
    if (timeRange === "ALL") {
      return {
        since: "1970-01-01T00:00:00Z",
        until: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    if (customStart) {
      return {
        since: customStart,
        until: customEnd || (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    const now = /* @__PURE__ */ new Date();
    const since = new Date(now);
    switch (timeRange) {
      case "1W":
        since.setDate(now.getDate() - 7);
        break;
      case "2W":
        since.setDate(now.getDate() - 14);
        break;
      case "1M":
        since.setMonth(now.getMonth() - 1);
        break;
      case "3M":
        since.setMonth(now.getMonth() - 3);
        break;
      case "6M":
        since.setMonth(now.getMonth() - 6);
        break;
      case "1Y":
        since.setFullYear(now.getFullYear() - 1);
        break;
    }
    return {
      since: since.toISOString(),
      until: now.toISOString()
    };
  }
  // ==========================================================================
  // Batch Operations
  // ==========================================================================
  /**
   * Batch create work items with rate limit handling
   */
  async batchCreateWorkItems(workItems, parentId, childType, options = {}) {
    const { batchSize = 10, delayMs = 15e3 } = options;
    const created = [];
    for (let i = 0; i < workItems.length; i += batchSize) {
      const batch = workItems.slice(i, i + batchSize);
      console.log(
        `Creating work items ${i + 1}-${Math.min(i + batchSize, workItems.length)} of ${workItems.length}...`
      );
      for (const item of batch) {
        try {
          const createdItem = parentId && childType ? await this.createChildWorkItem(item, parentId, childType) : await this.createEpic(item);
          created.push(createdItem);
        } catch (error) {
          console.error(
            `Failed to create work item "${item.title}":`,
            error.message
          );
        }
      }
      if (i + batchSize < workItems.length) {
        console.log(`Waiting ${delayMs / 1e3}s to avoid rate limits...`);
        await this.sleep(delayMs);
      }
    }
    return created;
  }
  // ==========================================================================
  // HTTP Request Handler
  // ==========================================================================
  /**
   * Make HTTPS request to ADO API
   */
  async request(method, path, body, customHeaders) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const { hostname, pathname, search } = new URL(url);
      const headers = {
        Authorization: this.authHeader,
        Accept: "application/json",
        ...customHeaders
      };
      if (body && !customHeaders?.["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
      const options = {
        hostname,
        path: pathname + search,
        method,
        headers
      };
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const looksLikeHtml = data.trim().startsWith("<!DOCTYPE") || data.trim().startsWith("<html") || data.trim().startsWith("<HTML");
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            if (looksLikeHtml) {
              reject(new Error(
                `Azure DevOps returned HTML instead of JSON (HTTP ${res.statusCode}).
This usually indicates an authentication or configuration issue.

Possible causes:
\u2022 Invalid or expired Personal Access Token (PAT)
\u2022 Incorrect organization name "${this.organization}"
\u2022 Corporate firewall or proxy intercepting the request
\u2022 SSO/authentication redirect (try accessing Azure DevOps in browser first)`
              ));
              return;
            }
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve(parsed);
            } catch {
              reject(new Error(
                `Azure DevOps returned invalid JSON.
Response preview: ${data.substring(0, 200)}${data.length > 200 ? "..." : ""}`
              ));
            }
          } else {
            if (looksLikeHtml) {
              reject(new Error(
                `Azure DevOps returned an error page (HTTP ${res.statusCode}).
This usually indicates an authentication or configuration issue.

Possible causes:
\u2022 Invalid or expired Personal Access Token (PAT)
\u2022 Incorrect organization name "${this.organization}"
\u2022 Corporate firewall or proxy intercepting the request
\u2022 SSO/authentication redirect`
              ));
              return;
            }
            let errorMsg = `HTTP ${res.statusCode}`;
            try {
              const parsed = JSON.parse(data);
              errorMsg = parsed.message || `HTTP ${res.statusCode}: ${data.substring(0, 200)}`;
            } catch {
              errorMsg = `HTTP ${res.statusCode}: ${data.substring(0, 200)}`;
            }
            reject(new Error(errorMsg));
          }
        });
      });
      req.on("error", (error) => {
        reject(error);
      });
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
export {
  AdoClientV2
};
