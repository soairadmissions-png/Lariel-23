import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lariel Essentials ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] text-[#1E1B18] px-4 text-center">
          <div className="max-w-md p-8 bg-white border border-[#E8DFCF] rounded-2xl shadow-sm">
            <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold">
              Lariel Essentials
            </span>
            <h1 className="mt-3 text-2xl font-serif text-[#181614]">
              A moment of grace
            </h1>
            <p className="mt-2 text-sm text-[#6E645A]">
              We encountered a brief interruption while preparing this page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="mt-6 px-6 py-2.5 bg-[#181614] text-[#FAF8F5] text-xs font-semibold rounded-full hover:bg-[#C5A880] transition-colors"
            >
              Reload Bridal Boutique
            </button>
            {this.state.error && (
              <pre className="mt-4 p-2 bg-[#F5F1EB] text-[11px] text-[#8C6D47] rounded text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
