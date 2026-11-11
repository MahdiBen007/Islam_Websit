import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';

export function ProtectedAdminRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F8FD]">
        <div
          className="w-9 h-9 border-3 border-[#12365C]/20 border-t-[#1769B5] rounded-full animate-spin"
          role="status"
          aria-label="Loading session"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
