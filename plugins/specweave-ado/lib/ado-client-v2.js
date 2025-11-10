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
    this.workItemType = config.workItemType || "Epic";
    if (config.containers && config.containers.length > 0) {
      this.isMultiProject = true;
      this.containers = config.containers;
      this.baseUrl = `https://dev.azure.com/${this.organization}`;
    } else if (config.customQuery) {
      this.isMultiProject = true;
      this.customQuery = config.customQuery;
      this.baseUrl = `https://dev.azure.com/${this.organization}`;
    } else {
      this.isMultiProject = false;
      this.project = config.project;
      this.areaPath = config.areaPath;
      this.iterationPath = config.iterationPath;
      this.baseUrl = `https://dev.azure.com/${this.organization}/${this.project}`;
    }
    this.authHeader = "Basic " + Buffer.from(`:${personalAccessToken}`).toString("base64");
  }
  /**
   * Create client from organization/project directly
   */
  static fromProject(organization, project, personalAccessToken, workItemType = "Epic") {
    const profile = {
      provider: "ado",
      displayName: `${organization}/${project}`,
      config: { organization, project, workItemType },
      timeRange: { default: "1M", max: "6M" }
    };
    return new AdoClientV2(profile, personalAccessToken);
  }
  // ==========================================================================
  // Authentication & Setup
  // ==========================================================================
  /**
   * Test connection and authentication
   */
  async testConnection() {
    try {
      if (this.isMultiProject) {
        await this.request("GET", `https://dev.azure.com/${this.organization}/_apis/projects?api-version=7.1`);
      } else {
        await this.request("GET", `/_apis/projects/${this.project}?api-version=7.1`);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  // ==========================================================================
  // Work Items
  // ==========================================================================
  /**
   * Create epic work item
   */
  async createEpic(request) {
    const url = `/_apis/wit/workitems/$${this.workItemType}?api-version=7.1`;
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
    if (request.areaPath || this.areaPath) {
      operations.push({
        op: "add",
        path: "/fields/System.AreaPath",
        value: request.areaPath || this.areaPath
      });
    }
    if (request.iterationPath || this.iterationPath) {
      operations.push({
        op: "add",
        path: "/fields/System.IterationPath",
        value: request.iterationPath || this.iterationPath
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
    const ids = queryResult.workItems.map((wi) => wi.id);
    const batchUrl = this.isMultiProject ? `https://dev.azure.com/${this.organization}/_apis/wit/workitemsbatch?api-version=7.1` : `/_apis/wit/workitemsbatch?api-version=7.1`;
    const workItems = await this.request("POST", batchUrl, {
      ids,
      fields: [
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
      ]
    });
    return workItems.value || [];
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
    if (this.isMultiProject && this.containers) {
      return this.queryWorkItemsAcrossContainers(since, until);
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
   * Query work items across multiple containers (multi-project)
   */
  async queryWorkItemsAcrossContainers(since, until) {
    if (!this.containers || this.containers.length === 0) {
      return [];
    }
    const allWorkItems = [];
    for (const container of this.containers) {
      const wiql = this.buildContainerWIQL(container, since, until);
      try {
        const workItems = await this.queryWorkItems(wiql);
        allWorkItems.push(...workItems);
      } catch (error) {
        console.error(`Failed to query container ${container.id}:`, error.message);
      }
    }
    return allWorkItems;
  }
  /**
   * Build WIQL query for a specific container with filters
   */
  buildContainerWIQL(container, since, until) {
    const conditions = [];
    conditions.push(`[System.TeamProject] = '${container.id}'`);
    conditions.push(`[System.CreatedDate] >= '${since}'`);
    conditions.push(`[System.CreatedDate] <= '${until}'`);
    if (container.filters?.areaPaths && container.filters.areaPaths.length > 0) {
      const areaPathConditions = container.filters.areaPaths.map((ap) => `[System.AreaPath] UNDER '${container.id}\\${ap}'`).join(" OR ");
      conditions.push(`(${areaPathConditions})`);
    }
    if (container.filters?.workItemTypes && container.filters.workItemTypes.length > 0) {
      const typeConditions = container.filters.workItemTypes.map((type) => `[System.WorkItemType] = '${type}'`).join(" OR ");
      conditions.push(`(${typeConditions})`);
    }
    if (container.filters?.iterationPaths && container.filters.iterationPaths.length > 0) {
      const iterationConditions = container.filters.iterationPaths.map((ip) => `[System.IterationPath] UNDER '${container.id}\\${ip}'`).join(" OR ");
      conditions.push(`(${iterationConditions})`);
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
          let parsed;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch {
            parsed = { raw: data };
          }
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const errorMsg = parsed.message || `HTTP ${res.statusCode}: ${data}`;
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
