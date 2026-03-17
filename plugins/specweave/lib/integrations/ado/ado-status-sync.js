import axios from "axios";
import { SyncCircuitBreaker } from "../../../../../src/core/increment/sync-circuit-breaker.js";
import { withRetry } from "../../../../../src/core/sync/retry-wrapper.js";
import { SyncError } from "../../../../../src/core/errors/sync-error.js";
class AdoStatusSync {
  constructor(organization, project, personalAccessToken, breaker) {
    this.organization = organization;
    this.project = project;
    this.breaker = breaker ?? new SyncCircuitBreaker();
    this.client = axios.create({
      baseURL: `https://dev.azure.com/${organization}/${project}/_apis`,
      auth: {
        username: "",
        // Empty for PAT auth
        password: personalAccessToken
      },
      headers: {
        "Content-Type": "application/json-patch+json",
        "Accept": "application/json"
      }
    });
  }
  /**
   * Get current status from ADO work item
   *
   * @param workItemId - ADO work item ID (e.g., 123)
   * @returns Current work item state
   */
  async getStatus(workItemId) {
    this.assertCircuitClosed();
    return this.withResilienceWrapper(
      () => this.client.get(`/wit/workitems/${workItemId}?api-version=7.0`).then((response) => ({
        state: response.data.fields["System.State"]
      }))
    );
  }
  /**
   * Update ADO work item state and tags
   *
   * Uses JSON Patch format to update System.State and System.Tags fields.
   * Tags are appended to existing tags, not replaced.
   *
   * @param workItemId - ADO work item ID (e.g., 123)
   * @param status - Desired status with state and optional tags
   */
  async updateStatus(workItemId, status) {
    this.assertCircuitClosed();
    const patch = [
      {
        op: "add",
        path: "/fields/System.State",
        value: status.state
      }
    ];
    if (status.tags && status.tags.length > 0) {
      const currentTags = await this.getCurrentTags(workItemId);
      const statusTagPatterns = ["Planning", "In Progress", "Paused", "Completed", "Abandoned", "On Hold"];
      const preservedTags = currentTags.filter(
        (tag) => !statusTagPatterns.some((pattern) => tag.toLowerCase() === pattern.toLowerCase())
      );
      const allTags = [.../* @__PURE__ */ new Set([...preservedTags, ...status.tags])];
      patch.push({
        op: "add",
        path: "/fields/System.Tags",
        value: allTags.join("; ")
      });
    }
    await this.withResilienceWrapper(
      () => this.client.patch(`/wit/workitems/${workItemId}?api-version=7.0`, patch)
    );
  }
  /**
   * Check whether the circuit is closed (sync allowed).
   */
  canSync() {
    return this.breaker.canSync();
  }
  /**
   * Get current tags from ADO work item
   *
   * @param workItemId - ADO work item ID
   * @returns Array of current tags
   */
  async getCurrentTags(workItemId) {
    try {
      const response = await this.client.get(
        `/wit/workitems/${workItemId}?api-version=7.0&$select=System.Tags`
      );
      const tagsString = response.data.fields?.["System.Tags"] || "";
      if (!tagsString) return [];
      return tagsString.split(";").map((tag) => tag.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
  /**
   * Post comment about status change to ADO work item
   *
   * @param workItemId - ADO work item ID (e.g., 123)
   * @param oldStatus - Previous SpecWeave status
   * @param newStatus - New SpecWeave status
   */
  async postStatusComment(workItemId, oldStatus, newStatus) {
    this.assertCircuitClosed();
    const text = `\u{1F504} Status Update

SpecWeave status changed:
\u2022 From: ${oldStatus}
\u2022 To: ${newStatus}
\u2022 When: ${(/* @__PURE__ */ new Date()).toISOString()}

Synced from SpecWeave`;
    await this.withResilienceWrapper(
      () => this.client.post(
        `/wit/workitems/${workItemId}/comments?api-version=7.0-preview.3`,
        { text }
      )
    );
  }
  /**
   * Assert the circuit is closed. Throws CircuitOpenError if open.
   */
  assertCircuitClosed() {
    if (!this.breaker.canSync()) {
      throw new SyncError("ado", 503, "", "Circuit breaker open \u2014 sync blocked");
    }
  }
  /**
   * Wrap an async operation with retry + circuit breaker recording.
   */
  async withResilienceWrapper(fn) {
    try {
      const result = await withRetry(fn, { maxRetries: 3, baseMs: 500, maxMs: 5e3 });
      this.breaker.recordSuccess();
      return result;
    } catch (error) {
      this.breaker.recordFailure();
      if (error?.response?.status) {
        const status = error.response.status;
        const body = typeof error.response.data === "string" ? error.response.data : JSON.stringify(error.response.data ?? "");
        const detail = error.response.statusText || "Unknown";
        throw new SyncError("ado", status, body, detail);
      }
      throw error;
    }
  }
}
export {
  AdoStatusSync
};
