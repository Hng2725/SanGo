import { Link } from 'react-router';
import { SPORTS, SPORT_LABELS } from '@sango/shared';
import { SportIcon } from '@/components/icons/SportIcon';
import styles from './SportShortcuts.module.css';

export function SportShortcuts() {
  return (
    <nav className={styles.grid} aria-label="Tìm theo môn thể thao">
      {SPORTS.map((sport) => (
        <Link key={sport} to={`/venues?sport=${sport}`} viewTransition className={styles.link}>
          <SportIcon sport={sport} size={28} decorative />
          <span>{SPORT_LABELS[sport]}</span>
        </Link>
      ))}
    </nav>
  );
}
