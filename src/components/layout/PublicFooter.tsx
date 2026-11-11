import { Link } from 'react-router-dom';
import { Camera, Globe, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { ClubLogo } from '@/components/common/ClubLogo';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useLanguage } from '@/hooks/useLanguage';

export function PublicFooter() {
  const { eventSettings } = useAppData();
  const { language, t } = useLanguage();

  const clubName = language === 'ar' ? eventSettings.clubNameAr : eventSettings.clubNameEn;
  const organizerSummary =
    language === 'ar' ? eventSettings.organizerSummaryAr : eventSettings.organizerSummaryEn;
  const contactAddress =
    language === 'ar' ? eventSettings.contactAddressAr : eventSettings.contactAddressEn;

  return (
    <footer
      id="footer-contact"
      className="w-full bg-surface-container-lowest shadow-[0_-1px_8px_rgba(18,54,92,0.04)] border-t border-outline-variant/20 mt-8 sm:mt-12"
    >
      <div className="max-w-[1200px] mx-auto px-3.5 sm:px-6 py-7 sm:py-9">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 items-start">
          {/* Column 1: Identity */}
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <ClubLogo size="sm" />
              <span className="type-headline-sm text-primary font-bold">{clubName}</span>
            </div>
            <p className="hidden sm:block type-body-sm text-on-surface-variant max-w-sm leading-relaxed">
              {organizerSummary}
            </p>
          </div>

          {/* Column 2: Contact */}
          <div className="flex flex-col gap-2.5">
            <h4 className="type-headline-sm text-primary font-bold mb-1">
              {t('footer.contactTitle')}
            </h4>
            <a
              href={`mailto:${eventSettings.contactEmail}`}
              className="inline-flex items-center gap-2 text-on-surface-variant hover:text-secondary type-body-sm transition-colors"
            >
              <Mail className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
              <span dir="ltr">{eventSettings.contactEmail}</span>
            </a>
            <div className="flex items-start gap-2 text-on-surface-variant type-body-sm">
              <MapPin className="w-4 h-4 text-secondary shrink-0 mt-1" aria-hidden="true" />
              <span>{contactAddress}</span>
            </div>
          </div>

          {/* Column 3: Social */}
          <div className="flex flex-col gap-3">
            <h4 className="type-headline-sm text-primary font-bold">
              {t('footer.followUsTitle')}
            </h4>
            <div className="flex items-center gap-3">
              <a
                href={eventSettings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:bg-secondary hover:text-on-secondary transition-colors"
              >
                <Camera className="w-5 h-5" aria-hidden="true" />
              </a>
              <a
                href={eventSettings.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Website / Facebook"
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:bg-secondary hover:text-on-secondary transition-colors"
              >
                <Globe className="w-5 h-5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-9 pt-4 sm:pt-5 border-t border-outline-variant/25 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-on-surface-variant type-body-sm text-center sm:text-start">
          <p>{t('common.allRightsReserved')}</p>
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-secondary hover:text-primary type-label-md transition-colors"
          >
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>{t('common.adminPortal')}</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
