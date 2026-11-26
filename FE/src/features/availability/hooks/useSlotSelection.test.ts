import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSlotSelection } from './useSlotSelection';

interface MockSlot {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  available: boolean;
}

const makeSlot = (
  startHour: number,
  available = true,
  date = '2026-11-23',
): MockSlot => ({
  id: `${date}_${startHour}`,
  date,
  startHour,
  endHour: startHour + 1,
  available,
});

describe('useSlotSelection', () => {
  const defaultOptions = {
    getKey: (s: MockSlot) => s.id,
    isSelectable: (s: MockSlot) => s.available,
    isAdjacent: (a: MockSlot, b: MockSlot) =>
      a.date === b.date && a.endHour === b.startHour,
    max: 3,
  };

  it('nối dài dải khi chọn các ô liền kề đầu hoặc cuối', () => {
    const { result } = renderHook(() => useSlotSelection(defaultOptions));
    const s8 = makeSlot(8);
    const s9 = makeSlot(9);
    const s7 = makeSlot(7);

    act(() => result.current.toggle(s8));
    expect(result.current.selected.map((s) => s.startHour)).toEqual([8]);

    // Nối vào cuối dải
    act(() => result.current.toggle(s9));
    expect(result.current.selected.map((s) => s.startHour)).toEqual([8, 9]);

    // Nối vào đầu dải
    act(() => result.current.toggle(s7));
    expect(result.current.selected.map((s) => s.startHour)).toEqual([7, 8, 9]);
    expect(result.current.isSelected(s8)).toBe(true);
  });

  it('bỏ ô ở đầu hoặc cuối dải khi bấm lại', () => {
    const { result } = renderHook(() => useSlotSelection(defaultOptions));
    const s7 = makeSlot(7);
    const s8 = makeSlot(8);
    const s9 = makeSlot(9);

    act(() => {
      result.current.toggle(s7);
      result.current.toggle(s8);
      result.current.toggle(s9);
    });
    expect(result.current.selected.map((s) => s.startHour)).toEqual([7, 8, 9]);

    // Bỏ đầu dải
    act(() => result.current.toggle(s7));
    expect(result.current.selected.map((s) => s.startHour)).toEqual([8, 9]);

    // Bỏ cuối dải
    act(() => result.current.toggle(s9));
    expect(result.current.selected.map((s) => s.startHour)).toEqual([8]);

    // Bỏ nốt ô còn lại
    act(() => result.current.toggle(s8));
    expect(result.current.selected).toEqual([]);
  });

  it('bắt đầu dải mới khi bấm ô không liền kề', () => {
    const { result } = renderHook(() => useSlotSelection(defaultOptions));
    const s7 = makeSlot(7);
    const s8 = makeSlot(8);
    const s11 = makeSlot(11);

    act(() => {
      result.current.toggle(s7);
      result.current.toggle(s8);
    });
    expect(result.current.selected.map((s) => s.startHour)).toEqual([7, 8]);

    act(() => result.current.toggle(s11));
    expect(result.current.selected.map((s) => s.startHour)).toEqual([11]);
    expect(result.current.isSelected(s7)).toBe(false);
    expect(result.current.isSelected(s11)).toBe(true);
  });

  it('báo lỗi khi chọn vượt quá số khung tối đa (max)', () => {
    const { result } = renderHook(() => useSlotSelection(defaultOptions));
    const s7 = makeSlot(7);
    const s8 = makeSlot(8);
    const s9 = makeSlot(9);
    const s10 = makeSlot(10);

    act(() => {
      result.current.toggle(s7);
      result.current.toggle(s8);
      result.current.toggle(s9);
    });
    expect(result.current.selected).toHaveLength(3);
    expect(result.current.error).toBeNull();

    // Chọn ô thứ 4 vượt max = 3
    act(() => result.current.toggle(s10));
    expect(result.current.selected).toHaveLength(3);
    expect(result.current.error).toMatch(/tối đa 3 khung giờ/i);
  });

  it('bỏ qua ô không khả dụng (isSelectable = false)', () => {
    const { result } = renderHook(() => useSlotSelection(defaultOptions));
    const bookedSlot = makeSlot(8, false);

    act(() => result.current.toggle(bookedSlot));
    expect(result.current.selected).toHaveLength(0);
  });
});
