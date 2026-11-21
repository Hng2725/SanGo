import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiErrorBody } from '@sango/shared';

interface ErrorDetail {
  path: (string | number)[];
  message: string;
}

export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
): void {
  if (!isApiErrorBody(error)) return;
  if (!Array.isArray(error.details)) return;

  for (const item of error.details as ErrorDetail[]) {
    if (item && Array.isArray(item.path) && item.path.length > 0) {
      const fieldPath = item.path.join('.') as Path<T>;
      setError(fieldPath, {
        type: 'server',
        message: item.message,
      });
    }
  }
}
