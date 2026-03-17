import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mockClient) },
}));

// Mock the GitHub AC parser (used for parseACStatusFromSpec)
vi.mock('../../../../plugins/specweave/lib/integrations/github/github-ac-checkbox-sync.js', () => ({
  GitHubACCheckboxSync: {
    parseACStatusFromSpec: vi.fn(() => new Map([
      ['AC-US1-01', true],
      ['AC-US1-02', true],
      ['AC-US1-03', false],
    ])),
    buildACPrefix: vi.fn((usId: string) => `AC-${usId.replace('US-', 'US')}-`),
  },
}));

import { AdoACCheckboxSync } from '../../../../plugins/specweave/lib/integrations/ado/ado-ac-checkbox-sync.js';

describe('AdoACCheckboxSync — API-based section update', () => {
  let sync: AdoACCheckboxSync;
  const projectRoot = '/tmp/test-project';

  beforeEach(() => {
    sync = new AdoACCheckboxSync({
      projectRoot,
      incrementId: '0001-test',
    });
    mockClient.get.mockReset();
    mockClient.patch.mockReset();
    mockClient.post.mockReset();
  });

  it('uses JSON Patch op:replace for description update (no regex)', async () => {
    // Setup: work item with existing AC section
    const existingDescription = `<h2>Story</h2>
<p>Some content</p>
<!-- AC_SECTION_START -->
<h3>Acceptance Criteria</h3>
<ul><li>☐ AC-US1-01</li><li>☐ AC-US1-02</li></ul>
<!-- AC_SECTION_END -->`;

    mockClient.get.mockResolvedValue({
      data: {
        fields: { 'System.Description': existingDescription },
      },
    });

    mockClient.patch.mockResolvedValue({ data: {} });
    mockClient.post.mockResolvedValue({ data: {} });

    const acStatus = new Map<string, boolean>([
      ['AC-US1-01', true],
      ['AC-US1-02', true],
      ['AC-US1-03', false],
    ]);

    const result = await sync.updateWorkItemACSection(
      mockClient as any,
      42,
      acStatus,
    );

    expect(result).toBeGreaterThan(0);

    // Verify PATCH was called with JSON Patch format
    expect(mockClient.patch).toHaveBeenCalledTimes(1);
    const patchCall = mockClient.patch.mock.calls[0];
    expect(patchCall[1]).toEqual([
      expect.objectContaining({
        op: 'replace',
        path: '/fields/System.Description',
      }),
    ]);

    // Verify the new description contains updated checkboxes
    const newDescription = patchCall[1][0].value;
    expect(newDescription).toContain('☑ AC-US1-01');
    expect(newDescription).toContain('☑ AC-US1-02');
    expect(newDescription).toContain('☐ AC-US1-03');
    // Verify surrounding content preserved
    expect(newDescription).toContain('<h2>Story</h2>');
    expect(newDescription).toContain('Some content');
  });

  it('appends AC section when description has no existing section', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        fields: { 'System.Description': '<h2>Story</h2><p>Content only</p>' },
      },
    });
    mockClient.patch.mockResolvedValue({ data: {} });
    mockClient.post.mockResolvedValue({ data: {} });

    const acStatus = new Map<string, boolean>([
      ['AC-US1-01', true],
    ]);

    const result = await sync.updateWorkItemACSection(
      mockClient as any,
      42,
      acStatus,
    );

    expect(result).toBe(1);
    const patchCall = mockClient.patch.mock.calls[0];
    const newDescription = patchCall[1][0].value;
    expect(newDescription).toContain('<!-- AC_SECTION_START -->');
    expect(newDescription).toContain('☑ AC-US1-01');
    expect(newDescription).toContain('<!-- AC_SECTION_END -->');
    expect(newDescription).toContain('<h2>Story</h2>');
  });
});
