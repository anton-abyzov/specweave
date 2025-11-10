/**
 * Spec Metadata Manager
 *
 * Manages spec.md files in .specweave/docs/internal/specs/
 *
 * CRITICAL ARCHITECTURE:
 * - Specs are the SOURCE OF TRUTH for features
 * - Specs are PERMANENT (never deleted)
 * - External tools (GitHub/Jira/ADO) sync to specs, NOT increments
 *
 * @module spec-metadata-manager
 */
import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
export class SpecMetadataManager {
    constructor(projectRoot = process.cwd()) {
        // Support both old and new multi-project structure
        const newPath = path.join(projectRoot, '.specweave/docs/internal/projects/default/specs');
        const oldPath = path.join(projectRoot, '.specweave/docs/internal/specs');
        if (fs.existsSync(newPath)) {
            this.specsDir = newPath;
        }
        else if (fs.existsSync(oldPath)) {
            this.specsDir = oldPath;
        }
        else {
            // Create default structure
            this.specsDir = newPath;
            fs.ensureDirSync(this.specsDir);
        }
    }
    /**
     * Get all spec files
     */
    async getAllSpecs() {
        if (!fs.existsSync(this.specsDir)) {
            return [];
        }
        const files = await fs.readdir(this.specsDir);
        return files.filter(f => f.startsWith('spec-') && f.endsWith('.md'));
    }
    /**
     * Load spec metadata and content
     */
    async loadSpec(specId) {
        const filePath = this.getSpecPath(specId);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const parsed = matter(fileContent);
            const metadata = parsed.data;
            metadata.id = specId;
            // Parse user stories from markdown content
            const userStories = this.parseUserStories(parsed.content);
            // Parse increments from markdown content
            const increments = this.parseIncrements(parsed.content);
            return {
                metadata: {
                    ...metadata,
                    userStories,
                    increments,
                    progress: this.calculateProgress(userStories)
                },
                markdown: parsed.content,
                filePath
            };
        }
        catch (error) {
            console.error(`Error loading spec ${specId}:`, error);
            return null;
        }
    }
    /**
     * Save spec metadata (update frontmatter)
     */
    async saveMetadata(specId, metadata) {
        const filePath = this.getSpecPath(specId);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Spec ${specId} not found`);
        }
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const parsed = matter(fileContent);
        // Merge metadata
        const updatedMetadata = {
            ...parsed.data,
            ...metadata,
            updated: new Date().toISOString().split('T')[0]
        };
        // Don't save calculated fields
        delete updatedMetadata.userStories;
        delete updatedMetadata.increments;
        delete updatedMetadata.progress;
        // Reconstruct file with updated frontmatter
        const newContent = matter.stringify(parsed.content, updatedMetadata);
        await fs.writeFile(filePath, newContent, 'utf-8');
    }
    /**
     * Link spec to external tool
     */
    async linkToExternal(specId, provider, externalData) {
        const spec = await this.loadSpec(specId);
        if (!spec) {
            throw new Error(`Spec ${specId} not found`);
        }
        const externalLinks = spec.metadata.externalLinks || {};
        if (provider === 'github') {
            externalLinks.github = {
                projectId: externalData.id,
                projectUrl: externalData.url,
                syncedAt: new Date().toISOString(),
                owner: externalData.owner,
                repo: externalData.repo
            };
        }
        else if (provider === 'jira') {
            externalLinks.jira = {
                epicKey: externalData.id,
                epicUrl: externalData.url,
                syncedAt: new Date().toISOString(),
                projectKey: externalData.projectKey,
                domain: externalData.domain
            };
        }
        else if (provider === 'ado') {
            externalLinks.ado = {
                featureId: externalData.id,
                featureUrl: externalData.url,
                syncedAt: new Date().toISOString(),
                organization: externalData.organization,
                project: externalData.project
            };
        }
        await this.saveMetadata(specId, { externalLinks });
    }
    /**
     * Unlink spec from external tool
     */
    async unlinkFromExternal(specId, provider) {
        const spec = await this.loadSpec(specId);
        if (!spec) {
            throw new Error(`Spec ${specId} not found`);
        }
        const externalLinks = spec.metadata.externalLinks || {};
        delete externalLinks[provider];
        await this.saveMetadata(specId, { externalLinks });
    }
    /**
     * Update sync status
     */
    async updateSyncStatus(specId, provider, status, error) {
        const spec = await this.loadSpec(specId);
        if (!spec) {
            throw new Error(`Spec ${specId} not found`);
        }
        const externalLinks = spec.metadata.externalLinks || {};
        if (externalLinks[provider]) {
            externalLinks[provider].syncedAt = new Date().toISOString();
            // Note: syncStatus and lastError are not in the interface yet, would need to add
        }
        await this.saveMetadata(specId, { externalLinks });
    }
    /**
     * Validate spec structure
     */
    async validateSpec(specId) {
        const spec = await this.loadSpec(specId);
        if (!spec) {
            return {
                valid: false,
                errors: [`Spec ${specId} not found`],
                warnings: [],
                specId
            };
        }
        const errors = [];
        const warnings = [];
        // Required metadata fields
        if (!spec.metadata.title) {
            errors.push('Missing required field: title');
        }
        if (!spec.metadata.status) {
            errors.push('Missing required field: status');
        }
        if (!spec.metadata.priority) {
            errors.push('Missing required field: priority');
        }
        // Validate user stories
        if (!spec.metadata.userStories || spec.metadata.userStories.length === 0) {
            warnings.push('No user stories found in spec');
        }
        // Validate frontmatter format
        if (!spec.markdown.includes('## Overview') && !spec.markdown.includes('## User Stories')) {
            warnings.push('Missing standard sections (Overview, User Stories)');
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            specId
        };
    }
    /**
     * Get spec file path
     */
    getSpecPath(specId) {
        // Handle both formats: "spec-001" and "001"
        const normalizedId = specId.startsWith('spec-') ? specId : `spec-${specId}`;
        return path.join(this.specsDir, `${normalizedId}.md`);
    }
    /**
     * Parse user stories from markdown content
     */
    parseUserStories(markdown) {
        const stories = [];
        // Look for user story patterns
        // Example: **US-001**: As a developer, I want to...
        const usPattern = /\*\*US-(\d+)\*\*:\s*(.+?)(?=\n|$)/g;
        const matches = markdown.matchAll(usPattern);
        for (const match of matches) {
            const id = `US-${match[1]}`;
            const title = match[2].trim();
            // Extract acceptance criteria for this user story
            const acPattern = new RegExp(`\\*\\*US-${match[1]}\\*\\*:[\\s\\S]*?(?:- \\[([x ])\\] \\*\\*AC-${match[1]}-(\\d+)\\*\\*: (.+?)(?=\\n|$))`, 'g');
            const acMatches = markdown.matchAll(acPattern);
            const acceptanceCriteria = [];
            for (const acMatch of acMatches) {
                acceptanceCriteria.push({
                    id: `AC-${match[1]}-${acMatch[2]}`,
                    description: acMatch[3].trim(),
                    status: acMatch[1] === 'x' ? 'done' : 'todo'
                });
            }
            // Determine status based on AC completion
            let status = 'todo';
            if (acceptanceCriteria.length > 0) {
                const completedAC = acceptanceCriteria.filter(ac => ac.status === 'done').length;
                if (completedAC === acceptanceCriteria.length) {
                    status = 'done';
                }
                else if (completedAC > 0) {
                    status = 'in-progress';
                }
            }
            stories.push({
                id,
                title,
                status,
                priority: 'P1', // Default, could parse from markdown
                acceptanceCriteria
            });
        }
        return stories;
    }
    /**
     * Parse increment references from markdown content
     */
    parseIncrements(markdown) {
        const increments = [];
        // Look for increment table or list
        // Example: | **0001-core-framework** | ✅ Complete | 2025-10-15 | ...
        const incPattern = /\|\s*\*\*(\d{4}-[\w-]+)\*\*\s*\|\s*([✅❌⏳])?\s*(\w+)\s*\|\s*([0-9-]+)?\s*\|/g;
        const matches = markdown.matchAll(incPattern);
        for (const match of matches) {
            const id = match[1];
            const statusIcon = match[2];
            const statusText = match[3].toLowerCase();
            const completedAt = match[4];
            let status;
            if (statusText.includes('complete') || statusIcon === '✅') {
                status = 'complete';
            }
            else if (statusText.includes('progress') || statusIcon === '⏳') {
                status = 'in-progress';
            }
            else if (statusText.includes('abandon') || statusIcon === '❌') {
                status = 'abandoned';
            }
            else {
                status = 'planned';
            }
            increments.push({
                id,
                status,
                completedAt: completedAt || undefined,
                userStories: [] // Would need more parsing to determine which US each increment implemented
            });
        }
        return increments;
    }
    /**
     * Calculate progress from user stories
     */
    calculateProgress(userStories) {
        if (!userStories || userStories.length === 0) {
            return {
                totalUserStories: 0,
                completedUserStories: 0,
                percentComplete: 0
            };
        }
        const completedUserStories = userStories.filter(us => us.status === 'done').length;
        return {
            totalUserStories: userStories.length,
            completedUserStories,
            percentComplete: Math.round((completedUserStories / userStories.length) * 100)
        };
    }
    /**
     * Create a new spec (template)
     */
    async createSpec(specId, title, priority = 'P1') {
        const filePath = this.getSpecPath(specId);
        if (fs.existsSync(filePath)) {
            throw new Error(`Spec ${specId} already exists`);
        }
        const template = `---
id: ${specId}
title: "${title}"
status: draft
priority: ${priority}
created: ${new Date().toISOString().split('T')[0]}
---

# ${specId.toUpperCase()}: ${title}

**Feature Area**: [Feature Category]
**Status**: Draft
**Priority**: ${priority}

---

## Overview

[High-level description of the feature area]

---

## Increments (Implementation History)

| Increment | Status | Completion | Notes |
|-----------|--------|------------|-------|
| **0001-example** | ⏳ Planned | - | Description |

**Overall Progress**: 0/1 increments complete (0%)

---

## User Stories & Acceptance Criteria

### Epic 1: [Epic Name]

**US-001**: As a [user type], I want [goal] so that [benefit]
- [ ] **AC-001-01**: [Acceptance criteria description]
- [ ] **AC-001-02**: [Acceptance criteria description]

---

## External References

- GitHub Project: TBD
- Jira Epic: TBD
- ADO Feature: TBD
`;
        await fs.writeFile(filePath, template, 'utf-8');
        return filePath;
    }
}
//# sourceMappingURL=spec-metadata-manager.js.map