import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetSearchParams = vi.fn();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
}));

vi.mock('react', () => ({
  useCallback: (fn: Function) => fn,
}));

// Must import AFTER mocks are declared (vi.mock is auto-hoisted)
import { useUrlState } from '../../../src/dashboard/client/src/hooks/useUrlState.js';

describe('useUrlState batching', () => {
  beforeEach(() => {
    mockSetSearchParams.mockClear();
  });

  it('batches 3 synchronous setter calls into a single setSearchParams call', async () => {
    const [, setTab] = useUrlState('tab', 'groups');
    const [, setType] = useUrlState('type', '');
    const [, setQuery] = useUrlState('q', '');

    setTab('errors');
    setType('tool_failure');
    setQuery('sibling');

    // Wait for queueMicrotask flush
    await new Promise<void>(resolve => queueMicrotask(resolve));

    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);

    const updater = mockSetSearchParams.mock.calls[0][0];
    const result = updater(new URLSearchParams());

    expect(result.get('tab')).toBe('errors');
    expect(result.get('type')).toBe('tool_failure');
    expect(result.get('q')).toBe('sibling');
  });

  it('deletes params when set to default value', async () => {
    const [, setTab] = useUrlState('tab', 'groups');

    setTab('groups');

    await new Promise<void>(resolve => queueMicrotask(resolve));

    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);

    const updater = mockSetSearchParams.mock.calls[0][0];
    const prev = new URLSearchParams('tab=errors');
    const result = updater(prev);

    expect(result.has('tab')).toBe(false);
  });

  it('last write wins when same key is set twice in one tick', async () => {
    const [, setTab] = useUrlState('tab', 'groups');

    setTab('errors');
    setTab('timeline');

    await new Promise<void>(resolve => queueMicrotask(resolve));

    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);

    const updater = mockSetSearchParams.mock.calls[0][0];
    const result = updater(new URLSearchParams());

    expect(result.get('tab')).toBe('timeline');
  });
});
