'use client';

import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string; stack?: string };

export default class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, message: String(error?.message || error), stack: String(error?.stack || '') };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('[GlobalErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const dev = process.env.NODE_ENV !== 'production';
      return (
        <div role="alert" className="p-6 text-sm text-red-700 bg-red-50 border border-red-200 m-4 rounded">
          <div className="font-semibold mb-1">Something went wrong.</div>
          {dev ? (
            <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-64">
              {this.state.message}\n{this.state.stack}
            </pre>
          ) : (
            <div>Please check the console for details.</div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
