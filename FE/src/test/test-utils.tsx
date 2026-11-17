import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { makeStore, type RootState } from '@/app/store';
import { ThemeProvider } from '@/common/contexts/ThemeContext';
import { LanguageProvider } from '@/common/contexts/LanguageContext';
export function renderWithProviders(ui: ReactElement, opts: { preloadedState?: Partial<RootState>; route?: string; path?: string } = {}) {
  const store = makeStore(opts.preloadedState);
  const router = createMemoryRouter([{ path: opts.path ?? '/', element: ui }], { initialEntries: [opts.route ?? opts.path ?? '/'] });
  const result = render(<Provider store={store}><ThemeProvider><LanguageProvider><RouterProvider router={router} /></LanguageProvider></ThemeProvider></Provider>);
  return { ...result, store, router };
}
