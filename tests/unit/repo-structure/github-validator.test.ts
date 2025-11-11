/**
 * Unit Tests for GitHub Validator
 *
 * Following BDD Given/When/Then format for test cases
 * Test Coverage Target: 90%
 */

import {
  validateRepository,
  validateOwner,
  validateWithRetry,
  checkRateLimit,
} from '../../../src/core/repo-structure/github-validator';

// Mock global fetch
global.fetch = jest.fn();

const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('validateRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return exists:false when repository does not exist (404)', async () => {
    // Given: valid owner and repo, API returns 404
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not Found' }),
    } as Response);

    // When: validateRepository is called
    const result = await validateRepository('owner', 'nonexistent-repo', 'ghp_token');

    // Then: returns {exists: false, valid: true}
    expect(result.exists).toBe(false);
    expect(result.valid).toBe(true);
  });

  it('should return exists:true with URL when repository exists (200)', async () => {
    // Given: valid owner and repo, API returns 200
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        html_url: 'https://github.com/owner/repo',
        name: 'repo',
      }),
    } as Response);

    // When: validateRepository is called
    const result = await validateRepository('owner', 'repo', 'ghp_token');

    // Then: returns {exists: true, valid: true, url: ...}
    expect(result.exists).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.url).toBe('https://github.com/owner/repo');
  });

  it('should return error for invalid GitHub token (401)', async () => {
    // Given: invalid token, API returns 401
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Bad credentials' }),
    } as Response);

    // When: validateRepository is called
    const result = await validateRepository('owner', 'repo', 'invalid_token');

    // Then: returns error: 'Invalid GitHub token'
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid GitHub token');
  });

  it('should return error for forbidden access (403)', async () => {
    // Given: valid token but forbidden, API returns 403
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' }),
    } as Response);

    // When: validateRepository is called
    const result = await validateRepository('owner', 'repo', 'ghp_token');

    // Then: returns error: 'Forbidden - check token permissions or rate limit'
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Forbidden');
    expect(result.error).toMatch(/permissions|rate limit/i);
  });

  it('should handle network failure gracefully', async () => {
    // Given: network failure
    mockedFetch.mockRejectedValueOnce(new Error('Network error'));

    // When: validateRepository is called
    const result = await validateRepository('owner', 'repo', 'ghp_token');

    // Then: returns error with network message
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should work without token (unauthenticated)', async () => {
    // Given: no token, API returns 200
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        html_url: 'https://github.com/owner/public-repo',
      }),
    } as Response);

    // When: validateRepository is called without token
    const result = await validateRepository('owner', 'public-repo');

    // Then: validates without auth header
    expect(result.exists).toBe(true);
    expect(result.valid).toBe(true);
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      })
    );
  });

  it('should include auth header when token provided', async () => {
    // Given: valid token
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    // When: validateRepository is called with token
    await validateRepository('owner', 'repo', 'ghp_token123');

    // Then: fetch called with Authorization header
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'token ghp_token123',
        }),
      })
    );
  });
});

describe('validateOwner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return valid:true with type:user for valid user', async () => {
    // Given: valid user, user endpoint returns 200
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ type: 'User', login: 'username' }),
    } as Response);

    // When: validateOwner is called
    const result = await validateOwner('username', 'ghp_token');

    // Then: returns {valid: true, type: 'user'}
    expect(result.valid).toBe(true);
    expect(result.type).toBe('user');
  });

  it('should return valid:true with type:org for organization', async () => {
    // Given: valid org, user endpoint returns Organization type
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ type: 'Organization', login: 'myorg' }),
    } as Response);

    // When: validateOwner is called
    const result = await validateOwner('myorg', 'ghp_token');

    // Then: returns {valid: true, type: 'org'}
    expect(result.valid).toBe(true);
    expect(result.type).toBe('org');
  });

  it('should try org endpoint if user endpoint returns User but is actually org', async () => {
    // Given: org with user-like profile
    mockedFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ type: 'User' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ type: 'Organization' }),
      } as Response);

    // When: validateOwner is called
    const result = await validateOwner('org-name', 'ghp_token');

    // Then: validates as org type
    expect(result.valid).toBe(true);
    expect(result.type).toBe('org');
  });

  it('should return valid:false when owner not found (404)', async () => {
    // Given: nonexistent owner, both endpoints return 404
    mockedFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

    // When: validateOwner is called
    const result = await validateOwner('nonexistent', 'ghp_token');

    // Then: returns {valid: false, error: 'Owner not found'}
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Owner not found');
  });

  it('should handle network failure gracefully', async () => {
    // Given: network failure
    mockedFetch.mockRejectedValueOnce(new Error('Connection timeout'));

    // When: validateOwner is called
    const result = await validateOwner('owner', 'ghp_token');

    // Then: returns error with network message
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Connection timeout');
  });

  it('should work without token (public API)', async () => {
    // Given: no token, API returns 200
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ type: 'User' }),
    } as Response);

    // When: validateOwner is called without token
    const result = await validateOwner('publicuser');

    // Then: validates without auth header
    expect(result.valid).toBe(true);
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      })
    );
  });
});

describe('validateWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should succeed on 2nd attempt after initial failure', async () => {
    // Given: function fails once then succeeds
    const failOnceFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce({ success: true });

    // When: validateWithRetry is called
    const promise = validateWithRetry(failOnceFn, { maxAttempts: 3, baseDelay: 1000 });
    jest.runAllTimers();

    const result = await promise;

    // Then: returns success on 2nd attempt
    expect(result).toEqual({ success: true });
    expect(failOnceFn).toHaveBeenCalledTimes(2);
  });

  it('should throw last error after all 3 attempts fail', async () => {
    // Given: function fails all attempts
    const alwaysFailFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));

    // When: validateWithRetry is called
    const promise = validateWithRetry(alwaysFailFn, { maxAttempts: 3, baseDelay: 1000 });
    jest.runAllTimers();

    // Then: throws last error
    await expect(promise).rejects.toThrow('Persistent failure');
    expect(alwaysFailFn).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff (1s, 2s, 4s)', async () => {
    // Given: exponential backoff config, function fails twice
    const failTwiceFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValueOnce({ success: true });

    // When: validateWithRetry is called
    const promise = validateWithRetry(failTwiceFn, { maxAttempts: 3, baseDelay: 1000 });

    // Fast-forward timers
    jest.advanceTimersByTime(1000); // 1st retry after 1s
    await Promise.resolve();
    jest.advanceTimersByTime(2000); // 2nd retry after 2s
    await Promise.resolve();

    const result = await promise;

    // Then: waits 1s, 2s between attempts
    expect(result).toEqual({ success: true});
    expect(failTwiceFn).toHaveBeenCalledTimes(3);
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return remaining and resetAt from API', async () => {
    // Given: valid token, rate_limit endpoint returns data
    const resetAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        resources: {
          core: {
            remaining: 4850,
            reset: resetAt,
          },
        },
      }),
    } as Response);

    // When: checkRateLimit is called
    const result = await checkRateLimit('ghp_token');

    // Then: returns {remaining, resetAt}
    expect(result.remaining).toBe(4850);
    expect(result.resetAt).toBeDefined();
  });

  it('should throw error when API fails', async () => {
    // Given: API failure
    mockedFetch.mockRejectedValueOnce(new Error('API error'));

    // When: checkRateLimit is called
    // Then: throws error with message
    await expect(checkRateLimit('ghp_token')).rejects.toThrow('API error');
  });
});
