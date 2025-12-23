/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

import { Button } from "@workspace/ui/components/button";
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
        <div className="bg-app-background flex min-h-screen items-center justify-center px-2 py-2 sm:px-3 sm:py-3">
          <div className="bg-app-surface w-full max-w-xs space-y-8 rounded-2xl p-6 text-center shadow-lg sm:max-w-md">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-app-primary font-sans text-2xl font-bold sm:text-3xl">
                Something went wrong
              </h1>
              <p className="text-app-secondary text-base">
                The app encountered an unexpected error. Please try refreshing the page.
              </p>
            </div>

            {this.state.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-700 dark:bg-red-900/20">
                <p className="font-mono text-sm text-red-700 dark:text-red-300">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="h-12 w-full" size="lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                }}
                className="h-10 w-full"
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
