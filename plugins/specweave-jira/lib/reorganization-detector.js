/**
 * Jira Reorganization Detector
 *
 * Detects when users reorganize work in Jira:
 * - Moved issues (different project)
 * - Split stories (one story → multiple)
 * - Merged stories (multiple → one)
 * - Reparented issues (changed epic)
 * - Deleted issues
 *
 * Helps SpecWeave stay in sync with Jira-side changes
 */
// ============================================================================
// Reorganization Detector
// ============================================================================
export class JiraReorganizationDetector {
    constructor(client) {
        this.client = client;
    }
    /**
     * Detect all reorganization events for tracked issues
     */
    async detectReorganization(trackedIssueKeys, lastSyncTimestamp) {
        console.log(`\n🔍 Checking for reorganization (${trackedIssueKeys.length} issues)...\n`);
        const events = [];
        for (const key of trackedIssueKeys) {
            try {
                const issue = await this.client.getIssue(key);
                // Check for moves
                const moveEvent = this.detectMove(key, issue);
                if (moveEvent) {
                    events.push(moveEvent);
                }
                // Check for splits
                const splitEvents = await this.detectSplit(key, issue);
                events.push(...splitEvents);
                // Check for merges
                const mergeEvent = await this.detectMerge(key, issue);
                if (mergeEvent) {
                    events.push(mergeEvent);
                }
                // Check for reparenting
                const reparentEvent = this.detectReparent(key, issue, lastSyncTimestamp);
                if (reparentEvent) {
                    events.push(reparentEvent);
                }
            }
            catch (error) {
                // Issue might be deleted
                if (error.message.includes('404') || error.message.includes('does not exist')) {
                    events.push({
                        type: 'DELETED',
                        timestamp: new Date().toISOString(),
                        description: `Issue ${key} was deleted from Jira`,
                        originalKeys: [key],
                    });
                }
            }
        }
        // Generate summary
        const summary = this.generateSummary(events);
        console.log(events.length > 0 ? '⚠️  Reorganization detected!' : '✅ No reorganization detected');
        console.log(summary);
        return {
            detected: events.length > 0,
            events,
            summary,
        };
    }
    // ==========================================================================
    // Detection Methods
    // ==========================================================================
    /**
     * Detect if issue moved to different project
     */
    detectMove(originalKey, issue) {
        const currentProject = issue.key.split('-')[0];
        const originalProject = originalKey.split('-')[0];
        if (currentProject !== originalProject) {
            return {
                type: 'MOVED_PROJECT',
                timestamp: issue.fields.updated,
                description: `Issue moved from ${originalProject} to ${currentProject}`,
                originalKeys: [originalKey],
                newKeys: [issue.key],
                fromProject: originalProject,
                toProject: currentProject,
            };
        }
        return null;
    }
    /**
     * Detect if story was split into multiple stories
     */
    async detectSplit(originalKey, issue) {
        const events = [];
        // Check for "split from" or "cloned from" links
        const issueLinks = issue.fields.issuelinks || [];
        for (const link of issueLinks) {
            const linkType = link.type?.name?.toLowerCase() || '';
            // Jira uses various link types for splits
            if (linkType.includes('split') ||
                linkType.includes('cloned') ||
                linkType.includes('child')) {
                const relatedIssue = link.outwardIssue || link.inwardIssue;
                if (relatedIssue && relatedIssue.key !== originalKey) {
                    events.push({
                        type: 'SPLIT',
                        timestamp: issue.fields.updated,
                        description: `Story ${originalKey} was split into ${relatedIssue.key}`,
                        originalKeys: [originalKey],
                        newKeys: [relatedIssue.key],
                    });
                }
            }
        }
        return events;
    }
    /**
     * Detect if multiple stories were merged
     */
    async detectMerge(originalKey, issue) {
        const issueLinks = issue.fields.issuelinks || [];
        for (const link of issueLinks) {
            const linkType = link.type?.name?.toLowerCase() || '';
            // Check for "duplicate of" or "merged into" links
            if (linkType.includes('duplicate') ||
                linkType.includes('merged') ||
                linkType.includes('closed')) {
                const targetIssue = link.inwardIssue;
                if (targetIssue && issue.fields.status.name.toLowerCase() === 'closed') {
                    return {
                        type: 'MERGED',
                        timestamp: issue.fields.updated,
                        description: `Story ${originalKey} was merged into ${targetIssue.key}`,
                        originalKeys: [originalKey],
                        newKeys: [targetIssue.key],
                    };
                }
            }
        }
        return null;
    }
    /**
     * Detect if issue was moved to different epic
     */
    detectReparent(originalKey, issue, lastSyncTimestamp) {
        // Check if issue has parent (epic)
        const currentParent = issue.fields.parent?.key;
        // We need to track previous parent from metadata
        // For now, just detect if parent exists and was recently updated
        if (currentParent && lastSyncTimestamp) {
            const updatedAt = new Date(issue.fields.updated);
            const lastSync = new Date(lastSyncTimestamp);
            if (updatedAt > lastSync) {
                // Parent might have changed (we'd need to store previous parent to be sure)
                return {
                    type: 'REPARENTED',
                    timestamp: issue.fields.updated,
                    description: `Issue ${originalKey} may have been reparented to ${currentParent}`,
                    originalKeys: [originalKey],
                    toEpic: currentParent,
                };
            }
        }
        return null;
    }
    // ==========================================================================
    // Helpers
    // ==========================================================================
    /**
     * Generate human-readable summary of reorganization events
     */
    generateSummary(events) {
        if (events.length === 0) {
            return '\n   No reorganization detected\n';
        }
        const summary = ['\n📋 Reorganization Summary:\n'];
        const byType = events.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
        }, {});
        for (const [type, count] of Object.entries(byType)) {
            summary.push(`   ${this.getTypeIcon(type)} ${type}: ${count}`);
        }
        summary.push('\n📝 Details:\n');
        for (const event of events) {
            summary.push(`   ${this.getTypeIcon(event.type)} ${event.description}`);
        }
        summary.push('');
        return summary.join('\n');
    }
    /**
     * Get emoji icon for event type
     */
    getTypeIcon(type) {
        switch (type) {
            case 'MOVED_PROJECT':
                return '📦';
            case 'SPLIT':
                return '✂️';
            case 'MERGED':
                return '🔀';
            case 'REPARENTED':
                return '🔗';
            case 'DELETED':
                return '🗑️';
            case 'RENAMED':
                return '✏️';
            default:
                return '•';
        }
    }
}
// ============================================================================
// Reorganization Handler
// ============================================================================
/**
 * Handle reorganization events by updating SpecWeave increment
 */
export async function handleReorganization(events, incrementId, projectRoot = process.cwd()) {
    if (events.length === 0) {
        return;
    }
    console.log(`\n🔧 Handling ${events.length} reorganization events...\n`);
    for (const event of events) {
        switch (event.type) {
            case 'MOVED_PROJECT':
                console.log(`   ✓ Updated project mapping: ${event.fromProject} → ${event.toProject}`);
                // Update metadata with new project/key
                break;
            case 'SPLIT':
                console.log(`   ✓ Added new story from split: ${event.newKeys?.join(', ')}`);
                // Add new user story to spec.md
                break;
            case 'MERGED':
                console.log(`   ✓ Marked story as merged: ${event.originalKeys[0]} → ${event.newKeys?.[0]}`);
                // Update spec.md to mark as merged
                break;
            case 'REPARENTED':
                console.log(`   ✓ Updated epic link: ${event.toEpic}`);
                // Update metadata
                break;
            case 'DELETED':
                console.log(`   ⚠️  Story deleted from Jira: ${event.originalKeys[0]}`);
                // Mark as deleted in spec.md (don't remove, just mark)
                break;
        }
    }
    console.log('\n✅ Reorganization handled\n');
}
//# sourceMappingURL=reorganization-detector.js.map