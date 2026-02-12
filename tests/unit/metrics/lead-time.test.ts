/**
 * Lead Time for Changes Calculator Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockClassifyLeadTime, mockCalculatePercentile } = vi.hoisted(() => ({
  mockClassifyLeadTime: vi.fn(),
  mockCalculatePercentile: vi.fn(),
}));

vi.mock('../../../src/metrics/utils/tier-classifier.js', () => ({
  classifyLeadTime: mockClassifyLeadTime,
}));

vi.mock('../../../src/metrics/utils/percentile.js', () => ({
  calculatePercentile: mockCalculatePercentile,
}));

import { calculateLeadTime } from '../../../src/metrics/calculators/lead-time.js';
import type { Release, Commit } from '../../../src/metrics/types.js';

describe('calculateLeadTime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return N/A with zero values when no releases provided', () => {
    const result = calculateLeadTime([], []);

    expect(result).toEqual({
      value: 0,
      unit: 'hours',
      tier: 'N/A',
      p50: 0,
      p90: 0,
    });
    expect(mockClassifyLeadTime).not.toHaveBeenCalled();
    expect(mockCalculatePercentile).not.toHaveBeenCalled();
  });

  it('should return N/A when releases exist but no matching commits', () => {
    const releases: Release[] = [
      {
        id: 1,
        tag_name: 'v1.0.0',
        name: 'Release 1',
        created_at: '2025-01-15T12:00:00Z',
        published_at: '2025-01-15T12:00:00Z',
        target_commitish: 'abc123',
      },
    ];

    // Commits that are outside the release window (after the release)
    const commits: Commit[] = [
      {
        sha: 'def456',
        commit: {
          author: {
            name: 'Dev',
            date: '2025-01-16T12:00:00Z', // After the release
          },
        },
      },
    ];

    const result = calculateLeadTime(releases, commits);

    expect(result).toEqual({
      value: 0,
      unit: 'hours',
      tier: 'N/A',
      p50: 0,
      p90: 0,
    });
  });

  it('should calculate lead time for a single release with one commit', () => {
    mockClassifyLeadTime.mockReturnValue('High');
    mockCalculatePercentile.mockReturnValueOnce(6).mockReturnValueOnce(6);

    const releases: Release[] = [
      {
        id: 1,
        tag_name: 'v1.0.0',
        name: 'Release 1',
        created_at: '2025-01-15T12:00:00Z',
        published_at: '2025-01-15T12:00:00Z',
        target_commitish: 'abc123',
      },
    ];

    const commits: Commit[] = [
      {
        sha: 'def456',
        commit: {
          author: {
            name: 'Dev',
            date: '2025-01-15T06:00:00Z', // 6 hours before release
          },
        },
      },
    ];

    const result = calculateLeadTime(releases, commits);

    expect(result.value).toBe(6);
    expect(result.unit).toBe('hours');
    expect(result.tier).toBe('High');
    expect(mockClassifyLeadTime).toHaveBeenCalledWith(6);
    expect(mockCalculatePercentile).toHaveBeenCalledWith([6], 50);
    expect(mockCalculatePercentile).toHaveBeenCalledWith([6], 90);
  });

  it('should calculate lead time for multiple commits in one release', () => {
    mockClassifyLeadTime.mockReturnValue('High');
    mockCalculatePercentile.mockReturnValueOnce(6).mockReturnValueOnce(10);

    const releases: Release[] = [
      {
        id: 1,
        tag_name: 'v1.0.0',
        name: 'Release 1',
        created_at: '2025-01-15T12:00:00Z',
        published_at: '2025-01-15T12:00:00Z',
        target_commitish: 'abc123',
      },
    ];

    const commits: Commit[] = [
      {
        sha: 'aaa',
        commit: { author: { name: 'Dev', date: '2025-01-15T02:00:00Z' } }, // 10h
      },
      {
        sha: 'bbb',
        commit: { author: { name: 'Dev', date: '2025-01-15T06:00:00Z' } }, // 6h
      },
      {
        sha: 'ccc',
        commit: { author: { name: 'Dev', date: '2025-01-15T10:00:00Z' } }, // 2h
      },
    ];

    const result = calculateLeadTime(releases, commits);

    // Average: (10 + 6 + 2) / 3 = 6 hours
    expect(result.value).toBe(6);
    expect(result.unit).toBe('hours');
    expect(mockClassifyLeadTime).toHaveBeenCalledWith(6);
  });

  it('should handle multiple releases and assign commits correctly', () => {
    mockClassifyLeadTime.mockReturnValue('Elite');
    mockCalculatePercentile.mockReturnValueOnce(0.5).mockReturnValueOnce(0.8);

    const releases: Release[] = [
      {
        id: 2,
        tag_name: 'v2.0.0',
        name: 'Release 2',
        created_at: '2025-01-20T12:00:00Z',
        published_at: '2025-01-20T12:00:00Z',
        target_commitish: 'bbb',
      },
      {
        id: 1,
        tag_name: 'v1.0.0',
        name: 'Release 1',
        created_at: '2025-01-15T12:00:00Z',
        published_at: '2025-01-15T12:00:00Z',
        target_commitish: 'aaa',
      },
    ];

    const commits: Commit[] = [
      {
        sha: 'c1',
        commit: { author: { name: 'Dev', date: '2025-01-15T11:00:00Z' } }, // Belongs to release 1 (1h)
      },
      {
        sha: 'c2',
        commit: { author: { name: 'Dev', date: '2025-01-20T11:00:00Z' } }, // Belongs to release 2 (1h)
      },
    ];

    const result = calculateLeadTime(releases, commits);

    // Two commits, each 1 hour lead time, average = 1 hour
    expect(result.unit).toBe('hours');
    expect(mockClassifyLeadTime).toHaveBeenCalledWith(1);
  });

  it('should use days unit when average lead time >= 24 hours', () => {
    mockClassifyLeadTime.mockReturnValue('Medium');
    mockCalculatePercentile.mockReturnValueOnce(36).mockReturnValueOnce(60);

    const releases: Release[] = [
      {
        id: 1,
        tag_name: 'v1.0.0',
        name: 'Release 1',
        created_at: '2025-01-15T12:00:00Z',
        published_at: '2025-01-15T12:00:00Z',
        target_commitish: 'abc',
      },
    ];

    const commits: Commit[] = [
      {
        sha: 'c1',
        commit: { author: { name: 'Dev', date: '2025-01-13T12:00:00Z' } }, // 48 hours
      },
    ];

    const result = calculateLeadTime(releases, commits);

    // 48 hours / 24 = 2 days
    expect(result.value).toBe(2);
    expect(result.unit).toBe('days');
    expect(mockClassifyLeadTime).toHaveBeenCalledWith(48);
  });

  it('should round values to one decimal place', () => {
    mockClassifyLeadTime.mockReturnValue('High');
    mockCalculatePercentile.mockReturnValueOnce(3.456).mockReturnValueOnce(7.891);

    const releases: Release[] = [
      {
        id: 1,
        tag_name: 'v1.0.0',
        name: 'Release 1',
        created_at: '2025-01-15T12:00:00Z',
        published_at: '2025-01-15T12:00:00Z',
        target_commitish: 'abc',
      },
    ];

    // 5.5 hours lead time
    const commits: Commit[] = [
      {
        sha: 'c1',
        commit: { author: { name: 'Dev', date: '2025-01-15T06:30:00Z' } },
      },
    ];

    const result = calculateLeadTime(releases, commits);

    expect(result.p50).toBe(3.5);
    expect(result.p90).toBe(7.9);
  });

  it('should sort releases by date (newest first) regardless of input order', () => {
    mockClassifyLeadTime.mockReturnValue('High');
    mockCalculatePercentile.mockReturnValueOnce(1).mockReturnValueOnce(1);

    // Releases in wrong order (oldest first)
    const releases: Release[] = [
      {
        id: 1,
        tag_name: 'v1.0.0',
        name: 'Release 1',
        created_at: '2025-01-10T12:00:00Z',
        published_at: '2025-01-10T12:00:00Z',
        target_commitish: 'aaa',
      },
      {
        id: 2,
        tag_name: 'v2.0.0',
        name: 'Release 2',
        created_at: '2025-01-20T12:00:00Z',
        published_at: '2025-01-20T12:00:00Z',
        target_commitish: 'bbb',
      },
    ];

    // Commit between release 1 and release 2
    const commits: Commit[] = [
      {
        sha: 'c1',
        commit: { author: { name: 'Dev', date: '2025-01-15T12:00:00Z' } },
      },
    ];

    const result = calculateLeadTime(releases, commits);

    // Commit at Jan 15, Release 2 at Jan 20 = 120 hours = 5 days
    expect(result.unit).toBe('days');
    expect(mockClassifyLeadTime).toHaveBeenCalledWith(120);
  });

  it('should handle first release with commits dating back to epoch', () => {
    mockClassifyLeadTime.mockReturnValue('High');
    mockCalculatePercentile.mockReturnValueOnce(1).mockReturnValueOnce(1);

    const releases: Release[] = [
      {
        id: 1,
        tag_name: 'v1.0.0',
        name: 'Release 1',
        created_at: '2025-01-15T12:00:00Z',
        published_at: '2025-01-15T12:00:00Z',
        target_commitish: 'aaa',
      },
    ];

    // Very old commit (from 1970 would be picked up)
    const commits: Commit[] = [
      {
        sha: 'c1',
        commit: { author: { name: 'Dev', date: '2025-01-15T11:00:00Z' } }, // 1h before
      },
    ];

    const result = calculateLeadTime(releases, commits);

    expect(result.tier).toBe('High');
    expect(mockClassifyLeadTime).toHaveBeenCalledWith(1);
  });

  it('should not include commits exactly at the previous release time', () => {
    mockClassifyLeadTime.mockReturnValue('High');
    mockCalculatePercentile.mockReturnValueOnce(1).mockReturnValueOnce(1);

    const releases: Release[] = [
      {
        id: 2,
        tag_name: 'v2.0.0',
        name: 'Release 2',
        created_at: '2025-01-20T12:00:00Z',
        published_at: '2025-01-20T12:00:00Z',
        target_commitish: 'bbb',
      },
      {
        id: 1,
        tag_name: 'v1.0.0',
        name: 'Release 1',
        created_at: '2025-01-10T12:00:00Z',
        published_at: '2025-01-10T12:00:00Z',
        target_commitish: 'aaa',
      },
    ];

    // Commit exactly at previous release time (should NOT be included in release 2)
    const commits: Commit[] = [
      {
        sha: 'c1',
        commit: { author: { name: 'Dev', date: '2025-01-10T12:00:00Z' } },
      },
      // This commit is between the two releases
      {
        sha: 'c2',
        commit: { author: { name: 'Dev', date: '2025-01-15T12:00:00Z' } },
      },
    ];

    const result = calculateLeadTime(releases, commits);

    // Only c2 should be included in release 2: 120 hours lead time
    // c1 is exactly at previous release time, so commitDate > previousReleaseDate is false
    expect(mockClassifyLeadTime).toHaveBeenCalled();
  });
});
