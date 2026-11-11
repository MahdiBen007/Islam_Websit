import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { PublicLandingPage } from '@/features/public/landing/PublicLandingPage';
import { ProtectedAdminRoute } from '@/features/admin/auth/ProtectedAdminRoute';
import { useLanguage } from '@/hooks/useLanguage';

const RegistrationSuccessPage = lazy(() =>
  import('@/features/public/success/RegistrationSuccessPage').then((m) => ({
    default: m.RegistrationSuccessPage,
  })),
);
const AdminLoginPage = lazy(() =>
  import('@/features/admin/auth/AdminLoginPage').then((m) => ({
    default: m.AdminLoginPage,
  })),
);

const AdminLayout = lazy(() =>
  import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminDashboardPage = lazy(() =>
  import('@/features/admin/dashboard/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  })),
);
const RegistrationsManagementPage = lazy(() =>
  import('@/features/admin/registrations/RegistrationsManagementPage').then((m) => ({
    default: m.RegistrationsManagementPage,
  })),
);
const SpecializationsPage = lazy(() =>
  import('@/features/admin/specializations/SpecializationsPage').then((m) => ({
    default: m.SpecializationsPage,
  })),
);
const EventSettingsPage = lazy(() =>
  import('@/features/admin/event-settings/EventSettingsPage').then((m) => ({
    default: m.EventSettingsPage,
  })),
);

function RouteLoadingFallback() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-primary">
        <div
          className="w-8 h-8 border-3 border-primary/20 border-t-secondary rounded-full animate-spin"
          aria-hidden="true"
        />
        <span className="type-label-md">{t('common.loading')}</span>
      </div>
    </div>
  );
}

function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-3xl shadow-md p-8 text-center flex flex-col items-center gap-4 border border-outline-variant/25">
        <span className="type-display-lg text-primary font-bold">404</span>
        <p className="type-body-md text-on-surface-variant">{t('success.notFoundDesc')}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-secondary type-label-md transition-colors"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          <span>{t('success.returnHome')}</span>
        </Link>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public Website Routes */}
        <Route path="/" element={<PublicLandingPage />} />
        <Route path="/success" element={<RegistrationSuccessPage />} />
        <Route path="/success/:referenceId" element={<RegistrationSuccessPage />} />

        {/* Admin Auth */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Protected Admin Dashboard Routes */}
        <Route element={<ProtectedAdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/registrations" element={<RegistrationsManagementPage />} />
            <Route path="/admin/specializations" element={<SpecializationsPage />} />
            <Route path="/admin/event-settings" element={<EventSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
