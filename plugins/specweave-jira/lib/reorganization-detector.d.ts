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
import { JiraClient } from '../../../src/integrations/jira/jira-client.js';
export type ReorganizationType = 'MOVED_PROJECT' | 'SPLIT' | 'MERGED' | 'REPARENTED' | 'DELETED' | 'RENAMED';
export interface ReorganizationEvent {
    type: ReorganizationType;
    timestamp: string;
    description: string;
    originalKeys: string[];
    newKeys?: string[];
    fromProject?: string;
    toProject?: string;
    fromEpic?: string;
    toEpic?: string;
}
export interface ReorganizationDetectionResult {
    detected: boolean;
    events: ReorganizationEvent[];
    summary: string;
}
export declare class JiraReorganizationDetector {
    private client;
    constructor(client: JiraClient);
    /**
     * Detect all reorganization events for tracked issues
     */
    detectReorganization(trackedIssueKeys: string[], lastSyncTimestamp?: string): Promise<ReorganizationDetectionResult>;
    /**
     * Detect if issue moved to different project
     */
    private detectMove;
    /**
     * Detect if story was split into multiple stories
     */
    private detectSplit;
    /**
     * Detect if multiple stories were merged
     */
    private detectMerge;
    /**
     * Detect if issue was moved to different epic
     */
    private detectReparent;
    /**
     * Generate human-readable summary of reorganization events
     */
    private generateSummary;
    /**
     * Get emoji icon for event type
     */
    private getTypeIcon;
}
/**
 * Handle reorganization events by updating SpecWeave increment
 */
export declare function handleReorganization(events: ReorganizationEvent[], incrementId: string, projectRoot?: string): Promise<void>;
//# sourceMappingURL=reorganization-detector.d.ts.map