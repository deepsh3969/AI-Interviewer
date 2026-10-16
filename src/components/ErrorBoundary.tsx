import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './ui.js';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Top-level error boundary: keeps a crashed page from taking down the whole shell. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl py-12">
          <ErrorState
            title="This page hit an unexpected error"
            description={
              this.state.error.message ||
              'Something failed while rendering. Your saved interview data is stored locally and was not affected.'
            }
            onRetry={() => this.setState({ error: null })}
          />
          <button
            type="button"
            className="btn-ghost mt-3 text-sm"
            onClick={() => {
              window.location.href = '/dashboard';
            }}
          >
            Back to dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
