import { Link } from 'react-router';
interface BrandLogoProps {
  inverted?: boolean;
}
export function BrandLogo({ inverted = false }: BrandLogoProps) {
  return (
    <Link
      to="/"
      viewTransition
      className={`brand-logo ${inverted ? 'brand-logo-inverted' : ''}`}
      aria-label="SanGo, về trang chủ"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M12 4v16" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span>SanGo</span>
    </Link>
  );
}
