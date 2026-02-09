/**
 * GitHub GraphQL Client for Projects V2
 *
 * Wraps `gh api graphql` CLI calls for GitHub Projects V2 operations.
 * All calls use child_process.execFile for security (no shell interpolation).
 *
 * @module github-graphql-client
 */

import { execFile } from 'child_process';

interface ProjectField {
  id: string;
  name: string;
  options?: Array<{ id: string; name: string }>;
}

interface GraphQLResponse {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string; type?: string; path?: string[] }>;
}

export class GitHubGraphQLClient {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  /**
   * Resolve an owner login (user or org) to a node ID.
   * Tries user first, falls back to organization.
   */
  async getOwnerNodeId(login: string): Promise<string> {
    // Try user query first
    const userQuery = `query { user(login: "${login}") { id } }`;
    const userResult = await this.executeGraphQL(userQuery);

    if (userResult.data?.user && (userResult.data.user as { id?: string }).id) {
      return (userResult.data.user as { id: string }).id;
    }

    // Fallback to organization
    const orgQuery = `query { organization(login: "${login}") { id } }`;
    const orgResult = await this.executeGraphQL(orgQuery);

    if (orgResult.data?.organization && (orgResult.data.organization as { id?: string }).id) {
      return (orgResult.data.organization as { id: string }).id;
    }

    throw new Error(`Could not resolve to a User or Organization with the login of '${login}'.`);
  }

  /**
   * Create a new GitHub Projects V2 board.
   */
  async createProjectV2(ownerId: string, title: string): Promise<{ id: string; number: number }> {
    const query = `mutation {
      createProjectV2(input: { ownerId: "${ownerId}", title: "${title}" }) {
        projectV2 { id number }
      }
    }`;

    const result = await this.executeGraphQL(query);
    const project = (result.data?.createProjectV2 as { projectV2: { id: string; number: number } })?.projectV2;
    return { id: project.id, number: project.number };
  }

  /**
   * Add an issue (by node ID) to a Projects V2 board.
   * Returns the project item ID. Idempotent.
   */
  async addProjectV2Item(projectId: string, contentId: string): Promise<string> {
    const query = `mutation {
      addProjectV2ItemById(input: { projectId: "${projectId}", contentId: "${contentId}" }) {
        item { id }
      }
    }`;

    const result = await this.executeGraphQL(query);
    const item = (result.data?.addProjectV2ItemById as { item: { id: string } })?.item;
    return item.id;
  }

  /**
   * Update a field value on a Projects V2 item.
   */
  async updateItemFieldValue(
    projectId: string,
    itemId: string,
    fieldId: string,
    value: { singleSelectOptionId: string },
  ): Promise<void> {
    const query = `mutation {
      updateProjectV2ItemFieldValue(input: {
        projectId: "${projectId}",
        itemId: "${itemId}",
        fieldId: "${fieldId}",
        value: { singleSelectOptionId: "${value.singleSelectOptionId}" }
      }) {
        projectV2Item { id }
      }
    }`;

    await this.executeGraphQL(query);
  }

  /**
   * Get field definitions for a Projects V2 board.
   */
  async getProjectFields(projectId: string): Promise<ProjectField[]> {
    const query = `query {
      node(id: "${projectId}") {
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

    const result = await this.executeGraphQL(query);
    const fields = (result.data?.node as { fields?: { nodes: Array<{
      id: string;
      name: string;
      dataType: string;
      options?: Array<{ id: string; name: string }>;
    }> } })?.fields?.nodes || [];

    return fields.map((f) => {
      const field: ProjectField = { id: f.id, name: f.name };
      if (f.options && f.options.length > 0) {
        field.options = f.options;
      }
      return field;
    });
  }

  /**
   * Execute a GraphQL query via `gh api graphql`.
   */
  private executeGraphQL(query: string): Promise<GraphQLResponse> {
    return new Promise((resolve, reject) => {
      const args = ['api', 'graphql', '-f', `query=${query}`];
      const opts: { env?: NodeJS.ProcessEnv } = {};

      if (this.token) {
        opts.env = { ...process.env, GH_TOKEN: this.token };
      }

      execFile('gh', args, opts, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
          return;
        }

        let parsed: GraphQLResponse;
        try {
          parsed = JSON.parse(stdout);
        } catch {
          reject(new Error(`Failed to parse GraphQL response: ${stdout.slice(0, 200)}`));
          return;
        }

        if (parsed.errors && parsed.errors.length > 0) {
          const messages = parsed.errors.map((e) => e.message).join('; ');
          reject(new Error(`GraphQL error: ${messages}`));
          return;
        }

        resolve(parsed);
      });
    });
  }
}
