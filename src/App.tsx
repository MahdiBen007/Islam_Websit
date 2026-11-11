import { useEffect } from 'react';
import { AppDataProvider } from '@/app/providers/AppDataProvider';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { ToastProvider } from '@/app/providers/ToastProvider';
import { AppRouter } from '@/app/router/AppRouter';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { useLanguage } from '@/hooks/useLanguage';

function DocumentTitleSync() {
  const { language, t } = useLanguage();
  useEffect(() => {
    document.title =
      language === 'ar'
        ? `${t('common.clubName')} | ${t('registration.title')}`
        : `${t('common.clubName')} | ${t('registration.title')}`;
  }, [language, t]);
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppDataProvider>
            <DocumentTitleSync />
            {children}
          </AppDataProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
