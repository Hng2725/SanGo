import type { ReactNode } from 'react';
interface SectionProps { title?: string; extra?: ReactNode; children: ReactNode; className?: string }
export function Section({ title, extra, children, className = '' }: SectionProps) { return <section className={`sg-section ${className}`}>{title && <div className="sg-section-heading"><h2>{title}</h2>{extra}</div>}{children}</section>; }
