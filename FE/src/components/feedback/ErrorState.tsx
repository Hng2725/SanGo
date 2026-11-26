import type { ReactNode } from 'react';
import { CourtLines } from '@/components/branding/CourtLines';

interface ErrorStateProps {
  title: string;
  description: string;
  actions: ReactNode;
  variant?: 'pitch' | 'out';
  details?: ReactNode;
}

export function ErrorState({
  title,
  description,
  actions,
  variant = 'out',
  details,
}: ErrorStateProps) {
  return (
    <main className="error-state">
      <CourtLines variant={variant} className="error-state-court" />
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="error-state-actions">{actions}</div>
      {details}
    </main>
  );
}
