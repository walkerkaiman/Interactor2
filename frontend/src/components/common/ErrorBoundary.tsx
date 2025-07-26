import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen bg-bg-primary flex items-center justify-center p-6"
        >
          <div className="bg-bg-secondary border border-border rounded-lg p-8 max-w-2xl">
            <h1 className="text-2xl font-bold text-text-primary mb-4">
              🚨 Something went wrong
            </h1>
            
            <p className="text-text-secondary mb-6">
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>
            
            {this.state.error && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-text-primary mb-2">
                  Error Details
                </h2>
                <div className="bg-bg-primary border border-border rounded p-4 text-sm font-mono text-text-secondary overflow-auto max-h-40">
                  <div className="mb-2">
                    <strong>Message:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="mt-2 text-xs">{this.state.error.stack}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover transition-colors"
              >
                Refresh Page
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                className="px-4 py-2 bg-bg-primary border border-border text-text-primary rounded hover:bg-bg-tertiary transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
} 