/**
 * Human Gate Module
 *
 * Detects and handles operations that require human approval.
 * Features:
 * - Pattern matching for sensitive operations
 * - Approval request flow
 * - Timeout handling
 * - Never-auto-approve rules
 */

import * as fs from 'fs';
import * as path from 'path';

export interface HumanGateConfig {
  /** Patterns that trigger human gates */
  patterns: string[];
  /** Timeout in seconds for approval (default: 1800 = 30 min) */
  timeout: number;
  /** Patterns that can NEVER be auto-approved */
  neverAutoApprove: string[];
  /** Pre-approved patterns (from --skip-gates) */
  preApproved: string[];
}

export interface GateRequest {
  id: string;
  operation: string;
  pattern: string;
  context: string;
  requestedAt: string;
  timeout: number;
  expiresAt: string;
}

export interface GateResponse {
  id: string;
  approved: boolean;
  respondedAt: string;
  respondedBy: 'user' | 'timeout' | 'pre-approved';
  reason?: string;
}

export interface DetectionResult {
  triggered: boolean;
  pattern: string | null;
  operation: string | null;
  isNeverAutoApprove: boolean;
  isPreApproved: boolean;
}

const DEFAULT_CONFIG: HumanGateConfig = {
  patterns: [
    'deploy',
    'migrate',
    'publish',
    'push --force',
    'rm -rf',
    'drop table',
    'delete from',
    'npm publish',
    'git push.*--force',
    'kubectl apply.*prod',
    'terraform apply',
    'production',
    'api.+key',
    'secret',
    'password',
    'credential',
  ],
  timeout: 1800, // 30 minutes
  neverAutoApprove: [
    'push --force',
    'rm -rf /',
    'rm -rf ~',
    'drop database',
    'format c:',
    'production deploy',
    'npm publish',
  ],
  preApproved: [],
};

export class HumanGateDetector {
  private config: HumanGateConfig;
  private projectRoot: string;
  private pendingGates: Map<string, GateRequest> = new Map();

  constructor(projectRoot: string, config: Partial<HumanGateConfig> = {}) {
    this.projectRoot = projectRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect if content contains a gated operation
   */
  detectGate(content: string): DetectionResult {
    const lowerContent = content.toLowerCase();

    for (const pattern of this.config.patterns) {
      const regex = new RegExp(pattern.toLowerCase(), 'i');
      if (regex.test(lowerContent)) {
        // Check if never-auto-approve
        const isNeverAutoApprove = this.config.neverAutoApprove.some(
          (nap) => lowerContent.includes(nap.toLowerCase())
        );

        // Check if pre-approved
        const isPreApproved = this.config.preApproved.some(
          (pa) => pattern.toLowerCase().includes(pa.toLowerCase())
        );

        // Extract the operation context
        const operation = this.extractOperation(content, pattern);

        return {
          triggered: true,
          pattern,
          operation,
          isNeverAutoApprove,
          isPreApproved,
        };
      }
    }

    return {
      triggered: false,
      pattern: null,
      operation: null,
      isNeverAutoApprove: false,
      isPreApproved: false,
    };
  }

  /**
   * Extract operation context from content
   */
  private extractOperation(content: string, pattern: string): string {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes(pattern.toLowerCase())) {
        return line.trim().substring(0, 200); // Limit length
      }
    }
    return pattern;
  }

  /**
   * Create a gate request
   */
  createRequest(operation: string, pattern: string, context: string): GateRequest {
    const id = `gate-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.timeout * 1000);

    const request: GateRequest = {
      id,
      operation,
      pattern,
      context,
      requestedAt: now.toISOString(),
      timeout: this.config.timeout,
      expiresAt: expiresAt.toISOString(),
    };

    this.pendingGates.set(id, request);
    this.savePendingGate(request);

    return request;
  }

  /**
   * Save pending gate to session state
   */
  private savePendingGate(request: GateRequest): void {
    const sessionPath = path.join(this.projectRoot, '.specweave', 'state', 'auto-session.json');

    if (!fs.existsSync(sessionPath)) return;

    try {
      const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      session.humanGates = session.humanGates || { pending: null, approved: [], blocked: [] };
      session.humanGates.pending = request;
      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Check if a gate request is approved
   */
  checkApproval(gateId: string): GateResponse | null {
    const request = this.pendingGates.get(gateId);
    if (!request) {
      // Check if already resolved in session
      return this.loadApprovalFromSession(gateId);
    }

    // Check timeout
    if (new Date() > new Date(request.expiresAt)) {
      const response: GateResponse = {
        id: gateId,
        approved: false,
        respondedAt: new Date().toISOString(),
        respondedBy: 'timeout',
        reason: 'Approval request timed out',
      };
      this.resolveGate(gateId, response);
      return response;
    }

    // Check if pre-approved
    if (this.config.preApproved.some((pa) => request.pattern.includes(pa))) {
      const response: GateResponse = {
        id: gateId,
        approved: true,
        respondedAt: new Date().toISOString(),
        respondedBy: 'pre-approved',
      };
      this.resolveGate(gateId, response);
      return response;
    }

    return null; // Still pending
  }

  /**
   * Load approval from session file
   */
  private loadApprovalFromSession(gateId: string): GateResponse | null {
    const sessionPath = path.join(this.projectRoot, '.specweave', 'state', 'auto-session.json');

    if (!fs.existsSync(sessionPath)) return null;

    try {
      const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      if (session.humanGates?.approved?.includes(gateId)) {
        return {
          id: gateId,
          approved: true,
          respondedAt: new Date().toISOString(),
          respondedBy: 'user',
        };
      }
      if (session.humanGates?.blocked?.includes(gateId)) {
        return {
          id: gateId,
          approved: false,
          respondedAt: new Date().toISOString(),
          respondedBy: 'user',
        };
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  /**
   * Approve a gate (called by user action)
   */
  approveGate(gateId: string): GateResponse {
    const response: GateResponse = {
      id: gateId,
      approved: true,
      respondedAt: new Date().toISOString(),
      respondedBy: 'user',
    };
    this.resolveGate(gateId, response);
    return response;
  }

  /**
   * Deny a gate (called by user action)
   */
  denyGate(gateId: string, reason?: string): GateResponse {
    const response: GateResponse = {
      id: gateId,
      approved: false,
      respondedAt: new Date().toISOString(),
      respondedBy: 'user',
      reason,
    };
    this.resolveGate(gateId, response);
    return response;
  }

  /**
   * Resolve a gate (move from pending to approved/blocked)
   */
  private resolveGate(gateId: string, response: GateResponse): void {
    this.pendingGates.delete(gateId);

    const sessionPath = path.join(this.projectRoot, '.specweave', 'state', 'auto-session.json');

    if (!fs.existsSync(sessionPath)) return;

    try {
      const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      session.humanGates = session.humanGates || { pending: null, approved: [], blocked: [] };
      session.humanGates.pending = null;

      if (response.approved) {
        session.humanGates.approved = session.humanGates.approved || [];
        session.humanGates.approved.push(gateId);
      } else {
        session.humanGates.blocked = session.humanGates.blocked || [];
        session.humanGates.blocked.push(gateId);
      }

      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Get pending gate (if any)
   */
  getPendingGate(): GateRequest | null {
    const sessionPath = path.join(this.projectRoot, '.specweave', 'state', 'auto-session.json');

    if (!fs.existsSync(sessionPath)) return null;

    try {
      const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      return session.humanGates?.pending || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if operation is in never-auto-approve list
   */
  isNeverAutoApprove(operation: string): boolean {
    const lowerOp = operation.toLowerCase();
    return this.config.neverAutoApprove.some((nap) => lowerOp.includes(nap.toLowerCase()));
  }

  /**
   * Add pattern to pre-approved list
   */
  addPreApproved(pattern: string): void {
    if (!this.config.preApproved.includes(pattern)) {
      this.config.preApproved.push(pattern);
    }
  }

  /**
   * Format gate request for display
   */
  formatRequest(request: GateRequest): string {
    const lines: string[] = [];
    lines.push('🚨 HUMAN GATE TRIGGERED');
    lines.push('');
    lines.push(`Operation: ${request.operation}`);
    lines.push(`Pattern: ${request.pattern}`);
    lines.push(`Requested: ${request.requestedAt}`);
    lines.push(`Expires: ${request.expiresAt}`);
    lines.push('');
    lines.push('To approve: /sw:approve-gate');
    lines.push('To deny: /sw:deny-gate');
    return lines.join('\n');
  }
}
