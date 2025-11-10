/**
 * Parser for tasks.md files
 * Extracts task information for GitHub sync
 */
import { Task } from './types';
export declare class TaskParser {
    /**
     * Parse tasks.md file and extract all tasks
     */
    static parseTasksFile(incrementPath: string): Task[];
    /**
     * Parse task content into structured Task objects
     */
    static parseTasks(content: string): Task[];
    /**
     * Parse individual task section
     */
    private static parseTask;
    private static extractPriority;
    private static extractEstimate;
    private static extractStatus;
    private static extractDescription;
    private static extractGitHubIssue;
    private static extractAssignee;
    private static extractSubtasks;
    private static extractFiles;
    private static extractImplementation;
    private static extractAcceptanceCriteria;
    private static extractDependencies;
    private static extractBlocks;
    private static extractPhase;
    /**
     * Update tasks.md file with GitHub issue numbers
     */
    static updateTasksWithGitHubIssues(incrementPath: string, taskIssueMap: Record<string, number>): void;
}
//# sourceMappingURL=task-parser.d.ts.map