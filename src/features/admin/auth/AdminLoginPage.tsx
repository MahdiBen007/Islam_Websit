import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  Home,
  Info,
  KeyRound,
  Lock,
  Mail,
  Send,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { ClubLogo } from '@/components/common/ClubLogo';
import { DirectionalArrow } from '@/components/common/DirectionalArrow';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useLanguage } from '@/hooks/useLanguage';
import {
  authService,
  DEMO_ADMIN_CREDENTIALS,
  getRememberedAdminEmail,
} from '@/services/auth/authService';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'auth.emailRequired')
    .email('auth.emailInvalid'),
  password: z.string().min(1, 'auth.passwordRequired'),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const forgotSchema = z.object({
  recoveryEmail: z
    .string()
    .trim()
    .min(1, 'auth.emailRequired')
    .email('auth.emailInvalid'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export function AdminLoginPage() {
  const { isAuthenticated, login } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const fromPath =
    (location.state as { from?: string } | null)?.from || '/admin/dashboard';

  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !loginSuccess) {
      navigate(fromPath, { replace: true });
    }
  }, [isAuthenticated, loginSuccess, navigate, fromPath]);

  const rememberedEmail = getRememberedAdminEmail();

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    setValue: setLoginValue,
    formState: { errors: loginErrors, isSubmitting: isLoggingIn },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberedEmail,
      password: '',
      rememberMe: Boolean(rememberedEmail),
    },
  });

  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    reset: resetForgot,
    formState: { errors: forgotErrors, isSubmitting: isSendingRecovery },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      recoveryEmail: '',
    },
  });

  const onLogin = async (values: LoginFormValues) => {
    setAuthError(null);
    try {
      await login(values.email, values.password, values.rememberMe);
      setLoginSuccess(true);
      showToast(t('auth.loginSuccessToast'), 'success');
      navigate(fromPath, { replace: true });
    } catch {
      setAuthError(t('auth.invalidCredentials'));
    }
  };

  const onForgotSubmit = async (values: ForgotFormValues) => {
    setRecoverySent(false);
    await authService.requestPasswordReset(values.recoveryEmail);
    setRecoverySent(true);
    resetForgot();
  };

  const fillDemoCredentials = () => {
    setLoginValue('email', DEMO_ADMIN_CREDENTIALS.email, { shouldValidate: true });
    setLoginValue('password', DEMO_ADMIN_CREDENTIALS.password, { shouldValidate: true });
    setAuthError(null);
  };

  return (
    <div className="min-h-screen bg-background relative flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10">
      {/* Top Quick Bar */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-lowest text-primary hover:bg-surface-container-low shadow-2xs border border-outline-variant/25 type-label-md transition-colors"
        >
          <Home className="w-4 h-4 text-secondary" aria-hidden="true" />
          <span>{t('common.backToPublic')}</span>
        </Link>
        <LanguageSwitcher />
      </div>

      {/* Main Split Shell Container */}
      <div className="w-full max-w-6xl bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 lg:min-h-[640px] border border-outline-variant/25">
        {/* Branding Panel (Right in RTL, Left in LTR) */}
        <div className="lg:col-span-5 relative bg-gradient-to-br from-primary-container via-primary to-primary text-on-primary p-5 sm:p-8 lg:p-10 flex flex-col justify-between overflow-hidden">
          <div
            className="absolute -top-20 -start-20 w-72 h-72 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 -end-20 w-80 h-80 rounded-full bg-tertiary-fixed/15 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Top Brand */}
          <div className="relative z-10 flex flex-col gap-3.5 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-1.5 sm:p-2 bg-surface-container-lowest rounded-xl shadow-md flex items-center justify-center">
                <ClubLogo size="md" className="w-9 h-9 sm:w-10 sm:h-10" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:type-headline-sm text-surface-container-lowest font-bold leading-tight">
                  {t('common.clubName')}
                </span>
                <span className="text-xs sm:type-label-sm text-secondary-fixed opacity-90 mt-0.5">
                  {t('auth.brandSubtitle')}
                </span>
              </div>
            </div>

            <div className="mt-1 sm:mt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest/10 backdrop-blur-md text-tertiary-fixed mb-2 sm:mb-3">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                <span className="text-xs sm:type-label-md font-medium">{t('auth.supervisorsBadge')}</span>
              </div>
              <h1 className="text-xl sm:type-headline-lg text-surface-container-lowest font-bold flex items-center gap-2">
                <span>{t('auth.welcomeTitle')}</span>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full bg-tertiary-fixed animate-pulse"
                  aria-hidden="true"
                />
              </h1>
              <p className="hidden sm:block text-xs sm:type-body-md text-secondary-fixed/90 mt-1.5 sm:mt-2.5 leading-relaxed">
                {t('auth.welcomeDesc')}
              </p>
            </div>
          </div>

          {/* Middle Feature Highlights */}
          <div className="relative z-10 my-6 lg:my-8 hidden sm:flex flex-col gap-3">
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-surface-container-lowest/10 backdrop-blur-xs">
              <div className="w-10 h-10 rounded-lg bg-surface-container-lowest/15 flex items-center justify-center text-tertiary-fixed shrink-0">
                <UserCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="type-label-lg font-bold text-surface-container-lowest">
                  {t('auth.feature1Title')}
                </span>
                <span className="type-body-sm text-secondary-fixed/85 truncate">
                  {t('auth.feature1Desc')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-surface-container-lowest/10 backdrop-blur-xs">
              <div className="w-10 h-10 rounded-lg bg-surface-container-lowest/15 flex items-center justify-center text-tertiary-fixed shrink-0">
                <TrendingUp className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="type-label-lg font-bold text-surface-container-lowest">
                  {t('auth.feature2Title')}
                </span>
                <span className="type-body-sm text-secondary-fixed/85 truncate">
                  {t('auth.feature2Desc')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-surface-container-lowest/10 backdrop-blur-xs">
              <div className="w-10 h-10 rounded-lg bg-surface-container-lowest/15 flex items-center justify-center text-tertiary-fixed shrink-0">
                <SlidersHorizontal className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="type-label-lg font-bold text-surface-container-lowest">
                  {t('auth.feature3Title')}
                </span>
                <span className="type-body-sm text-secondary-fixed/85 truncate">
                  {t('auth.feature3Desc')}
                </span>
              </div>
            </div>
          </div>

          {/* Footer SSL & Version */}
          <div className="relative z-10 pt-3 sm:pt-4 mt-3 sm:mt-0 hidden sm:flex items-center justify-between text-secondary-fixed/80">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-tertiary-fixed" aria-hidden="true" />
              <span className="type-label-sm">{t('auth.sslBadge')}</span>
            </div>
            <span className="type-label-sm bg-surface-container-lowest/10 px-2.5 py-0.5 rounded-full font-mono">
              v2.4
            </span>
          </div>
        </div>

        {/* Form Panel (Left in RTL, Right in LTR) */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-5 sm:p-10 lg:p-14 flex flex-col justify-center">
          {view === 'login' ? (
            <div className="w-full max-w-lg mx-auto">
              <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-surface-container-low text-secondary text-xs sm:type-label-md font-bold tracking-wide">
                  {t('auth.portalBadgeEn')}
                </span>
                <span
                  className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-secondary"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline type-label-md text-on-surface-variant font-medium">
                  {t('auth.portalBadgeAr')}
                </span>
              </div>

              <h2 className="text-xl sm:type-headline-lg text-on-surface font-bold mb-3 sm:mb-0">
                {t('auth.loginTitle')}
              </h2>
              <p className="hidden sm:block type-body-md text-on-surface-variant mt-1.5 mb-6">
                {t('auth.loginSubtitle')}
              </p>

              {/* Error Banner */}
              {authError && (
                <div
                  role="alert"
                  data-testid="login-error-alert"
                  className="mb-5 p-3.5 rounded-xl bg-error-container text-on-error-container flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-error shrink-0" aria-hidden="true" />
                  <span className="type-body-sm font-medium">{authError}</span>
                </div>
              )}

              {/* Success Banner */}
              {loginSuccess && (
                <div
                  role="status"
                  className="mb-5 p-3.5 rounded-xl bg-surface-container text-secondary flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className="type-body-sm font-bold">{t('auth.loginSuccessToast')}</span>
                </div>
              )}

              <form
                noValidate
                onSubmit={handleLoginSubmit(onLogin)}
                className="flex flex-col gap-5"
                data-testid="admin-login-form"
              >
                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="adminEmail"
                    className="type-label-lg font-medium text-on-surface flex items-center gap-1"
                  >
                    <span>{t('auth.emailLabel')}</span>
                    <span className="text-error">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute right-3.5 flex items-center pointer-events-none text-on-surface-variant">
                      <Mail className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <input
                      id="adminEmail"
                      type="email"
                      dir="ltr"
                      autoComplete="email"
                      placeholder={t('auth.emailPlaceholder')}
                      aria-invalid={Boolean(loginErrors.email)}
                      {...registerLogin('email')}
                      className="w-full h-12 pr-11 pl-4 rounded-xl bg-surface-container-low text-on-surface text-left type-body-md placeholder:text-outline border border-outline-variant/40 focus:outline-none focus:bg-surface-container-lowest focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/15 transition-all"
                    />
                  </div>
                  {loginErrors.email?.message && (
                    <span role="alert" className="type-label-sm text-error flex items-center gap-1">
                      <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{t(loginErrors.email.message)}</span>
                    </span>
                  )}
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="adminPassword"
                    className="type-label-lg font-medium text-on-surface flex items-center gap-1"
                  >
                    <span>{t('auth.passwordLabel')}</span>
                    <span className="text-error">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute right-3.5 flex items-center pointer-events-none text-on-surface-variant">
                      <Lock className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <input
                      id="adminPassword"
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      autoComplete="current-password"
                      placeholder={t('auth.passwordPlaceholder')}
                      aria-invalid={Boolean(loginErrors.password)}
                      {...registerLogin('password')}
                      className="w-full h-12 pr-11 pl-11 rounded-xl bg-surface-container-low text-on-surface text-left type-body-md placeholder:text-outline border border-outline-variant/40 focus:outline-none focus:bg-surface-container-lowest focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={t('auth.togglePasswordLabel')}
                      data-testid="toggle-password-visibility"
                      className="absolute left-3.5 flex items-center text-outline hover:text-on-surface cursor-pointer p-1 rounded"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <Eye className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {loginErrors.password?.message && (
                    <span role="alert" className="type-label-sm text-error flex items-center gap-1">
                      <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{t(loginErrors.password.message)}</span>
                    </span>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      id="rememberMe"
                      type="checkbox"
                      {...registerLogin('rememberMe')}
                      className="w-4 h-4 rounded text-secondary bg-surface-container-low cursor-pointer accent-secondary"
                    />
                    <span className="type-body-sm text-on-surface font-medium">
                      {t('auth.rememberMe')}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setRecoverySent(false);
                      setView('forgot');
                    }}
                    data-testid="forgot-password-btn"
                    className="type-label-lg text-secondary hover:text-primary transition-colors cursor-pointer"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  data-testid="admin-login-submit"
                  className="w-full h-12 mt-1 rounded-xl bg-primary hover:bg-secondary text-on-primary type-label-lg font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-65"
                >
                  {isLoggingIn ? (
                    <>
                      <span
                        className="w-5 h-5 border-2 border-on-primary/30 border-t-tertiary-fixed rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      <span>{t('auth.loggingIn')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('auth.loginButton')}</span>
                      <DirectionalArrow className="w-5 h-5" direction="forward" />
                    </>
                  )}
                </button>

                {/* Demo Credentials Hint */}
                <div className="bg-surface-container-low/80 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-on-surface-variant type-label-sm border border-outline-variant/25">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-tertiary" aria-hidden="true" />
                    <span>{t('auth.demoCredentialsLabel')}</span>
                  </span>
                  <button
                    type="button"
                    onClick={fillDemoCredentials}
                    dir="ltr"
                    title={language === 'ar' ? 'انقر لملء بيانات الدخول' : 'Click to fill demo credentials'}
                    className="font-mono text-secondary font-bold hover:underline cursor-pointer"
                  >
                    {DEMO_ADMIN_CREDENTIALS.email} / {DEMO_ADMIN_CREDENTIALS.password}
                  </button>
                </div>

                {/* Security Assurance Note */}
                <div className="hidden sm:flex mt-1 items-start gap-2 text-outline">
                  <Shield className="w-4 h-4 text-secondary shrink-0 mt-1" aria-hidden="true" />
                  <p className="type-body-sm leading-relaxed">{t('auth.securityNote')}</p>
                </div>
              </form>
            </div>
          ) : (
            /* Forgot Password View */
            <div className="w-full max-w-lg mx-auto">
              <button
                type="button"
                onClick={() => setView('login')}
                className="inline-flex items-center gap-1.5 type-label-lg text-secondary hover:text-primary mb-6 transition-colors cursor-pointer"
              >
                <DirectionalArrow className="w-4 h-4" direction="back" />
                <span>{t('auth.backToLogin')}</span>
              </button>

              <div className="w-12 h-12 rounded-xl bg-surface-container-low text-secondary flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6" aria-hidden="true" />
              </div>

              <h2 className="type-headline-lg text-on-surface font-bold">
                {t('auth.forgotTitle')}
              </h2>
              <p className="type-body-md text-on-surface-variant mt-1.5 mb-6">
                {t('auth.forgotSubtitle')}
              </p>

              {recoverySent && (
                <div
                  role="status"
                  data-testid="forgot-success-alert"
                  className="mb-6 p-4 rounded-xl bg-surface-container text-secondary flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span className="type-label-lg font-bold">
                      {t('auth.recoverySuccessTitle')}
                    </span>
                    <span className="type-body-sm">{t('auth.recoverySuccessDesc')}</span>
                  </div>
                </div>
              )}

              <form
                noValidate
                onSubmit={handleForgotSubmit(onForgotSubmit)}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="recoveryEmail"
                    className="type-label-lg font-medium text-on-surface flex items-center gap-1"
                  >
                    <span>{t('auth.recoveryEmailLabel')}</span>
                    <span className="text-error">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute right-3.5 flex items-center pointer-events-none text-on-surface-variant">
                      <AtSign className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <input
                      id="recoveryEmail"
                      type="email"
                      dir="ltr"
                      placeholder={t('auth.emailPlaceholder')}
                      aria-invalid={Boolean(forgotErrors.recoveryEmail)}
                      {...registerForgot('recoveryEmail')}
                      className="w-full h-12 pr-11 pl-4 rounded-xl bg-surface-container-low text-on-surface text-left type-body-md placeholder:text-outline border border-outline-variant/40 focus:outline-none focus:bg-surface-container-lowest focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/15 transition-all"
                    />
                  </div>
                  {forgotErrors.recoveryEmail?.message && (
                    <span role="alert" className="type-label-sm text-error flex items-center gap-1">
                      <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{t(forgotErrors.recoveryEmail.message)}</span>
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSendingRecovery}
                  className="w-full h-12 rounded-xl bg-secondary hover:bg-primary text-on-secondary type-label-lg font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-65"
                >
                  {isSendingRecovery ? (
                    <>
                      <span
                        className="w-5 h-5 border-2 border-on-secondary/30 border-t-on-secondary rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      <span>{t('auth.sendingRecovery')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('auth.sendRecoveryButton')}</span>
                      <Send className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
