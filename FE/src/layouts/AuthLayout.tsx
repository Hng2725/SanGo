import { Outlet } from 'react-router';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { CourtLines } from '@/components/branding/CourtLines';
import { SportIcon } from '@/components/icons/SportIcon';
import { useLanguage } from '@/common/contexts/LanguageContext';
const heroImages = import.meta.glob<string>('../assets/images/auth-hero.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});
const heroImage = Object.values(heroImages)[0];
export default function AuthLayout() {
  const { t, language } = useLanguage();
  return (
    <div className="auth-layout">
      <aside className={`auth-art ${heroImage ? 'auth-art-with-image' : ''}`}>
        {heroImage && <img className="auth-art-image" src={heroImage} alt="" />}
        <div className="auth-art-top">
          <BrandLogo inverted />
        </div>
        <CourtLines animated className="auth-pitch" />
        <div className="auth-art-copy">
          <h2>
            {t('authHeadlineFirst')}
            <br />
            {t('authHeadlineSecond')}
          </h2>
          <p>{t('authDescription')}</p>
          <div className="auth-chips">
            <span>
              <SportIcon sport="FOOTBALL" size={18} decorative />
              {language === 'vi' ? 'Bóng đá mini' : 'Football'}
            </span>
            <span>
              <SportIcon sport="BADMINTON" size={18} decorative />
              {language === 'vi' ? 'Cầu lông' : 'Badminton'}
            </span>
            <span>
              <SportIcon sport="PICKLEBALL" size={18} decorative />
              Pickleball
            </span>
            <span>
              <SportIcon sport="TENNIS" size={18} decorative />
              Tennis
            </span>
          </div>
        </div>
      </aside>
      <main className="auth-form-panel">
        <div className="auth-form-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
