import * as fs from "../../../../../src/utils/fs-native.js";
import * as path from "path";
import * as yaml from "yaml";
import { toDescription } from "./content-format-adapter.js";
class JiraEpicSync {
  constructor(client, specsDir, projectKey, domain) {
    this.client = client;
    this.specsDir = specsDir;
    this.projectKey = projectKey;
    this.domain = domain || client["credentials"]?.domain || "";
  }
  /**
   * Sync Epic folder to JIRA (Epic + Stories)
   */
  async syncEpicToJira(epicId) {
    console.log(`
\u{1F504} Syncing Epic ${epicId} to JIRA...`);
    const epicFolder = await this.findEpicFolder(epicId);
    if (!epicFolder) {
      throw new Error(`Epic ${epicId} not found in ${this.specsDir}`);
    }
    const readmePath = path.join(epicFolder, "README.md");
    const epicData = await this.parseEpicReadme(readmePath);
    console.log(`   \u{1F4E6} Epic: ${epicData.title}`);
    console.log(`   \u{1F4CA} Increments: ${epicData.total_increments}`);
    let epicKey = epicData.external_tools.jira.key;
    let epicUrl = epicData.external_tools.jira.url;
    if (!epicKey) {
      console.log(`   \u{1F680} Creating JIRA Epic...`);
      const epic = await this.createEpic(epicData);
      epicKey = epic.key;
      epicUrl = epic.url;
      console.log(`   \u2705 Created Epic ${epicKey}`);
      await this.updateEpicReadme(readmePath, {
        type: "epic",
        key: epicKey,
        url: epicUrl
      });
    } else {
      console.log(`   \u267B\uFE0F  Updating existing Epic ${epicKey}...`);
      await this.updateEpic(epicKey, epicData);
      console.log(`   \u2705 Updated Epic ${epicKey}`);
    }
    let storiesCreated = 0;
    let storiesUpdated = 0;
    console.log(`
   \u{1F4DD} Syncing ${epicData.increments.length} increments...`);
    for (const increment of epicData.increments) {
      const incrementFile = path.join(epicFolder, `${increment.id}.md`);
      if (!await fs.pathExists(incrementFile)) {
        console.log(`   \u26A0\uFE0F  Increment file not found: ${increment.id}.md`);
        continue;
      }
      const incrementData = await this.parseIncrementFile(incrementFile);
      const existingStory = increment.external.jira;
      if (!existingStory) {
        const storyKey = await this.createStory(
          epicData.id,
          incrementData,
          epicKey
        );
        storiesCreated++;
        console.log(`   \u2705 Created Story ${storyKey} for ${increment.id}`);
        await this.updateIncrementExternalLink(
          readmePath,
          incrementFile,
          increment.id,
          storyKey
        );
      } else {
        await this.updateStory(
          epicData.id,
          existingStory,
          incrementData,
          epicKey
        );
        storiesUpdated++;
        console.log(`   \u267B\uFE0F  Updated Story ${existingStory} for ${increment.id}`);
      }
    }
    console.log(`
\u2705 Epic sync complete!`);
    console.log(`   Epic: ${epicUrl}`);
    console.log(`   Stories created: ${storiesCreated}`);
    console.log(`   Stories updated: ${storiesUpdated}`);
    return {
      epicKey,
      epicUrl,
      storiesCreated,
      storiesUpdated
    };
  }
  /**
   * Find Epic folder by ID (FS-001 or just 001)
   */
  async findEpicFolder(epicId) {
    const folders = await fs.readdir(this.specsDir);
    for (const folder of folders) {
      if (folder.startsWith(epicId)) {
        return path.join(this.specsDir, folder);
      }
    }
    const prefix = `${this.projectKey}-`;
    const normalizedId = epicId.startsWith(prefix) ? epicId : `${prefix}${epicId.padStart(3, "0")}`;
    for (const folder of folders) {
      if (folder.startsWith(normalizedId)) {
        return path.join(this.specsDir, folder);
      }
    }
    return null;
  }
  /**
   * Parse Epic README.md to extract frontmatter
   */
  async parseEpicReadme(readmePath) {
    const content = await fs.readFile(readmePath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error("Epic README.md missing YAML frontmatter");
    }
    const frontmatter = yaml.parse(match[1]);
    return frontmatter;
  }
  /**
   * Parse increment file to extract title and overview
   */
  async parseIncrementFile(filePath) {
    const content = await fs.readFile(filePath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    let frontmatter = { id: "", epic: "" };
    let bodyContent = content;
    if (match) {
      frontmatter = yaml.parse(match[1]);
      bodyContent = content.slice(match[0].length).trim();
    }
    const titleMatch = bodyContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : frontmatter.id || path.basename(filePath, ".md");
    const overviewMatch = bodyContent.match(/^#[^\n]+\n+([^\n]+)/);
    const overview = overviewMatch ? overviewMatch[1].trim() : "No overview available";
    return {
      id: frontmatter.id,
      title,
      overview,
      content: bodyContent,
      frontmatter
    };
  }
  /**
   * Create JIRA Epic
   */
  async createEpic(epic) {
    const summary = `[${epic.id}] ${epic.title}`;
    const rawDescription = `Epic: ${epic.title}

Progress: ${epic.completed_increments}/${epic.total_increments} increments (${epic.progress})

Priority: ${epic.priority}
Status: ${epic.status}`;
    const description = toDescription(rawDescription, this.domain);
    const issueData = {
      issueType: "Epic",
      summary,
      description,
      priority: this.mapPriorityToJira(epic.priority),
      labels: ["epic-sync", epic.id.toLowerCase()]
    };
    const issue = await this.client.createIssue(issueData, this.projectKey);
    return {
      key: issue.key,
      url: issue.self.replace(/\/rest\/api\/\d+\/issue\//, "/browse/")
    };
  }
  /**
   * Update JIRA Epic
   */
  async updateEpic(epicKey, epic) {
    const summary = `[${epic.id}] ${epic.title}`;
    const rawDescription = `Epic: ${epic.title}

Progress: ${epic.completed_increments}/${epic.total_increments} increments (${epic.progress})

Priority: ${epic.priority}
Status: ${epic.status}`;
    const description = toDescription(rawDescription, this.domain);
    await this.client.updateIssue({
      key: epicKey,
      summary,
      description,
      priority: this.mapPriorityToJira(epic.priority),
      labels: ["epic-sync", epic.id.toLowerCase()]
    });
  }
  /**
   * Create JIRA Story for increment
   */
  async createStory(epicId, increment, epicKey) {
    const summary = `[${epicId}] ${increment.title}`;
    const description = `${increment.overview}

---

**Increment**: ${increment.id}
**Epic**: ${epicId} (${epicKey})

\u{1F916} Auto-created by SpecWeave Epic Sync`;
    const issueData = {
      issueType: "Story",
      summary,
      description,
      epicKey,
      // Link to Epic via Epic Link field
      labels: ["increment", "epic-sync"]
    };
    const issue = await this.client.createIssue(issueData, this.projectKey);
    return issue.key;
  }
  /**
   * Update JIRA Story for increment
   */
  async updateStory(epicId, storyKey, increment, epicKey) {
    const summary = `[${epicId}] ${increment.title}`;
    const description = `${increment.overview}

---

**Increment**: ${increment.id}
**Epic**: ${epicId} (${epicKey})

\u{1F916} Auto-updated by SpecWeave Epic Sync`;
    await this.client.updateIssue({
      key: storyKey,
      summary,
      description,
      labels: ["increment", "epic-sync"]
    });
  }
  /**
   * Map SpecWeave priority to JIRA priority
   */
  mapPriorityToJira(priority) {
    const map = {
      P0: "Highest",
      P1: "High",
      P2: "Medium",
      P3: "Low"
    };
    return map[priority] || "Medium";
  }
  /**
   * Update Epic README.md with JIRA Epic key
   */
  async updateEpicReadme(readmePath, jira) {
    const content = await fs.readFile(readmePath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error("Epic README.md missing YAML frontmatter");
    }
    const frontmatter = yaml.parse(match[1]);
    frontmatter.external_tools.jira = jira;
    const newFrontmatter = yaml.stringify(frontmatter);
    const newContent = content.replace(
      /^---\n[\s\S]*?\n---/,
      `---
${newFrontmatter}---`
    );
    await fs.writeFile(readmePath, newContent, "utf-8");
  }
  /**
   * Update increment external link in both Epic README and increment file
   */
  async updateIncrementExternalLink(readmePath, incrementFile, incrementId, storyKey) {
    const storyUrl = `https://${this.client["credentials"].domain}/browse/${storyKey}`;
    const readmeContent = await fs.readFile(readmePath, "utf-8");
    const readmeMatch = readmeContent.match(/^---\n([\s\S]*?)\n---/);
    if (readmeMatch) {
      const frontmatter = yaml.parse(readmeMatch[1]);
      const increment = frontmatter.increments.find(
        (inc) => inc.id === incrementId
      );
      if (increment) {
        increment.external.jira = storyKey;
        const newFrontmatter = yaml.stringify(frontmatter);
        const newContent = readmeContent.replace(
          /^---\n[\s\S]*?\n---/,
          `---
${newFrontmatter}---`
        );
        await fs.writeFile(readmePath, newContent, "utf-8");
      }
    }
    const incrementContent = await fs.readFile(incrementFile, "utf-8");
    const incrementMatch = incrementContent.match(/^---\n([\s\S]*?)\n---/);
    if (incrementMatch) {
      const frontmatter = yaml.parse(incrementMatch[1]);
      if (!frontmatter.external) {
        frontmatter.external = {};
      }
      frontmatter.external.jira = {
        story: storyKey,
        url: storyUrl
      };
      const newFrontmatter = yaml.stringify(frontmatter);
      const newContent = incrementContent.replace(
        /^---\n[\s\S]*?\n---/,
        `---
${newFrontmatter}---`
      );
      await fs.writeFile(incrementFile, newContent, "utf-8");
    }
  }
}
export {
  JiraEpicSync
};
