import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { HeroSection } from './HeroSection';
import { AboutEventSection } from './AboutEventSection';
import { RegistrationFormSection } from '@/features/public/registration/RegistrationFormSection';
import { RegistrationModal } from '@/features/public/registration/RegistrationModal';

export function PublicLandingPage() {
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
        <HeroSection onOpenRegistration={openModal} />
        <AboutEventSection />
        <RegistrationFormSection onOpenModal={openModal} />
      </main>
      <PublicFooter />
      <RegistrationModal isOpen={registrationModalOpen} onClose={closeModal} />
    </div>
  );
}
