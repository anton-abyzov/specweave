import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIntersectionObserver } from '../useIntersectionObserver';

describe('useIntersectionObserver', () => {
  let observeCallback: IntersectionObserverCallback;
  const mockObserve = vi.fn();
  const mockUnobserve = vi.fn();
  const mockDisconnect = vi.fn();

  beforeEach(() => {
    mockObserve.mockClear();
    mockUnobserve.mockClear();
    mockDisconnect.mockClear();

    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observeCallback = callback;
      }
      observe = mockObserve;
      unobserve = mockUnobserve;
      disconnect = mockDisconnect;
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('returns false initially', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    expect(result.current[1]).toBe(false);
  });

  it('observes element when ref callback is called', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const element = document.createElement('div');

    act(() => {
      result.current[0](element);
    });

    expect(mockObserve).toHaveBeenCalledWith(element);
  });

  it('sets isIntersecting to true when element enters viewport', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const element = document.createElement('div');

    act(() => {
      result.current[0](element);
    });

    act(() => {
      observeCallback(
        [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(result.current[1]).toBe(true);
  });

  it('unobserves after intersection', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const element = document.createElement('div');

    act(() => {
      result.current[0](element);
    });

    act(() => {
      observeCallback(
        [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(mockUnobserve).toHaveBeenCalledWith(element);
  });
});
