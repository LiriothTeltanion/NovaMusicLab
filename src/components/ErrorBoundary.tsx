import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle: string;
  fallbackMessage: string;
  accentColor: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught an error in a dashboard section:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="glass-panel p-10 rounded-3xl text-center space-y-3 flex flex-col items-center"
          style={{ borderColor: `${this.props.accentColor}40` }}
        >
          <AlertTriangle className="w-8 h-8" style={{ color: this.props.accentColor }} />
          <p className="font-mono text-sm font-bold uppercase tracking-wider" style={{ color: this.props.accentColor }}>
            {this.props.fallbackTitle}
          </p>
          <p className="text-xs text-gray-400 max-w-sm">{this.props.fallbackMessage}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Isolates a crash to the section it happened in instead of blanking the whole app.
 * Pass a `key` from the caller (e.g. the active tab id) so navigating away and back
 * gives the section a fresh mount rather than staying stuck in the error state.
 */
export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const { t, tc } = useApp();
  return (
    <ErrorBoundaryClass
      fallbackTitle={t.errorBoundary.title}
      fallbackMessage={t.errorBoundary.message}
      accentColor={tc.c2}
    >
      {children}
    </ErrorBoundaryClass>
  );
}
