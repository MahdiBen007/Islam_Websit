import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from 'lucide-react';
import { ClubLogo } from '@/components/common/ClubLogo';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { notificationService } from '@/services/notifications/notificationService';
import { formatRelativeDate } from '@/utils/formatters';

export function AdminLayout() {
  const { eventSettings, notifications, unreadCount } = useAppData();
  const { session, logout } = useAuth();
  const { showToast } = useToast();
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSidebarOpen(false);
    setNotifOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const navItems = [
    {
      to: '/admin/dashboard',
      label: t('admin.sidebar.dashboard'),
      icon: LayoutDashboard,
    },
    {
      to: '/admin/registrations',
      label: t('admin.sidebar.registrations'),
      icon: Users,
    },
    {
      to: '/admin/specializations',
      label: t('admin.sidebar.specializations'),
      icon: GraduationCap,
    },
    {
      to: '/admin/event-settings',
      label: t('admin.sidebar.eventSettings'),
      icon: CalendarDays,
    },
  ];

  const currentNavItem =
    navItems.find((item) => location.pathname.startsWith(item.to)) ?? navItems[0];

  const clubName = language === 'ar' ? eventSettings.clubNameAr : eventSettings.clubNameEn;
  const adminName =
    language === 'ar'
      ? (session?.user.nameAr ?? t('admin.topbar.adminName'))
      : (session?.user.nameEn ?? t('admin.topbar.adminName'));
  const adminRole =
    language === 'ar'
      ? (session?.user.roleAr ?? t('admin.topbar.adminRole'))
      : (session?.user.roleEn ?? t('admin.topbar.adminRole'));

  const handleLogout = async () => {
    await logout();
    showToast(t('auth.logoutSuccess'), 'info');
    navigate('/admin/login', { replace: true });
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
  };

  return (
    <div className="min-h-screen bg-[#E8F0FA] flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0D2540]/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Executive Deep Navy Sidebar */}
      <aside
        aria-label="Admin sidebar navigation"
        className={`fixed top-0 bottom-0 start-0 z-50 w-60 lg:w-52 xl:w-60 bg-gradient-to-b from-[#0D2540] via-[#12365C] to-[#16416E] text-white border-e border-[#1F4E7E] shadow-[4px_0_24px_rgba(13,37,64,0.16)] flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? 'translate-x-0'
            : 'ltr:-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0 lg:ltr:translate-x-0'
        }`}
      >
        <div className="flex flex-col overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between gap-2 px-3.5 py-3.5 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-0.5 bg-white rounded-lg shadow-sm shrink-0">
                <ClubLogo size="md" className="w-8 h-8 rounded-md" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] text-white font-bold truncate">{clubName}</span>
                <span className="text-[10.5px] text-[#F5C928] font-medium truncate">
                  {t('admin.sidebar.subtitle')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label={t('common.close')}
              className="lg:hidden p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1 px-2.5 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all ${
                      isActive
                        ? 'bg-[#F5C928] text-[#12365C] shadow-[0_4px_14px_rgba(245,201,40,0.3)] font-bold'
                        : 'text-white/85 hover:bg-white/10 hover:text-white font-medium'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Admin Profile + Logout */}
        <div className="p-2.5 m-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between gap-2 backdrop-blur-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#F5C928] text-[#12365C] flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
              {adminName.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-white font-semibold truncate">{adminName}</span>
              <span className="text-[10.5px] text-[#CBDDF2] truncate">{adminRole}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            data-testid="sidebar-logout-btn"
            title={t('auth.logout')}
            aria-label={t('auth.logout')}
            className="text-white/80 hover:text-[#FCA5A5] transition-colors flex items-center justify-center p-1.5 rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ps-52 xl:ps-60 flex flex-col min-w-0">
        {/* Top Sticky Header */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-md shadow-[0_2px_12px_rgba(18,54,92,0.06)] border-b border-[#C5D8EE] z-30">
          <div
            className="h-[3px] w-full bg-gradient-to-r from-[#12365C] via-[#1769B5] to-[#F5C928]"
            aria-hidden="true"
          />
          <div className="h-[52px] flex items-center justify-between px-3.5 sm:px-5 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label={t('nav.openMenu')}
                className="lg:hidden p-2 rounded-lg text-[#12365C] bg-[#EDF4FC] border border-[#C5D8EE] hover:bg-[#DCE9F8] cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0">
                <span className="type-label-sm text-[#64748B] hidden sm:inline font-medium">
                  {t('admin.topbar.home')}
                </span>
                <span className="type-label-sm text-[#94A3B8] hidden sm:inline">/</span>
                <span className="type-label-md text-[#12365C] font-bold truncate">
                  {currentNavItem.label}
                </span>
              </nav>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <LanguageSwitcher compact className="hidden sm:inline-flex" />

              <Link
                to="/"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF5FC] border border-[#BBD0E8] hover:bg-[#1769B5] hover:text-white hover:border-[#1769B5] text-[#12365C] font-bold text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('admin.topbar.previewSite')}</span>
              </Link>

              {/* Notifications Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  aria-label={t('admin.topbar.notifications')}
                  aria-expanded={notifOpen}
                  data-testid="notifications-bell-btn"
                  className="relative p-2 rounded-lg text-[#12365C] bg-[#F4F8FD] border border-[#D4E2F4] hover:bg-[#E5EFFA] transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-1.5 end-1.5 w-2.5 h-2.5 bg-[#F5C928] rounded-full ring-2 ring-white"
                      aria-label={`${unreadCount} unread`}
                    />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute end-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-xl border border-[#C5D8EE] overflow-hidden z-50">
                    <div className="px-4 py-3 bg-[#EFF5FC] flex items-center justify-between border-b border-[#D4E2F4]">
                      <span className="type-label-md text-[#12365C] font-bold">
                        {t('admin.topbar.notifications')}
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => void handleMarkAllRead()}
                          className="type-label-sm text-[#1769B5] font-semibold hover:underline cursor-pointer"
                        >
                          {t('admin.topbar.markAllRead')}
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#E4EDF7]">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-center type-body-sm text-[#52637A]">
                          {t('admin.topbar.noNotifications')}
                        </p>
                      ) : (
                        notifications.slice(0, 6).map((notif) => (
                          <button
                            key={notif.id}
                            type="button"
                            onClick={async () => {
                              await notificationService.markAsRead(notif.id);
                              setNotifOpen(false);
                              navigate('/admin/registrations');
                            }}
                            className={`w-full text-start p-3.5 hover:bg-[#F3F8FE] transition-colors flex flex-col gap-1 cursor-pointer ${
                              !notif.isRead ? 'bg-[#DBEAFE]/40' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="type-label-md text-[#12365C] font-semibold">
                                {language === 'ar' ? notif.titleAr : notif.titleEn}
                              </span>
                              {!notif.isRead && (
                                <span className="w-2 h-2 rounded-full bg-[#1769B5] shrink-0" />
                              )}
                            </div>
                            <p className="type-body-sm text-[#475569]">
                              {language === 'ar' ? notif.messageAr : notif.messageEn}
                            </p>
                            <span className="type-label-sm text-[#64748B]">
                              {formatRelativeDate(notif.createdAt, language)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  aria-expanded={profileMenuOpen}
                  className="flex items-center gap-2 p-1 pe-2 rounded-xl bg-[#F4F8FD] border border-[#D4E2F4] hover:bg-[#E5EFFA] transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#12365C] text-[#F5C928] flex items-center justify-center type-label-sm font-bold">
                    {adminName.charAt(0)}
                  </div>
                  <span className="type-label-md text-[#12365C] font-semibold hidden sm:inline">
                    {adminName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[#52637A]" aria-hidden="true" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute end-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-[#C5D8EE] py-1.5 z-50">
                    <div className="px-3.5 py-2 border-b border-[#E4EDF7]">
                      <p className="type-label-md text-[#12365C] font-bold">{adminName}</p>
                      <p className="type-label-sm text-[#52637A] truncate" dir="ltr">
                        {session?.user.email}
                      </p>
                    </div>
                    <Link
                      to="/"
                      className="flex items-center gap-2 px-3.5 py-2 type-label-sm text-[#12365C] hover:bg-[#EFF5FC]"
                    >
                      <ExternalLink className="w-4 h-4 text-[#1769B5]" aria-hidden="true" />
                      <span>{t('admin.topbar.previewSite')}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      data-testid="topbar-logout-btn"
                      className="w-full flex items-center gap-2 px-3.5 py-2 type-label-sm text-[#DC2626] hover:bg-[#FEE2E2]/60 font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      <span>{t('auth.logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full px-3.5 sm:px-5 py-3.5 sm:py-4 max-w-[1380px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
