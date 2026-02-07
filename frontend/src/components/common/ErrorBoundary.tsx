/**
 * Error Boundary Component - Catch and display errors gracefully
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // Log error to monitoring service
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleReload = (): void => {
        window.location.reload();
    };

    handleGoHome = (): void => {
        window.location.href = '/';
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-theme-bg flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-theme-text mb-2">
                            Something went wrong
                        </h1>

                        <p className="text-theme-muted mb-6">
                            An unexpected error occurred. Our team has been notified and is working on a fix.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-left">
                                <p className="text-sm font-mono text-red-400 break-all">
                                    {this.state.error.message}
                                </p>
                                {this.state.errorInfo && (
                                    <pre className="mt-2 text-xs text-red-300/70 overflow-auto max-h-32">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button
                                onClick={this.handleReset}
                                variant="secondary"
                                leftIcon={<RefreshCw className="w-4 h-4" />}
                            >
                                Try Again
                            </Button>
                            <Button
                                onClick={this.handleGoHome}
                                variant="primary"
                                leftIcon={<Home className="w-4 h-4" />}
                            >
                                Go Home
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Simple error fallback for smaller sections
export function ErrorFallback({
    message = 'Failed to load this section',
    onRetry
}: {
    message?: string;
    onRetry?: () => void;
}) {
    return (
        <div className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-theme-muted mb-3">{message}</p>
            {onRetry && (
                <Button size="sm" variant="ghost" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </div>
    );
}

export default ErrorBoundary;
