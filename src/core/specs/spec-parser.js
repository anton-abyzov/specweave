/**
 * Spec Parser
 *
 * Advanced parsing utilities for spec.md files
 * Extracts user stories, acceptance criteria, increments, etc.
 *
 * @module spec-parser
 */
import matter from 'gray-matter';
export class SpecParser {
    /**
     * Parse complete user story including acceptance criteria
     */
    static parseUserStory(markdown, usId) {
        // Pattern: **US-001**: As a X, I want Y so that Z
        const usPattern = new RegExp(`\\*\\*${usId}\\*\\*:\\s*(.+?)(?=\\n|$)`, 'g');
        const match = usPattern.exec(markdown);
        if (!match) {
            return null;
        }
        const title = match[1].trim();
        const acceptanceCriteria = this.parseAcceptanceCriteria(markdown, usId);
        // Determine status from AC completion
        let status = 'todo';
        if (acceptanceCriteria.length > 0) {
            const completedCount = acceptanceCriteria.filter(ac => ac.status === 'done').length;
            if (completedCount === acceptanceCriteria.length) {
                status = 'done';
            }
            else if (completedCount > 0) {
                status = 'in-progress';
            }
        }
        // Try to extract priority (look for P1, P2, P3 markers)
        let priority = 'P1';
        const priorityMatch = markdown.match(new RegExp(`${usId}[\\s\\S]{0,200}?\\(P([123])\\)`));
        if (priorityMatch) {
            priority = `P${priorityMatch[1]}`;
        }
        return {
            id: usId,
            title,
            status,
            priority,
            acceptanceCriteria
        };
    }
    /**
     * Parse all user stories from markdown
     */
    static parseAllUserStories(markdown) {
        const stories = [];
        // Find all US-XXX patterns
        const usPattern = /\*\*US-(\d+)\*\*:/g;
        const matches = markdown.matchAll(usPattern);
        const processedIds = new Set();
        for (const match of matches) {
            const usId = `US-${match[1]}`;
            if (processedIds.has(usId)) {
                continue; // Skip duplicates
            }
            processedIds.add(usId);
            const story = this.parseUserStory(markdown, usId);
            if (story) {
                stories.push(story);
            }
        }
        return stories;
    }
    /**
     * Parse acceptance criteria for a user story
     */
    static parseAcceptanceCriteria(markdown, usId) {
        const criteria = [];
        // Extract the number from US-001 → 001
        const usNumber = usId.replace('US-', '');
        // Pattern: - [ ] **AC-001-01**: Description
        // or: - [x] **AC-001-01**: Description
        const acPattern = new RegExp(`- \\[([x ])\\] \\*\\*AC-${usNumber}-(\\d+)\\*\\*:\\s*(.+?)(?=\\n|$)`, 'g');
        const matches = markdown.matchAll(acPattern);
        for (const match of matches) {
            const isDone = match[1] === 'x';
            const acNumber = match[2];
            const description = match[3].trim();
            // Try to extract priority and testability markers
            // Example: (P1, testable)
            const metaMatch = description.match(/\(([^)]+)\)/);
            let priority;
            let testable;
            if (metaMatch) {
                const meta = metaMatch[1];
                if (meta.includes('P1'))
                    priority = 'P1';
                if (meta.includes('P2'))
                    priority = 'P2';
                if (meta.includes('P3'))
                    priority = 'P3';
                if (meta.includes('testable'))
                    testable = true;
                if (meta.includes('not testable'))
                    testable = false;
            }
            // Remove metadata from description
            const cleanDescription = description.replace(/\s*\([^)]+\)\s*$/, '').trim();
            criteria.push({
                id: `AC-${usNumber}-${acNumber}`,
                description: cleanDescription,
                status: isDone ? 'done' : 'todo',
                priority,
                testable
            });
        }
        return criteria;
    }
    /**
     * Parse increment references from markdown
     */
    static parseIncrementReferences(markdown) {
        const increments = [];
        // Look for increment table
        // Example: | **0001-core-framework** | ✅ Complete | 2025-10-15 | Initial CLI |
        const tablePattern = /\|\s*\*\*(\d{4}-[\w-]+)\*\*\s*\|\s*([✅❌⏳])?\s*(\w+)\s*\|\s*([0-9-]+)?\s*\|\s*(.+?)\s*\|/g;
        const matches = markdown.matchAll(tablePattern);
        for (const match of matches) {
            const id = match[1];
            const statusIcon = match[2];
            const statusText = match[3].toLowerCase();
            const completedAt = match[4] || undefined;
            const notes = match[5]?.trim() || undefined;
            let status;
            if (statusText.includes('complete') || statusIcon === '✅') {
                status = 'complete';
            }
            else if (statusText.includes('progress') || statusText.includes('active') || statusIcon === '⏳') {
                status = 'in-progress';
            }
            else if (statusText.includes('abandon') || statusText.includes('cancel') || statusIcon === '❌') {
                status = 'abandoned';
            }
            else {
                status = 'planned';
            }
            // Try to extract which user stories this increment implemented
            // Look for patterns like "Implements: US-001, US-002"
            const userStories = [];
            const usRefPattern = /US-\d+/g;
            const usMatches = notes?.matchAll(usRefPattern);
            if (usMatches) {
                for (const usMatch of usMatches) {
                    userStories.push(usMatch[0]);
                }
            }
            increments.push({
                id,
                status,
                completedAt,
                userStories,
                notes
            });
        }
        return increments;
    }
    /**
     * Extract frontmatter from markdown
     */
    static extractFrontmatter(markdown) {
        try {
            const parsed = matter(markdown);
            return parsed.data;
        }
        catch (error) {
            console.error('Error parsing frontmatter:', error);
            return {};
        }
    }
    /**
     * Extract overview section
     */
    static extractOverview(markdown) {
        const overviewMatch = markdown.match(/##\s+Overview\s+([\s\S]*?)(?=\n##\s+|\n---\s+|$)/);
        return overviewMatch ? overviewMatch[1].trim() : '';
    }
    /**
     * Extract external references section
     */
    static extractExternalReferences(markdown) {
        const refs = {};
        // Look for external references section
        const extRefSection = markdown.match(/##\s+External References\s+([\s\S]*?)(?=\n##\s+|\n---\s+|$)/);
        if (extRefSection) {
            const content = extRefSection[1];
            // GitHub Project: URL or ID
            const githubMatch = content.match(/GitHub Project:\s*(.+)/);
            if (githubMatch) {
                refs.github = githubMatch[1].trim();
            }
            // Jira Epic: URL or Key
            const jiraMatch = content.match(/Jira Epic:\s*(.+)/);
            if (jiraMatch) {
                refs.jira = jiraMatch[1].trim();
            }
            // ADO Feature: URL or ID
            const adoMatch = content.match(/(?:ADO|Azure DevOps) Feature:\s*(.+)/);
            if (adoMatch) {
                refs.ado = adoMatch[1].trim();
            }
        }
        return refs;
    }
    /**
     * Calculate overall progress
     */
    static calculateProgress(userStories) {
        if (!userStories || userStories.length === 0) {
            return {
                totalUserStories: 0,
                completedUserStories: 0,
                inProgressUserStories: 0,
                todoUserStories: 0,
                percentComplete: 0
            };
        }
        const completed = userStories.filter(us => us.status === 'done').length;
        const inProgress = userStories.filter(us => us.status === 'in-progress').length;
        const todo = userStories.filter(us => us.status === 'todo').length;
        return {
            totalUserStories: userStories.length,
            completedUserStories: completed,
            inProgressUserStories: inProgress,
            todoUserStories: todo,
            percentComplete: Math.round((completed / userStories.length) * 100)
        };
    }
    /**
     * Find user stories by status
     */
    static filterUserStories(userStories, status, priority) {
        let filtered = userStories;
        if (status) {
            filtered = filtered.filter(us => us.status === status);
        }
        if (priority) {
            filtered = filtered.filter(us => us.priority === priority);
        }
        return filtered;
    }
    /**
     * Find user story by ID
     */
    static findUserStory(userStories, usId) {
        return userStories.find(us => us.id === usId);
    }
    /**
     * Update user story status in markdown
     */
    static updateUserStoryStatus(markdown, usId, newStatus) {
        // This is a simple implementation - in reality we'd update all AC checkboxes
        // For 'done', check all boxes for this US
        // For 'in-progress', check some boxes
        // For 'todo', uncheck all boxes
        if (newStatus === 'done') {
            // Find all AC for this US and check them
            const usNumber = usId.replace('US-', '');
            const acPattern = new RegExp(`- \\[ \\] \\*\\*AC-${usNumber}-(\\d+)\\*\\*:`, 'g');
            return markdown.replace(acPattern, `- [x] **AC-${usNumber}-$1**:`);
        }
        else if (newStatus === 'todo') {
            // Uncheck all AC for this US
            const usNumber = usId.replace('US-', '');
            const acPattern = new RegExp(`- \\[x\\] \\*\\*AC-${usNumber}-(\\d+)\\*\\*:`, 'g');
            return markdown.replace(acPattern, `- [ ] **AC-${usNumber}-$1**:`);
        }
        return markdown; // in-progress doesn't change markdown directly
    }
}
//# sourceMappingURL=spec-parser.js.map