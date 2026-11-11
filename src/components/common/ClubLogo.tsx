import officialClubLogo from '@/assets/club-logo.png';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useLanguage } from '@/hooks/useLanguage';

interface ClubLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ClubLogo({ className = '', size = 'md' }: ClubLogoProps) {
  const { eventSettings } = useAppData();
  const { language } = useLanguage();

  const sizeClass =
    size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';

  const altText =
    language === 'ar' ? eventSettings.clubNameAr : eventSettings.clubNameEn;

  const src = eventSettings.logoDataUrl || officialClubLogo;

  return (
    <img
      src={src}
      alt={altText}
      className={`${sizeClass} rounded-xl object-contain bg-surface-container-lowest p-0.5 shrink-0 ${className}`}
    />
  );
}
