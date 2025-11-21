/**
 * Jira Hierarchy Mapper
 *
 * Maps SpecWeave universal hierarchy to Jira issue types
 *
 * Supports:
 * - Jira Agile: Initiative → Epic → Story → Sub-task
 * - Jira CMMI: Epic → Feature → Requirement → Task
 * - Jira SAFe: Strategic Theme → Capability → User Story → Task
 *
 * @module integrations/jira/jira-hierarchy-mapper
 */

import chalk from 'chalk';
import { JiraClient } from './jira-client.js';

/**
 * Jira hierarchy mapping for different project types
 */
export interface JiraHierarchyMapping {
  epic: string;       // Initiative | Theme | Epic
  feature: string;    // Epic | Capability | Feature
  userStory: string;  // Story | User Story | Requirement
  task: string;       // Sub-task | Task
}

/**
 * SpecWeave Epic metadata
 */
export interface SpecWeaveEpic {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
}

/**
 * SpecWeave Feature metadata
 */
export interface SpecWeaveFeature {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  epic?: string;
}

/**
 * SpecWeave User Story metadata
 */
export interface SpecWeaveUserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: string;
  priority: string;
  feature?: string;
}

/**
 * Maps SpecWeave universal hierarchy to Jira issue types
 */
export class JiraHierarchyMapper {
  private jiraClient: JiraClient;

  constructor(jiraClient: JiraClient) {
    this.jiraClient = jiraClient;
  }

  /**
   * Detect Jira project type based on available issue types
   *
   * @param projectKey - Jira project key
   * @returns Detected hierarchy mapping
   */
  async detectProjectType(projectKey: string): Promise<JiraHierarchyMapping> {
    try {
      // Fetch issue types for project
      // Note: This requires implementing getIssueTypes in JiraClient
      // For now, we'll use a default Agile mapping
      // TODO: Implement getIssueTypes in JiraClient

      // Default: Agile (has "Story" and "Sub-task")
      console.log(chalk.cyan(`📊 Using Jira Agile hierarchy for project: ${projectKey}`));
      return {
        epic: 'Initiative',
        feature: 'Epic',
        userStory: 'Story',
        task: 'Sub-task'
      };

      /* Future implementation:
      const issueTypes = await this.jiraClient.getIssueTypes(projectKey);
      const typeNames = issueTypes.map(t => t.name.toLowerCase());

      // Detect SAFe (has "Capability" or "Strategic Theme")
      if (typeNames.includes('capability') || typeNames.includes('strategic theme')) {
        console.log(chalk.cyan(`📊 Detected Jira SAFe project: ${projectKey}`));
        return {
          epic: 'Strategic Theme',
          feature: 'Capability',
          userStory: 'User Story',
          task: 'Task'
        };
      }

      // Detect CMMI (has "Requirement")
      if (typeNames.includes('requirement')) {
        console.log(chalk.cyan(`📊 Detected Jira CMMI project: ${projectKey}`));
        return {
          epic: 'Epic',
          feature: 'Feature',
          userStory: 'Requirement',
          task: 'Task'
        };
      }

      // Default: Agile
      console.log(chalk.cyan(`📊 Detected Jira Agile project: ${projectKey}`));
      return {
        epic: 'Initiative',
        feature: 'Epic',
        userStory: 'Story',
        task: 'Sub-task'
      };
      */
    } catch (error: any) {
      console.error(chalk.red(`⚠️  Failed to detect Jira project type: ${error.message}`));
      console.log(chalk.gray('   Using default Agile hierarchy\n'));

      // Fallback to Agile
      return {
        epic: 'Initiative',
        feature: 'Epic',
        userStory: 'Story',
        task: 'Sub-task'
      };
    }
  }

  /**
   * Map SpecWeave work item to Jira issue type
   *
   * @param level - SpecWeave hierarchy level
   * @param mapping - Jira hierarchy mapping
   * @returns Jira issue type name
   */
  mapToJiraIssueType(
    level: 'epic' | 'feature' | 'userStory' | 'task',
    mapping: JiraHierarchyMapping
  ): string {
    return mapping[level];
  }

  /**
   * Create SpecWeave Epic in Jira
   *
   * @param epic - SpecWeave epic metadata
   * @param projectKey - Jira project key
   * @returns Created Jira issue key
   */
  async syncEpicToJira(epic: SpecWeaveEpic, projectKey: string): Promise<string> {
    const mapping = await this.detectProjectType(projectKey);
    const jiraIssueType = this.mapToJiraIssueType('epic', mapping);

    console.log(chalk.cyan(`📝 Creating ${jiraIssueType} in Jira: ${epic.title}`));

    // Create Initiative/Theme/Epic in Jira
    const issue = await this.jiraClient.createIssue({
      issueType: jiraIssueType as any,
      summary: epic.title,
      description: epic.description,
      priority: epic.priority,
      labels: [`specweave-epic-${epic.id}`]
    }, projectKey);

    console.log(chalk.green(`✅ Created ${jiraIssueType}: ${issue.key}\n`));
    return issue.key;
  }

  /**
   * Create SpecWeave Feature in Jira
   *
   * @param feature - SpecWeave feature metadata
   * @param projectKey - Jira project key
   * @param epicKey - Parent epic key (optional)
   * @returns Created Jira issue key
   */
  async syncFeatureToJira(
    feature: SpecWeaveFeature,
    projectKey: string,
    epicKey?: string
  ): Promise<string> {
    const mapping = await this.detectProjectType(projectKey);
    const jiraIssueType = this.mapToJiraIssueType('feature', mapping);

    console.log(chalk.cyan(`📝 Creating ${jiraIssueType} in Jira: ${feature.title}`));

    // Create Epic/Capability/Feature in Jira
    const issue = await this.jiraClient.createIssue({
      issueType: jiraIssueType as any,
      summary: feature.title,
      description: feature.description,
      priority: feature.priority,
      labels: [`specweave-feature-${feature.id}`],
      epicKey  // Link to parent epic (if exists)
    }, projectKey);

    console.log(chalk.green(`✅ Created ${jiraIssueType}: ${issue.key}\n`));
    return issue.key;
  }

  /**
   * Create SpecWeave User Story in Jira
   *
   * @param userStory - SpecWeave user story metadata
   * @param projectKey - Jira project key
   * @param featureKey - Parent feature key (optional)
   * @returns Created Jira issue key
   */
  async syncUserStoryToJira(
    userStory: SpecWeaveUserStory,
    projectKey: string,
    featureKey?: string
  ): Promise<string> {
    const mapping = await this.detectProjectType(projectKey);
    const jiraIssueType = this.mapToJiraIssueType('userStory', mapping);

    console.log(chalk.cyan(`📝 Creating ${jiraIssueType} in Jira: ${userStory.title}`));

    // Build description with acceptance criteria
    let description = userStory.description;
    if (userStory.acceptanceCriteria && userStory.acceptanceCriteria.length > 0) {
      description += '\n\n**Acceptance Criteria:**\n';
      userStory.acceptanceCriteria.forEach((ac, index) => {
        description += `\n${index + 1}. ${ac}`;
      });
    }

    // Create Story/User Story/Requirement in Jira
    const issue = await this.jiraClient.createIssue({
      issueType: jiraIssueType as any,
      summary: userStory.title,
      description,
      priority: userStory.priority,
      labels: [`specweave-us-${userStory.id}`],
      epicKey: featureKey  // Link to parent feature
    }, projectKey);

    console.log(chalk.green(`✅ Created ${jiraIssueType}: ${issue.key}\n`));
    return issue.key;
  }
}
