import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce';
describe('useDebounce', () => {
  afterEach(() => vi.useRealTimers());
  it('waits until the last update has settled', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 400), { initialProps: { value: 'one' } });
    rerender({ value: 'two' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'three' });
    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe('one');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('three');
  });
});
