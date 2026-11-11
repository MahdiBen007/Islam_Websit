import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-[100] flex flex-col gap-2 w-max max-w-[92vw] pointer-events-none"
      >
        {toasts.map((toast) => {
          const isError = toast.variant === 'error';
          const isInfo = toast.variant === 'info';
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border transition-all ${
                isError
                  ? 'bg-error text-on-error border-error'
                  : isInfo
                    ? 'bg-secondary text-on-secondary border-secondary'
                    : 'bg-primary text-on-primary border-primary-container'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                {isError ? (
                  <AlertCircle className="w-4 h-4" />
                ) : isInfo ? (
                  <Info className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-tertiary-fixed" />
                )}
              </span>
              <span className="type-label-md font-medium">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
