import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export function useUrlFilters<T extends Record<string, string | undefined>>(
  defaults: T,
): [T, (patch: Partial<T>) => void, () => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const result: Record<string, string | undefined> = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const val = searchParams.get(key);
      if (val !== null && val !== '') {
        result[key] = val;
      } else {
        result[key] = defaults[key];
      }
    }
    return result as T;
  }, [searchParams, defaults]);

  const setFilters = useCallback(
    (patch: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const patchKeys = Object.keys(patch);
          const isOnlyPageChange = patchKeys.length === 1 && patchKeys[0] === 'page';

          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '' || value === defaults[key as keyof T]) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }

          if (!isOnlyPageChange && !('page' in patch)) {
            next.delete('page');
          } else if (next.get('page') === '1') {
            next.delete('page');
          }

          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, defaults],
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return [filters, setFilters, resetFilters];
}
