import https from "https";
class AdoClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = `https://dev.azure.com/${config.organization}/${config.project}`;
    this.authHeader = "Basic " + Buffer.from(`:${config.personalAccessToken}`).toString("base64");
  }
  // ==========================================================================
  // Work Item Operations
  // ==========================================================================
  /**
   * Create a new work item
   * 
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create
   */
  async createWorkItem(request) {
    const workItemType = this.config.workItemType || "Epic";
    const url = `${this.baseUrl}/_apis/wit/workitems/$${workItemType}?api-version=7.1`;
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
    if (request.areaPath || this.config.areaPath) {
      operations.push({
        op: "add",
        path: "/fields/System.AreaPath",
        value: request.areaPath || this.config.areaPath
      });
    }
    if (request.iterationPath || this.config.iterationPath) {
      operations.push({
        op: "add",
        path: "/fields/System.IterationPath",
        value: request.iterationPath || this.config.iterationPath
      });
    }
    if (request.tags && request.tags.length > 0) {
      operations.push({
        op: "add",
        path: "/fields/System.Tags",
        value: request.tags.join("; ")
      });
    }
    const response = await this.request("POST", url, operations, {
      "Content-Type": "application/json-patch+json"
    });
    return response;
  }
  /**
   * Get work item by ID
   * 
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-item
   */
  async getWorkItem(id) {
    const url = `${this.baseUrl}/_apis/wit/workitems/${id}?api-version=7.1`;
    return this.request("GET", url);
  }
  /**
   * Update work item
   * 
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update
   */
  async updateWorkItem(id, request) {
    const url = `${this.baseUrl}/_apis/wit/workitems/${id}?api-version=7.1`;
    const operations = [];
    if (request.state) {
      operations.push({
        op: "add",
        path: "/fields/System.State",
        value: request.state
      });
    }
    if (request.title) {
      operations.push({
        op: "add",
        path: "/fields/System.Title",
        value: request.title
      });
    }
    if (request.description) {
      operations.push({
        op: "add",
        path: "/fields/System.Description",
        value: `<pre>${request.description}</pre>`
      });
    }
    if (request.tags) {
      operations.push({
        op: "add",
        path: "/fields/System.Tags",
        value: request.tags.join("; ")
      });
    }
    return this.request("PATCH", url, operations, {
      "Content-Type": "application/json-patch+json"
    });
  }
  /**
   * Delete work item (move to Recycle Bin)
   * 
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/delete
   */
  async deleteWorkItem(id) {
    const url = `${this.baseUrl}/_apis/wit/workitems/${id}?api-version=7.1`;
    await this.request("DELETE", url);
  }
  // ==========================================================================
  // Comment Operations
  // ==========================================================================
  /**
   * Add comment to work item
   * 
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/comments/add
   */
  async addComment(workItemId, text) {
    const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}/comments?api-version=7.1-preview.3`;
    const response = await this.request("POST", url, { text });
    return response;
  }
  /**
   * Get comments for work item
   *
   * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/comments/list
   */
  async getComments(workItemId) {
    const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}/comments?api-version=7.1-preview.3`;
    const response = await this.request("GET", url);
    return response.comments || [];
  }
  // ==========================================================================
  // Helper Methods
  // ==========================================================================
  /**
   * Make HTTP request to ADO API
   */
  async request(method, url, body, additionalHeaders) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          "Authorization": this.authHeader,
          "Accept": "application/json",
          ...body ? { "Content-Type": "application/json" } : {},
          ...additionalHeaders
        },
        timeout: 3e4
        // 30 second timeout
      };
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve(parsed);
            } catch (error) {
              reject(new Error(`Failed to parse JSON response: ${error}`));
            }
          } else {
            let errorMessage = `ADO API error: ${res.statusCode} ${res.statusMessage}`;
            try {
              const errorData = JSON.parse(data);
              if (errorData.message) {
                errorMessage += ` - ${errorData.message}`;
              }
            } catch {
            }
            reject(new Error(errorMessage));
          }
        });
      });
      req.on("error", (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });
      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`HTTP request timeout after 30 seconds`));
      });
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }
  /**
   * Test connection to ADO
   */
  async testConnection() {
    try {
      const url = `${this.baseUrl}/_apis/wit/workitemtypes?api-version=7.1`;
      await this.request("GET", url);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[ADO Client] Connection test failed:`, {
          message: error.message,
          organization: this.config.organization,
          project: this.config.project,
          baseUrl: this.baseUrl
        });
      }
      return false;
    }
  }
}
function createAdoClient(config = {}) {
  const fullConfig = {
    organization: config.organization || process.env.AZURE_DEVOPS_ORG || "",
    project: config.project || process.env.AZURE_DEVOPS_PROJECT || "",
    personalAccessToken: config.personalAccessToken || process.env.AZURE_DEVOPS_PAT || "",
    workItemType: config.workItemType,
    areaPath: config.areaPath,
    iterationPath: config.iterationPath
  };
  if (!fullConfig.organization) {
    throw new Error("ADO organization not configured");
  }
  if (!fullConfig.project) {
    throw new Error("ADO project not configured");
  }
  if (!fullConfig.personalAccessToken) {
    throw new Error("AZURE_DEVOPS_PAT not set");
  }
  return new AdoClient(fullConfig);
}
var ado_client_default = AdoClient;
export {
  AdoClient,
  createAdoClient,
  ado_client_default as default
};
