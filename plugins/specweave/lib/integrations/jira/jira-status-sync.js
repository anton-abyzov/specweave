import axios from "axios";
import { detectDeploymentType, getApiBaseUrl } from "./jira-deployment-detector.js";
import { toCommentBody } from "./content-format-adapter.js";
import { CircuitBreakerRegistry } from "../../../../../src/core/sync/circuit-breaker-registry.js";
import { SyncRetryQueue } from "../../../../../src/core/sync/sync-retry-queue.js";
import { SyncError } from "../../../../../src/core/errors/sync-error.js";
import { LockManager } from "../../../../../src/utils/lock-manager.js";
class JiraStatusSync {
  constructor(domain, email, apiToken, projectKey, options) {
    this.domain = domain;
    this.projectKey = projectKey;
    this.circuitBreakerRegistry = options?.circuitBreakerRegistry;
    this.retryQueue = options?.retryQueue;
    this.incrementId = options?.incrementId ?? "";
    this.featureId = options?.featureId ?? "";
    this.projectPath = options?.projectPath ?? "";
    this.projectName = options?.projectName ?? "";
    if (options?.lockDir) {
      this.lockManager = new LockManager(options.lockDir);
    }
    this.client = axios.create({
      baseURL: getApiBaseUrl(domain),
      auth: {
        username: email,
        password: apiToken
      },
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }
  async withLock(fn) {
    if (!this.lockManager) return fn();
    const acquired = await this.lockManager.acquire();
    if (!acquired) {
      throw new SyncError("jira", 0, "", "Failed to acquire JIRA sync lock");
    }
    try {
      return await fn();
    } finally {
      await this.lockManager.release();
    }
  }
  checkCircuitBreaker() {
    if (!this.circuitBreakerRegistry) return;
    const breaker = this.circuitBreakerRegistry.get("jira");
    if (!breaker.canSync()) {
      throw new SyncError("jira", 0, "", "Circuit breaker open for jira");
    }
  }
  recordSuccess() {
    if (!this.circuitBreakerRegistry) return;
    this.circuitBreakerRegistry.get("jira").recordSuccess();
  }
  async handleApiError(error, operation) {
    const httpStatus = error?.response?.status ?? 0;
    const responseBody = JSON.stringify(error?.response?.data ?? "");
    const detail = error?.message ?? String(error);
    if (this.circuitBreakerRegistry) {
      this.circuitBreakerRegistry.get("jira").recordFailure();
    }
    if (this.retryQueue && httpStatus >= 500) {
      await this.retryQueue.enqueue({
        incrementId: this.incrementId,
        provider: "jira",
        featureId: this.featureId,
        projectPath: this.projectPath,
        projectName: this.projectName,
        error: `${httpStatus} ${operation}: ${detail}`
      });
    }
    throw new SyncError("jira", httpStatus, responseBody, detail);
  }
  async init() {
    const deployment = await detectDeploymentType(this.domain, {
      email: this.client.defaults.auth?.username || "",
      apiToken: this.client.defaults.auth?.password || ""
    });
    this.client.defaults.baseURL = deployment.baseUrl;
  }
  async getStatus(issueKey) {
    return this.withLock(async () => {
      this.checkCircuitBreaker();
      try {
        const response = await this.client.get(`/issue/${issueKey}`);
        this.recordSuccess();
        return {
          state: response.data.fields.status.name
        };
      } catch (error) {
        return this.handleApiError(error, "getStatus");
      }
    });
  }
  async updateStatus(issueKey, status) {
    return this.withLock(async () => {
      this.checkCircuitBreaker();
      try {
        const transitionsResponse = await this.client.get(`/issue/${issueKey}/transitions`);
        const transitions = transitionsResponse.data.transitions;
        const targetTransition = transitions.find(
          (t) => t.to.name.toLowerCase() === status.state.toLowerCase()
        );
        if (!targetTransition) {
          console.warn(
            `\u26A0\uFE0F  Cannot transition ${issueKey} to "${status.state}". Available transitions: ${transitions.map((t) => t.to.name).join(", ")}. This may be expected if your JIRA workflow doesn't support this status.`
          );
          return false;
        }
        await this.client.post(`/issue/${issueKey}/transitions`, {
          transition: {
            id: targetTransition.id
          }
        });
        this.recordSuccess();
        return true;
      } catch (error) {
        return this.handleApiError(error, "updateStatus");
      }
    });
  }
  async postStatusComment(issueKey, oldStatus, newStatus) {
    return this.withLock(async () => {
      this.checkCircuitBreaker();
      try {
        const rawBody = `*Status Update*

SpecWeave status changed:
* *From*: ${oldStatus}
* *To*: ${newStatus}
* *When*: ${(/* @__PURE__ */ new Date()).toISOString()}

_Synced from SpecWeave_`;
        const body = toCommentBody(rawBody, this.domain);
        await this.client.post(`/issue/${issueKey}/comment`, {
          body
        });
        this.recordSuccess();
      } catch (error) {
        return this.handleApiError(error, "postStatusComment");
      }
    });
  }
  async postProgressComment(issueKey, acStates) {
    return this.withLock(async () => {
      this.checkCircuitBreaker();
      const total = acStates.length;
      const completed = acStates.filter((ac) => ac.completed).length;
      const percentage = Math.round(completed / total * 100);
      const fingerprint = `sw-progress:${completed}/${total}`;
      try {
        const commentsResp = await this.client.get(`/issue/${issueKey}/comment`, {
          params: { orderBy: "-created", maxResults: 1 }
        });
        const lastComment = commentsResp.data?.comments?.[0];
        if (lastComment) {
          const lastText = extractAdfText(lastComment.body);
          if (lastText.includes(fingerprint)) {
            return false;
          }
        }
      } catch {
      }
      const listItems = acStates.map((ac) => ({
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [
            { type: "text", text: `${ac.completed ? "\u2705" : "\u274C"} ${ac.id}: ${ac.description}` }
          ]
        }]
      }));
      const body = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "heading",
            attrs: { level: 3 },
            content: [{ type: "text", text: `Progress: ${completed}/${total} ACs (${percentage}%)` }]
          },
          {
            type: "bulletList",
            content: listItems
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: `${fingerprint} | Synced from SpecWeave`, marks: [{ type: "em" }] }
            ]
          }
        ]
      };
      await this.client.post(`/issue/${issueKey}/comment`, { body });
      this.recordSuccess();
      return true;
    });
  }
}
function extractAdfText(adf) {
  if (!adf) return "";
  if (typeof adf === "string") return adf;
  let text = "";
  if (adf.text) text += adf.text;
  if (Array.isArray(adf.content)) {
    for (const child of adf.content) {
      text += extractAdfText(child);
    }
  }
  return text;
}
export {
  JiraStatusSync
};
