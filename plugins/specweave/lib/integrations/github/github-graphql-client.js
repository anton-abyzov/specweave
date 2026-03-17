import { execFile } from "child_process";
class GitHubGraphQLClient {
  constructor(token) {
    this.token = token;
  }
  /**
   * Resolve an owner login (user or org) to a node ID.
   * Tries user first, falls back to organization.
   */
  async getOwnerNodeId(login) {
    const userQuery = `query($login: String!) { user(login: $login) { id } }`;
    const userResult = await this.executeGraphQL(userQuery, { login });
    if (userResult.data?.user && userResult.data.user.id) {
      return userResult.data.user.id;
    }
    const orgQuery = `query($login: String!) { organization(login: $login) { id } }`;
    const orgResult = await this.executeGraphQL(orgQuery, { login });
    if (orgResult.data?.organization && orgResult.data.organization.id) {
      return orgResult.data.organization.id;
    }
    throw new Error(`Could not resolve to a User or Organization with the login of '${login}'.`);
  }
  /**
   * Create a new GitHub Projects V2 board.
   */
  async createProjectV2(ownerId, title) {
    const query = `mutation($ownerId: ID!, $title: String!) {
      createProjectV2(input: { ownerId: $ownerId, title: $title }) {
        projectV2 { id number }
      }
    }`;
    const result = await this.executeGraphQL(query, { ownerId, title });
    const project = result.data?.createProjectV2?.projectV2;
    return { id: project.id, number: project.number };
  }
  /**
   * Add an issue (by node ID) to a Projects V2 board.
   * Returns the project item ID. Idempotent.
   */
  async addProjectV2Item(projectId, contentId) {
    const query = `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }`;
    const result = await this.executeGraphQL(query, { projectId, contentId });
    const item = result.data?.addProjectV2ItemById?.item;
    return item.id;
  }
  /**
   * Update a field value on a Projects V2 item.
   */
  async updateItemFieldValue(projectId, itemId, fieldId, value) {
    const query = `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId,
        itemId: $itemId,
        fieldId: $fieldId,
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item { id }
      }
    }`;
    await this.executeGraphQL(query, {
      projectId,
      itemId,
      fieldId,
      optionId: value.singleSelectOptionId
    });
  }
  /**
   * Get field definitions for a Projects V2 board.
   */
  async getProjectFields(projectId) {
    const query = `query($nodeId: ID!) {
      node(id: $nodeId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field { id name dataType }
              ... on ProjectV2SingleSelectField {
                id name dataType
                options { id name }
              }
            }
          }
        }
      }
    }`;
    const result = await this.executeGraphQL(query, { nodeId: projectId });
    const fields = result.data?.node?.fields?.nodes || [];
    return fields.map((f) => {
      const field = { id: f.id, name: f.name };
      if (f.options && f.options.length > 0) {
        field.options = f.options;
      }
      return field;
    });
  }
  /**
   * Execute a GraphQL query via `gh api graphql`.
   * All variables are passed via `-F` flags to prevent injection.
   */
  executeGraphQL(query, variables = {}) {
    return new Promise((resolve, reject) => {
      const args = ["api", "graphql", "-f", `query=${query}`];
      for (const [key, value] of Object.entries(variables)) {
        args.push("-F", `${key}=${value}`);
      }
      const opts = {};
      if (this.token) {
        opts.env = { ...process.env, GH_TOKEN: this.token };
      }
      execFile("gh", args, opts, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(stdout);
        } catch {
          reject(new Error(`Failed to parse GraphQL response: ${stdout.slice(0, 200)}`));
          return;
        }
        if (parsed.errors && parsed.errors.length > 0) {
          const messages = parsed.errors.map((e) => e.message).join("; ");
          reject(new Error(`GraphQL error: ${messages}`));
          return;
        }
        resolve(parsed);
      });
    });
  }
}
export {
  GitHubGraphQLClient
};
