import { http, HttpResponse } from 'msw';
export const handlers = [http.get('/api/auth/me', () => HttpResponse.json({ statusCode: 401, error: 'Unauthorized', code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập', path: '/api/auth/me', timestamp: '2026-11-20T00:00:00.000Z' }, { status: 401 }))];
