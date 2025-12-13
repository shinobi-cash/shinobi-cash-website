/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-2 py-2 sm:px-3 sm:py-3 bg-app-background">
          <div className="max-w-xs sm:max-w-md w-full text-center space-y-8 bg-app-surface rounded-2xl shadow-lg p-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-app-primary font-sans">Something went wrong</h1>
              <p className="text-base text-app-secondary">
                The app encountered an unexpected error. Please try refreshing the page.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-2">
                <p className="text-sm text-red-700 dark:text-red-300 font-mono">{this.state.error.message}</p>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full h-12" size="lg">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                }}
                className="w-full h-10"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
