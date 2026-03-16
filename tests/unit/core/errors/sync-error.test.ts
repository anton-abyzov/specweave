import { describe, it, expect } from 'vitest';
import { SyncError } from '../../../../src/core/errors/sync-error.js';

describe('SyncError', () => {
  it('constructs with provider, httpStatus, responseBody, and detail', () => {
    const error = new SyncError('jira', 422, '{"errorMessages":["Field required"]}', 'transition failed');

    expect(error.message).toBe('[JIRA] sync failed: 422 transition failed');
    expect(error.provider).toBe('jira');
    expect(error.httpStatus).toBe(422);
    expect(error.name).toBe('SyncError');
    expect(error).toBeInstanceOf(Error);
  });

  it('stores responseBody for debugging', () => {
    const body = '{"error":"not found"}';
    const error = new SyncError('github', 404, body, 'milestone missing');

    expect(error.responseBody).toBe(body);
  });

  it('uppercases provider name in message', () => {
    const error = new SyncError('ado', 500, '', 'server error');

    expect(error.message).toBe('[ADO] sync failed: 500 server error');
  });

  it('handles empty detail', () => {
    const error = new SyncError('github', 503, '', '');

    expect(error.message).toBe('[GITHUB] sync failed: 503 ');
  });

  it('extends SpecWeaveError with SYNC_FAILED code', () => {
    const error = new SyncError('jira', 422, '', 'test');

    expect(error.code).toBe(2001); // ErrorCode.SYNC_FAILED
  });
});
