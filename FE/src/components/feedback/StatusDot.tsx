interface StatusDotProps { label: string; tone?: 'success' | 'warning' | 'error' | 'info' | 'muted' }
export function StatusDot({ label, tone = 'muted' }: StatusDotProps) { return <span className={`status-dot status-dot-${tone}`}><span aria-hidden="true" />{label}</span>; }
