import { isApiErrorBody, type ErrorCode } from '@sango/shared';
export function getErrorMessage(error: unknown): string {
  if (isApiErrorBody(error)) return error.message;
  if (typeof error === 'object' && error !== null && 'data' in error && isApiErrorBody(error.data)) return error.data.message;
  return 'Không kết nối được máy chủ';
}
export function getErrorCode(error: unknown): ErrorCode | undefined {
  if (isApiErrorBody(error)) return error.code;
  if (typeof error === 'object' && error !== null && 'data' in error && isApiErrorBody(error.data)) return error.data.code;
  return undefined;
}
