interface CourtLinesProps {
  variant?: 'pitch' | 'out';
  animated?: boolean;
  className?: string;
}
const paths = [
  { d: 'M10 10 H290 V440 H10 Z', delay: 0, duration: 1000 },
  { d: 'M10 225 H290', delay: 150, duration: 700 },
  { d: 'M105 225 A45 45 0 1 0 195 225 A45 45 0 1 0 105 225', delay: 300, duration: 700 },
  { d: 'M75 10 V80 H225 V10', delay: 450, duration: 700 },
  { d: 'M75 440 V370 H225 V440', delay: 450, duration: 700 },
  { d: 'M122 80 A32 32 0 0 0 178 80', delay: 550, duration: 700 },
  { d: 'M122 370 A32 32 0 0 1 178 370', delay: 550, duration: 700 },
];
export function CourtLines({
  variant = 'pitch',
  animated = false,
  className = '',
}: CourtLinesProps) {
  return (
    <svg
      viewBox={variant === 'out' ? '0 0 340 450' : '0 0 300 450'}
      aria-hidden="true"
      className={`court-lines ${animated ? 'court-lines-animated' : ''} ${className}`}
    >
      {paths.map((path) => (
        <path
          key={path.d}
          d={path.d}
          pathLength={1}
          style={{ animationDelay: `${path.delay}ms`, animationDuration: `${path.duration}ms` }}
        />
      ))}
      <circle className="court-lines-spot" cx="150" cy="225" r="2.5" />
      {variant === 'out' && <circle className="court-lines-ball" cx="318" cy="118" r="9" />}
    </svg>
  );
}
