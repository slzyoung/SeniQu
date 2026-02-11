/**
 * Protected Route Component - Role-based route protection
 */

import React, { Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { UserRole, ROUTES } from '../../lib/constants';
import { getDashboardRoute } from '../../lib/utils';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: UserRole[];
    requireAuth?: boolean;
    redirectTo?: string;
    fallback?: React.ReactNode;
}

// Loading fallback for lazy-loaded pages
function PageLoader() {
    return (
        <div className="min-h-screen bg-theme-bg flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
                <p className="text-theme-muted">Loading...</p>
            </div>
        </div>
    );
}

import { needsProfileCompletion } from '../../lib/authHelpers';

export function ProtectedRoute({
    children,
    roles = [],
    requireAuth = true,
    redirectTo = ROUTES.HOME, // Redirect to home page, AuthModal will be used for login
    fallback = <PageLoader />,
}: ProtectedRouteProps) {
    const { isAuthenticated, user, isLoading } = useAuthStore();
    const location = useLocation();

    // Show loading while checking auth state
    if (isLoading) {
        return <>{fallback}</>;
    }

    // Check authentication
    if (requireAuth && !isAuthenticated) {
        // Save attempted URL for redirect after login
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // If authenticated but user object is incomplete (no role), show loading
    // This can happen during rehydration race conditions
    if (requireAuth && isAuthenticated && (!user || !user.role)) {
        return <>{fallback}</>;
    }

    // Check role-based access
    if (roles.length > 0 && user) {
        const hasRequiredRole = roles.includes(user.role as UserRole);

        if (!hasRequiredRole) {
            // Redirect using centralized logic
            const defaultRedirect = getDashboardRoute(user.role);
            return <Navigate to={defaultRedirect} replace />;
        }
    }

    // Enforce Profile Completion
    // If user is authenticated but missing details, force them to complete profile
    if (user && needsProfileCompletion(user)) {
        // Prevent redirect loop if already on complete-profile
        if (location.pathname !== '/complete-profile') {
            return <Navigate to="/complete-profile" replace />;
        }
    }

    return (
        <Suspense fallback={fallback}>
            {children}
        </Suspense>
    );
}

// Wrapper for public-only routes (redirect if already authenticated)
interface PublicOnlyRouteProps {
    children: React.ReactNode;
    redirectTo?: string;
}

export function PublicOnlyRoute({
    children,
    redirectTo,
}: PublicOnlyRouteProps) {
    const { isAuthenticated, user, isLoading } = useAuthStore();
    const location = useLocation();

    if (isLoading) {
        return <PageLoader />;
    }

    if (isAuthenticated && user) {
        // Check if there's a saved redirect location
        const from = (location.state as { from?: Location })?.from;

        if (from) {
            return <Navigate to={from.pathname} replace />;
        }

        // Check profile completion
        if (needsProfileCompletion(user)) {
            return <Navigate to="/complete-profile" replace />;
        }

        // Otherwise redirect based on role
        const defaultRedirect = redirectTo || getDashboardRoute(user.role);
        return <Navigate to={defaultRedirect} replace />;
    }

    return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// Lazy load wrapper with loading state
interface LazyLoaderProps {
    children: React.ReactNode;
}

export function LazyLoader({ children }: LazyLoaderProps) {
    return (
        <Suspense fallback={<PageLoader />}>
            {children}
        </Suspense>
    );
}

export default ProtectedRoute;
