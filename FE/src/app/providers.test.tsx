import { act, render, screen } from '@testing-library/react';
import { theme } from 'antd';
import { afterEach, expect, it, vi } from 'vitest';
import { AppProviders } from './providers';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function MotionProbe() {
  const { token } = theme.useToken();
  return <output aria-label="Chuyển động">{token.motion ? 'on' : 'off'}</output>;
}
afterEach(() => vi.restoreAllMocks());

it('updates Ant Design when the system animation preference changes without reloading', () => {
  let reduced = false;
  const listeners = new Set<() => void>();
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    get matches() {
      return query === reducedMotionQuery && reduced;
    },
    media: query,
    onchange: null,
    addEventListener: (_event: string, listener: unknown) => {
      if (query === reducedMotionQuery) listeners.add(listener as () => void);
    },
    removeEventListener: (_event: string, listener: unknown) => {
      listeners.delete(listener as () => void);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  render(
    <AppProviders>
      <MotionProbe />
    </AppProviders>,
  );
  expect(screen.getByLabelText('Chuyển động')).toHaveTextContent('on');
  act(() => {
    reduced = true;
    listeners.forEach((listener) => listener());
  });
  expect(screen.getByLabelText('Chuyển động')).toHaveTextContent('off');
  act(() => {
    reduced = false;
    listeners.forEach((listener) => listener());
  });
  expect(screen.getByLabelText('Chuyển động')).toHaveTextContent('on');
});
