import { SPORT_LABELS, type Sport } from '@sango/shared';
interface SportIconProps {
  sport: Sport;
  size?: number;
  decorative?: boolean;
}
export function SportIcon({ sport, size = 24, decorative = false }: SportIconProps) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : SPORT_LABELS[sport]}
      aria-hidden={decorative || undefined}
      {...common}
    >
      {sport === 'FOOTBALL' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m12 7 4 3-1.5 4.5h-5L8 10zM8 10 4 8m12 2 4-2M9.5 14.5 7 19m7.5-4.5L17 19" />
        </>
      )}
      {sport === 'BADMINTON' && (
        <>
          <path d="M8.5 16 3 4.5Q4.5 2 7 3.5Q9.5 1.5 12 3.5Q14.5 1.5 17 3.5Q19.5 2 21 4.5L15.5 16Z" />
          <path d="m7 3.5 3.5 12.5M12 3.5V16M17 3.5 13.5 16M6.5 12h11" />
          <path d="M8.5 16v2.5a3.5 3.5 0 0 0 7 0V16" />
        </>
      )}
      {sport === 'PICKLEBALL' && (
        <>
          <rect x="4" y="3" width="11" height="13" rx="5.5" transform="rotate(-35 9.5 9.5)" />
          <path d="M12.8 14.6l4.6 5.6" />
          <circle cx="19" cy="6" r="2.2" />
        </>
      )}
      {sport === 'TENNIS' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M6 5c5 3 5 11 0 14M18 5c-5 3-5 11 0 14" />
        </>
      )}
      {sport === 'BASKETBALL' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3v18M5 6c5 2 9 10 14 12M19 6C14 8 10 16 5 18" />
        </>
      )}
      {sport === 'VOLLEYBALL' && (
        <>
          <circle cx="12" cy="12" r="9" />
          {[0, 120, 240].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 12 12)`}>
              <path d="M12 12C9.2 9.3 9.1 5.9 10.44 3.14M13.85 3.19C12.6 5.7 13.1 8.7 16.1 10.9M17.2 4.65C15.5 6.7 16.1 10 19 13.4" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
