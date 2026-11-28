import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiErrorBody } from '@sango/shared';

export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
): void {
  const body = isApiErrorBody(error)
    ? error
    : typeof error === 'object' && error !== null && 'data' in error && isApiErrorBody(error.data)
      ? error.data
      : undefined;
  if (!body || !Array.isArray(body.details)) return;

  for (const item of body.details) {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('path' in item) ||
      !('message' in item) ||
      typeof item.message !== 'string'
    )
      continue;
    const path =
      typeof item.path === 'string'
        ? item.path
        : Array.isArray(item.path)
          ? item.path.join('.')
          : '';
    if (path) {
      const fieldPath = path as Path<T>;
      setError(fieldPath, {
        type: 'server',
        message: item.message,
      });
    }
  }
}
