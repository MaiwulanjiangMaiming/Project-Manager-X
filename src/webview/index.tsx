import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const vscode = (window as any).acquireVsCodeApi?.();
    vscode?.postMessage({
      type: 'error:report',
      data: { message: error.message, stack: error.stack }
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-errorForeground)' }}>
          <h3>Something went wrong</h3>
          <p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '12px',
              padding: '6px 14px',
              border: '1px solid var(--vscode-focusBorder)',
              borderRadius: '4px',
              background: 'transparent',
              color: 'var(--vscode-focusBorder)',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
