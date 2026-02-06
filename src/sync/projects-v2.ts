/**
 * GitHub Projects v2 Integration
 *
 * ADR-0238: Separate module for GitHub Projects v2 (GraphQL-based).
 * Provides custom fields, board views, and status workflows.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectV2Config {
  token: string;
  owner: string;
  repo: string;
}

export interface ProjectV2 {
  id: string;
  title: string;
  number: number;
}

export interface ProjectField {
  id: string;
  name: string;
  dataType: string;
  options?: Array<{ id: string; name: string }>;
}

export interface FieldValue {
  text?: string;
  number?: number;
  date?: string;
  singleSelectOptionId?: string;
  iterationId?: string;
}

// ---------------------------------------------------------------------------
// GitHubProjectsV2 Client
// ---------------------------------------------------------------------------

const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

export class GitHubProjectsV2 {
  private token: string;
  private owner: string;
  private repo: string;

  constructor(config: ProjectV2Config) {
    this.token = config.token;
    this.owner = config.owner;
    this.repo = config.repo;
  }

  /**
   * List all Projects v2 for the repository.
   */
  async listProjects(): Promise<ProjectV2[]> {
    const query = `
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          projectsV2(first: 20) {
            nodes {
              id
              title
              number
            }
          }
        }
      }
    `;

    const data = await this.graphql(query, { owner: this.owner, repo: this.repo });
    return data.repository?.projectsV2?.nodes || [];
  }

  /**
   * Get fields for a specific project.
   */
  async getProjectFields(projectId: string): Promise<ProjectField[]> {
    const query = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            fields(first: 50) {
              nodes {
                ... on ProjectV2Field {
                  id
                  name
                  dataType
                }
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  dataType
                  options {
                    id
                    name
                  }
                }
                ... on ProjectV2IterationField {
                  id
                  name
                  dataType
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.graphql(query, { projectId });
    return data.node?.fields?.nodes || [];
  }

  /**
   * Add an issue (by node ID) to a project.
   * Returns the project item ID.
   */
  async addIssueToProject(issueNodeId: string, projectId: string): Promise<string> {
    const mutation = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
          item {
            id
          }
        }
      }
    `;

    const data = await this.graphql(mutation, { projectId, contentId: issueNodeId });
    return data.addProjectV2ItemById?.item?.id;
  }

  /**
   * Update a field value on a project item.
   */
  async updateProjectItemField(
    projectId: string,
    itemId: string,
    fieldId: string,
    value: FieldValue,
  ): Promise<void> {
    const mutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId,
          itemId: $itemId,
          fieldId: $fieldId,
          value: $value
        }) {
          projectV2Item {
            id
          }
        }
      }
    `;

    await this.graphql(mutation, { projectId, itemId, fieldId, value });
  }

  /**
   * Create a field mapping from SpecWeave fields to project fields.
   */
  mapFields(
    specweaveFields: Record<string, string>,
    projectFields: ProjectField[],
  ): Map<string, ProjectField> {
    const mapping = new Map<string, ProjectField>();

    for (const [swField, projectFieldName] of Object.entries(specweaveFields)) {
      const found = projectFields.find(
        f => f.name.toLowerCase() === projectFieldName.toLowerCase()
      );
      if (found) {
        mapping.set(swField, found);
      }
    }

    return mapping;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private async graphql(query: string, variables: Record<string, unknown>): Promise<Record<string, any>> {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SpecWeave-Sync',
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json() as { data?: Record<string, any>; errors?: unknown[] };

    if (json.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
    }

    return json.data || {};
  }
}
