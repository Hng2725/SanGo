import { useCallback, useMemo, useRef, useState } from 'react';

export interface SlotSelectionOptions<TSlot> {
  getKey: (slot: TSlot) => string;
  isSelectable: (slot: TSlot) => boolean;
  isAdjacent: (a: TSlot, b: TSlot) => boolean; // a.endAt === b.startAt và cùng ngày hoạt động
  max: number;                                  // MAX_SLOTS_PER_BOOKING
}

export function useSlotSelection<TSlot>(options: SlotSelectionOptions<TSlot>): {
  selected: readonly TSlot[];
  isSelected: (slot: TSlot) => boolean;
  toggle: (slot: TSlot) => void;
  clear: () => void;
  error: string | null;
} {
  const [selected, setSelected] = useState<readonly TSlot[]>([]);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Map khóa của các ô đã chọn để tra cứu O(1)
  const selectedKeys = useMemo(() => {
    const { getKey } = optionsRef.current;
    return new Set(selected.map((s) => getKey(s)));
  }, [selected]);

  // Bọc useCallback để các ô SlotCell (React.memo) không re-render thừa khi truyền callback
  const isSelected = useCallback(
    (slot: TSlot): boolean => {
      return selectedKeys.has(optionsRef.current.getKey(slot));
    },
    [selectedKeys],
  );

  // Bọc useCallback để giữ tham chiếu hàm onClick ổn định cho từng SlotCell được memo hóa
  const toggle = useCallback((slot: TSlot) => {
    const { getKey, isSelectable, isAdjacent, max } = optionsRef.current;
    if (!isSelectable(slot)) {
      return;
    }

    const targetKey = getKey(slot);

    setSelected((prev) => {
      if (prev.length === 0) {
        setError(null);
        return [slot];
      }

      const first = prev[0];
      const last = prev[prev.length - 1];
      const firstKey = getKey(first);
      const lastKey = getKey(last);

      // Bấm ô ở đầu dải -> bỏ ô đầu
      if (targetKey === firstKey) {
        setError(null);
        return prev.slice(1);
      }

      // Bấm ô ở cuối dải -> bỏ ô cuối
      if (targetKey === lastKey) {
        setError(null);
        return prev.slice(0, -1);
      }

      // Nối vào trước đầu dải
      if (isAdjacent(slot, first)) {
        if (prev.length >= max) {
          setError(`Chỉ được chọn tối đa ${max} khung giờ liên tiếp.`);
          return prev;
        }
        setError(null);
        return [slot, ...prev];
      }

      // Nối vào sau cuối dải
      if (isAdjacent(last, slot)) {
        if (prev.length >= max) {
          setError(`Chỉ được chọn tối đa ${max} khung giờ liên tiếp.`);
          return prev;
        }
        setError(null);
        return [...prev, slot];
      }

      // Bấm ô không liền kề (hoặc nằm giữa dải) -> bắt đầu dải mới từ ô vừa bấm
      setError(null);
      return [slot];
    });
  }, []);

  const clear = useCallback(() => {
    setSelected([]);
    setError(null);
  }, []);

  return {
    selected,
    isSelected,
    toggle,
    clear,
    error,
  };
}
