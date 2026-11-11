import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppData } from '@/app/providers/AppDataProvider';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { HeroSection } from './HeroSection';
import { AboutEventSection } from './AboutEventSection';
import { RegistrationFormSection } from '@/features/public/registration/RegistrationFormSection';
import { RegistrationModal } from '@/features/public/registration/RegistrationModal';
import { useLanguage } from '@/hooks/useLanguage';

export function PublicLandingPage() {
  const { isLoading, hasLoadedPublic, error, refreshAll } = useAppData();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [registrationModalOpen, setRegistrationModalOpen] = useState(
    () => searchParams.get('register') === '1',
  );

  useEffect(() => {
    if (searchParams.get('register') === '1') {
      setRegistrationModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('register');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openModal = () => setRegistrationModalOpen(true);
  const closeModal = () => setRegistrationModalOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <PublicHeader variant="landing" onOpenRegistration={openModal} />
      <main className="flex-1 w-full">
        {isLoading && !hasLoadedPublic ? (
          <section
            aria-busy="true"
            className="w-full py-12 sm:py-16 bg-gradient-to-br from-[#EAF2FC] via-[#F6FAFF] to-[#E3EEFA]"
          >
            <div className="max-w-[1200px] mx-auto px-3.5 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-pulse">
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="h-7 w-52 rounded-full bg-[#D4E2F4]" />
                  <div className="h-12 w-full max-w-xl rounded-xl bg-[#D4E2F4]" />
                  <div className="h-6 w-3/4 rounded-lg bg-[#E3EEFA]" />
                  <div className="h-12 w-48 rounded-xl bg-[#F5C928]/40 mt-2" />
                </div>
                <div className="lg:col-span-5 h-72 rounded-2xl bg-white/80 border border-[#D4E2F4]" />
              </div>
            </div>
          </section>
        ) : error && !hasLoadedPublic ? (
          <section className="w-full py-16 bg-surface">
            <div className="max-w-md mx-auto px-4 text-center flex flex-col items-center gap-3">
              <p className="type-body-md text-on-surface-variant">{error}</p>
              <button
                type="button"
                onClick={() => void refreshAll()}
                className="px-5 py-2.5 rounded-xl bg-[#12365C] hover:bg-[#1769B5] text-white font-bold text-sm cursor-pointer transition-colors"
              >
                {t('common.refresh')}
              </button>
            </div>
          </section>
        ) : (
          <>
            <HeroSection onOpenRegistration={openModal} />
            <AboutEventSection />
            <RegistrationFormSection onOpenModal={openModal} />
          </>
        )}
      </main>
      <PublicFooter />
      <RegistrationModal isOpen={registrationModalOpen} onClose={closeModal} />
    </div>
  );
}
