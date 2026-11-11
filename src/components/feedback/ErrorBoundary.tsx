import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unexpected application error.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen flex items-center justify-center bg-surface p-6 text-center"
        >
          <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl p-6 shadow-xl border border-outline-variant/25 flex flex-col items-center gap-3">
            <h1 className="text-xl font-bold text-[#12365C]">حدث خطأ غير متوقع</h1>
            <p className="text-sm text-[#475569]">
              تعذر تحميل هذا القسم حالياً. يرجى تحديث الصفحة للمحاولة مجدداً.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#12365C] hover:bg-[#1769B5] text-white font-bold text-sm cursor-pointer transition-colors"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
