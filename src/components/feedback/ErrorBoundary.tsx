import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl shadow-lg p-8 text-center flex flex-col items-center gap-4 border border-outline-variant/30">
            <div className="w-14 h-14 rounded-full bg-error-container text-error flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h1 className="type-headline-md text-primary font-bold">
              حدث خطأ غير متوقع / Unexpected Error
            </h1>
            <p className="type-body-sm text-on-surface-variant">{this.state.errorMessage}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary type-label-md hover:bg-secondary transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل الصفحة / Reload</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
