import { describe, it, expect } from 'vitest';
import {
  IncrementStatus,
  computeTransitionPath
} from '../../../../src/core/types/increment-metadata.js';

describe('computeTransitionPath', () => {
  it('returns empty array when from === to', () => {
    expect(computeTransitionPath(
      IncrementStatus.COMPLETED,
      IncrementStatus.COMPLETED
    )).toEqual([]);
  });

  it('computes PLANNING -> COMPLETED path', () => {
    const path = computeTransitionPath(
      IncrementStatus.PLANNING,
      IncrementStatus.COMPLETED
    );
    expect(path).toEqual([
      IncrementStatus.ACTIVE,
      IncrementStatus.READY_FOR_REVIEW,
      IncrementStatus.COMPLETED
    ]);
  });

  it('computes ACTIVE -> COMPLETED path', () => {
    const path = computeTransitionPath(
      IncrementStatus.ACTIVE,
      IncrementStatus.COMPLETED
    );
    expect(path).toEqual([
      IncrementStatus.READY_FOR_REVIEW,
      IncrementStatus.COMPLETED
    ]);
  });

  it('computes READY_FOR_REVIEW -> COMPLETED path', () => {
    const path = computeTransitionPath(
      IncrementStatus.READY_FOR_REVIEW,
      IncrementStatus.COMPLETED
    );
    expect(path).toEqual([IncrementStatus.COMPLETED]);
  });

  it('computes PAUSED -> COMPLETED via READY_FOR_REVIEW (shortest)', () => {
    const path = computeTransitionPath(
      IncrementStatus.PAUSED,
      IncrementStatus.COMPLETED
    );
    // PAUSED can go directly to READY_FOR_REVIEW (2 steps, shorter than via ACTIVE)
    expect(path).toEqual([
      IncrementStatus.READY_FOR_REVIEW,
      IncrementStatus.COMPLETED
    ]);
  });

  it('computes BACKLOG -> COMPLETED path', () => {
    const path = computeTransitionPath(
      IncrementStatus.BACKLOG,
      IncrementStatus.COMPLETED
    );
    expect(path).toEqual([
      IncrementStatus.ACTIVE,
      IncrementStatus.READY_FOR_REVIEW,
      IncrementStatus.COMPLETED
    ]);
  });

  it('computes ABANDONED -> COMPLETED path', () => {
    const path = computeTransitionPath(
      IncrementStatus.ABANDONED,
      IncrementStatus.COMPLETED
    );
    expect(path).toEqual([
      IncrementStatus.ACTIVE,
      IncrementStatus.READY_FOR_REVIEW,
      IncrementStatus.COMPLETED
    ]);
  });

  it('computes COMPLETED -> ACTIVE path (reopen)', () => {
    const path = computeTransitionPath(
      IncrementStatus.COMPLETED,
      IncrementStatus.ACTIVE
    );
    expect(path).toEqual([IncrementStatus.ACTIVE]);
  });
});
