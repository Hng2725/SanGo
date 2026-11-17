import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLocalStorage } from './useLocalStorage';
describe('useLocalStorage', () => {
  it('recovers from invalid JSON and persists functional updates', () => {
    localStorage.setItem('counter', '{invalid');
    const { result } = renderHook(() => useLocalStorage('counter', 2));
    expect(result.current[0]).toBe(2);
    act(() => result.current[1](previous => previous + 1));
    expect(result.current[0]).toBe(3);
    expect(localStorage.getItem('counter')).toBe('3');
  });
  it('restores a valid value', () => {
    localStorage.setItem('counter', '8');
    expect(renderHook(() => useLocalStorage('counter', 2)).result.current[0]).toBe(8);
  });
});
