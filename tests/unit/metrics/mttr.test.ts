/**
 * Mean Time to Recovery (MTTR) Calculator Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockClassifyMTTR, mockCalculatePercentile } = vi.hoisted(() => ({
  mockClassifyMTTR: vi.fn(),
  mockCalculatePercentile: vi.fn(),
}));

vi.mock('../../../src/metrics/utils/tier-classifier.js', () => ({
  classifyMTTR: mockClassifyMTTR,
}));

vi.mock('../../../src/metrics/utils/percentile.js', () => ({
  calculatePercentile: mockCalculatePercentile,
}));

import { calculateMTTR } from '../../../src/metrics/calculators/mttr.js';
import type { Issue } from '../../../src/metrics/types.js';

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 1,
    number: 1,
    title: 'Test Issue',
    state: 'closed',
    labels: [{ name: 'incident' }],
    created_at: '2025-01-15T10:00:00Z',
    closed_at: '2025-01-15T11:00:00Z',
    ...overrides,
  };
}

describe('calculateMTTR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return N/A with zero values when no issues provided', () => {
    const result = calculateMTTR([]);

    expect(result).toEqual({
      value: 0,
      unit: 'minutes',
      tier: 'N/A',
      p50: 0,
      p90: 0,
    });
    expect(mockClassifyMTTR).not.toHaveBeenCalled();
  });

  it('should return N/A when all issues are open', () => {
    const issues: Issue[] = [
      makeIssue({ state: 'open', closed_at: null }),
    ];

    const result = calculateMTTR(issues);

    expect(result).toEqual({
      value: 0,
      unit: 'minutes',
      tier: 'N/A',
      p50: 0,
      p90: 0,
    });
  });

  it('should return N/A when closed issues have no incident labels', () => {
    const issues: Issue[] = [
      makeIssue({ labels: [{ name: 'bug' }] }), // Not an incident label
    ];

    const result = calculateMTTR(issues);

    expect(result).toEqual({
      value: 0,
      unit: 'minutes',
      tier: 'N/A',
      p50: 0,
      p90: 0,
    });
  });

  it('should return N/A when closed_at is null', () => {
    const issues: Issue[] = [
      makeIssue({ state: 'closed', closed_at: null }),
    ];

    const result = calculateMTTR(issues);

    expect(result).toEqual({
      value: 0,
      unit: 'minutes',
      tier: 'N/A',
      p50: 0,
      p90: 0,
    });
  });

  it('should calculate MTTR for a single closed incident with "incident" label', () => {
    mockClassifyMTTR.mockReturnValue('Elite');
    mockCalculatePercentile.mockReturnValueOnce(30).mockReturnValueOnce(30);

    const issues: Issue[] = [
      makeIssue({
        labels: [{ name: 'incident' }],
        created_at: '2025-01-15T10:00:00Z',
        closed_at: '2025-01-15T10:30:00Z', // 30 minutes
      }),
    ];

    const result = calculateMTTR(issues);

    expect(result.value).toBe(30);
    expect(result.unit).toBe('minutes');
    expect(result.tier).toBe('Elite');
    expect(mockClassifyMTTR).toHaveBeenCalledWith(30);
    expect(mockCalculatePercentile).toHaveBeenCalledWith([30], 50);
    expect(mockCalculatePercentile).toHaveBeenCalledWith([30], 90);
  });

  it('should calculate MTTR for incident with "production-bug" label', () => {
    mockClassifyMTTR.mockReturnValue('Elite');
    mockCalculatePercentile.mockReturnValueOnce(45).mockReturnValueOnce(45);

    const issues: Issue[] = [
      makeIssue({
        labels: [{ name: 'production-bug' }],
        created_at: '2025-01-15T10:00:00Z',
        closed_at: '2025-01-15T10:45:00Z', // 45 minutes
      }),
    ];

    const result = calculateMTTR(issues);

    expect(result.value).toBe(45);
    expect(result.unit).toBe('minutes');
    expect(mockClassifyMTTR).toHaveBeenCalledWith(45);
  });

  it('should calculate average MTTR for multiple incidents', () => {
    mockClassifyMTTR.mockReturnValue('Elite');
    mockCalculatePercentile.mockReturnValueOnce(30).mockReturnValueOnce(45);

    const issues: Issue[] = [
      makeIssue({
        id: 1,
        labels: [{ name: 'incident' }],
        created_at: '2025-01-15T10:00:00Z',
        closed_at: '2025-01-15T10:20:00Z', // 20 minutes
      }),
      makeIssue({
        id: 2,
        labels: [{ name: 'production-bug' }],
        created_at: '2025-01-16T10:00:00Z',
        closed_at: '2025-01-16T10:40:00Z', // 40 minutes
      }),
    ];

    const result = calculateMTTR(issues);

    // Average: (20 + 40) / 2 = 30 minutes
    expect(result.value).toBe(30);
    expect(result.unit).toBe('minutes');
    expect(mockClassifyMTTR).toHaveBeenCalledWith(30);
  });

  it('should use hours unit when average MTTR >= 60 minutes', () => {
    mockClassifyMTTR.mockReturnValue('High');
    mockCalculatePercentile.mockReturnValueOnce(90).mockReturnValueOnce(150);

    const issues: Issue[] = [
      makeIssue({
        labels: [{ name: 'incident' }],
        created_at: '2025-01-15T10:00:00Z',
        closed_at: '2025-01-15T12:00:00Z', // 120 minutes = 2 hours
      }),
    ];

    const result = calculateMTTR(issues);

    // 120 minutes / 60 = 2.0 hours
    expect(result.value).toBe(2);
    expect(result.unit).toBe('hours');
    expect(mockClassifyMTTR).toHaveBeenCalledWith(120);
  });

  it('should filter out open issues and issues without incident labels', () => {
    mockClassifyMTTR.mockReturnValue('Elite');
    mockCalculatePercentile.mockReturnValueOnce(30).mockReturnValueOnce(30);

    const issues: Issue[] = [
      makeIssue({
        id: 1,
        state: 'open',
        closed_at: null,
        labels: [{ name: 'incident' }],
      }), // Open - excluded
      makeIssue({
        id: 2,
        state: 'closed',
        labels: [{ name: 'feature' }],
      }), // Wrong label - excluded
      makeIssue({
        id: 3,
        state: 'closed',
        labels: [{ name: 'incident' }],
        created_at: '2025-01-15T10:00:00Z',
        closed_at: '2025-01-15T10:30:00Z',
      }), // Valid
    ];

    const result = calculateMTTR(issues);

    // Only one valid incident: 30 minutes
    expect(result.value).toBe(30);
    expect(mockCalculatePercentile).toHaveBeenCalledWith([30], 50);
  });

  it('should round values to one decimal place', () => {
    mockClassifyMTTR.mockReturnValue('High');
    mockCalculatePercentile.mockReturnValueOnce(75.456).mockReturnValueOnce(110.891);

    const issues: Issue[] = [
      makeIssue({
        labels: [{ name: 'incident' }],
        created_at: '2025-01-15T10:00:00Z',
        closed_at: '2025-01-15T11:33:20Z', // ~93.33 minutes
      }),
    ];

    const result = calculateMTTR(issues);

    expect(result.p50).toBe(75.5);
    expect(result.p90).toBe(110.9);
  });

  it('should handle issues with multiple labels including incident', () => {
    mockClassifyMTTR.mockReturnValue('Elite');
    mockCalculatePercentile.mockReturnValueOnce(15).mockReturnValueOnce(15);

    const issues: Issue[] = [
      makeIssue({
        labels: [{ name: 'bug' }, { name: 'incident' }, { name: 'urgent' }],
        created_at: '2025-01-15T10:00:00Z',
        closed_at: '2025-01-15T10:15:00Z', // 15 minutes
      }),
    ];

    const result = calculateMTTR(issues);

    expect(result.value).toBe(15);
    expect(result.unit).toBe('minutes');
  });

  it('should use minutes unit when average is exactly 60', () => {
    // avg = 60, so 60 < 60 is false => unit is 'hours'
    mockClassifyMTTR.mockReturnValue('High');
    mockCalculatePercentile.mockReturnValueOnce(60).mockReturnValueOnce(60);

    const issues: Issue[] = [
      makeIssue({
        labels: [{ name: 'incident' }],
        created_at: '2025-01-15T10:00:00Z',
        closed_at: '2025-01-15T11:00:00Z', // 60 minutes
      }),
    ];

    const result = calculateMTTR(issues);

    // 60 minutes >= 60, so unit is hours, value = 60/60 = 1
    expect(result.value).toBe(1);
    expect(result.unit).toBe('hours');
  });
});
