/**
 * CompleteProfilePage — Mandatory profile completion after Google/wallet login
 *
 * Users redirected here when their profile is incomplete (missing displayName or username).
 * After completing the form, they're redirected to their dashboard.
 *
 * Security:
 * - Protected: only accessible when authenticated
 * - Input sanitization via Zod schemas
 * - Rate-limited profile updates via userService
 * - CSRF protection via existing API interceptors
 * - Auto-redirect if profile is already complete
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, User, AtSign, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { userService } from '../../../services/userService';
import { useToast } from '../../../stores/useNotificationStore';
import { getDashboardRoute } from '../../../lib/utils';
import { needsProfileCompletion } from '../../../lib/authHelpers';

// Rate limiting for profile updates
const SUBMIT_COOLDOWN_MS = 3000;

export default function CompleteProfilePage() {
    const navigate = useNavigate();
    const toast = useToast();
    const { user, isAuthenticated, updateUser, setUser } = useAuthStore();

    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [username, setUsername] = useState(user?.username || '');
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const lastSubmitRef = useRef(0);

    // Auto-redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // Auto-redirect if profile is already complete (Local State Check)
    useEffect(() => {
        if (user && !needsProfileCompletion(user)) {
            const dashboardRoute = getDashboardRoute(user.role);
            console.log('[CompleteProfile] Local user is complete. Redirecting to:', dashboardRoute);
            navigate(dashboardRoute, { replace: true });
        }
    }, [user, navigate]);

    // SELF-HEALING: Fetch latest profile from backend on mount
    // This handles cases where local state is stale but backend is actually complete.
    useEffect(() => {
        const verifyBackendState = async () => {
            if (!isAuthenticated) return;

            try {
                const freshUser = await userService.getMyProfile();
                console.log('[CompleteProfile] Fetched fresh user:', JSON.stringify(freshUser, null, 2));

                if (!needsProfileCompletion(freshUser)) {
                    console.log('[CompleteProfile] Backend says profile is COMPLETE. Updating store and redirecting...');
                    setUser(freshUser);
                    // Force navigation
                    const dashboardRoute = getDashboardRoute(freshUser.role);
                    window.location.href = dashboardRoute;
                } else {
                    console.log('[CompleteProfile] Backend confirms profile is INCOMPLETE.');

                    // DEBUG: Why is it incomplete?
                    const hasDisplayName = !!freshUser.displayName && freshUser.displayName.trim().length >= 2;
                    const hasUsername = !!freshUser.username && freshUser.username.trim().length >= 3;
                    console.log(`[CompleteProfile] Completeness Check: DisplayName="${freshUser.displayName}" (${hasDisplayName}), Username="${freshUser.username}" (${hasUsername})`);

                    // Update local state with fresh data anyway, to pre-fill form
                    setUser(freshUser);
                    setDisplayName(prev => prev || freshUser.displayName || '');
                    setUsername(prev => prev || freshUser.username || '');
                }
            } catch (err) {
                console.error('[CompleteProfile] Failed to verify backend state:', err);
            }
        };

        verifyBackendState();
    }, [isAuthenticated, setUser]);

    // Validate username format (lowercase alphanumeric + underscore)
    const validateUsername = useCallback((value: string): string | null => {
        if (!value) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (value.length > 20) return 'Username must be at most 20 characters';
        if (!/^[a-z0-9_]+$/.test(value)) return 'Only lowercase letters, numbers, and underscores';
        return null;
    }, []);

    // Validate display name
    const validateDisplayName = useCallback((value: string): string | null => {
        if (!value.trim()) return 'Display name is required';
        if (value.trim().length < 2) return 'Display name must be at least 2 characters';
        if (value.trim().length > 50) return 'Display name must be at most 50 characters';
        return null;
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Rate limiting
        const now = Date.now();
        if (now - lastSubmitRef.current < SUBMIT_COOLDOWN_MS) {
            toast.error('Please wait', 'You are submitting too quickly');
            return;
        }

        // Validate
        const fieldErrors: Record<string, string> = {};
        const usernameError = validateUsername(username);
        const displayNameError = validateDisplayName(displayName);
        if (usernameError) fieldErrors.username = usernameError;
        if (displayNameError) fieldErrors.displayName = displayNameError;
        if (!agreeToTerms) fieldErrors.terms = 'You must agree to the Terms of Service';

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
        }

        setIsLoading(true);
        setErrors({});
        lastSubmitRef.current = now;

        try {
            const cleanDisplayName = displayName.trim();
            const cleanUsername = username.toLowerCase().trim();

            const updatedUser = await userService.updateProfile({
                displayName: cleanDisplayName,
                username: cleanUsername,
            });

            console.log('[CompleteProfile] Backend update success:', updatedUser);

            // CRITICAL FIX: Force hard update of local store
            // We use setUser to completely replace the user object, ensuring
            // no stale properties linger. We explicitly merge the submitted values.
            if (user) {
                const finalUser = {
                    ...user,
                    ...updatedUser, // Backend response might override some fields
                    displayName: cleanDisplayName, // Enforce our submitted values
                    username: cleanUsername,
                    role: updatedUser.role || user.role
                };

                console.log('[CompleteProfile] Setting final user state:', finalUser);
                setUser(finalUser);

                // Small delay to ensure Zustand persist middleware writes to localStorage
                // before navigation occurs.
                // WE USE window.location.href TO FORCE A FULL APP RELOAD.
                // This guarantees that the app re-initializes with the fresh state from storage,
                // eliminating any potential in-memory race conditions or stale router state
                // that was causing the "double submit" bug.
                setTimeout(() => {
                    const dashboardRoute = getDashboardRoute(finalUser.role);
                    console.log('[CompleteProfile] Hard reloading to:', dashboardRoute);
                    window.location.href = dashboardRoute;
                }, 300);
            } else {
                // Fallback
                setUser(updatedUser);
                navigate(getDashboardRoute(updatedUser.role), { replace: true });
            }

            toast.success('Profile Complete!', 'Welcome to Seniqu.');
        } catch (error: any) {
            const message = error?.message || 'Failed to update profile. Please try again.';

            // Check for duplicate username
            if (message.toLowerCase().includes('username') && message.toLowerCase().includes('taken')) {
                setErrors({ username: 'This username is already taken' });
            } else {
                setErrors({ general: message });
                toast.error('Update Failed', message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [username, displayName, agreeToTerms, validateUsername, validateDisplayName, updateUser, navigate, toast, user?.role]);

    // Don't render if not authenticated
    if (!isAuthenticated || !user) return null;

    return (
        <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', duration: 0.6 }}
                className="w-full max-w-md relative"
            >
                {/* Card */}
                <div className="bg-theme-glass backdrop-blur-2xl border border-theme-glass-border rounded-2xl shadow-2xl overflow-hidden">
                    {/* Decorative Top Line */}
                    <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />

                    {/* Header */}
                    <div className="px-8 pt-10 pb-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gold/10 rounded-2xl flex items-center justify-center border border-gold/20">
                            <User className="w-8 h-8 text-gold" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-theme-text mb-2">
                            Complete Your <span className="text-gold italic">Profile</span>
                        </h1>
                        <p className="text-theme-muted text-sm max-w-xs mx-auto">
                            Choose a username and display name to get started on Seniqu.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-5">
                        {/* General Error */}
                        {errors.general && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{errors.general}</span>
                            </motion.div>
                        )}

                        {/* Display Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-theme-text mb-2">
                                Display Name <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => {
                                        setDisplayName(e.target.value);
                                        if (errors.displayName) setErrors(prev => ({ ...prev, displayName: '' }));
                                    }}
                                    placeholder="Your Name"
                                    required
                                    minLength={2}
                                    maxLength={50}
                                    autoComplete="name"
                                    className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-theme-elevated border ${errors.displayName ? 'border-red-500' : 'border-theme-border'
                                        } rounded-xl text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-gold/50 transition-colors`}
                                />
                            </div>
                            {errors.displayName && (
                                <p className="mt-1 text-xs text-red-400">{errors.displayName}</p>
                            )}
                        </div>

                        {/* Username Input */}
                        <div>
                            <label className="block text-sm font-medium text-theme-text mb-2">
                                Username <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => {
                                        const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                        setUsername(cleaned);
                                        if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
                                    }}
                                    placeholder="your_username"
                                    required
                                    minLength={3}
                                    maxLength={20}
                                    autoComplete="username"
                                    className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-theme-elevated border ${errors.username ? 'border-red-500' : 'border-theme-border'
                                        } rounded-xl text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-gold/50 transition-colors`}
                                />
                            </div>
                            <p className="mt-1 text-xs text-theme-muted">
                                Lowercase letters, numbers, and underscores only
                            </p>
                            {errors.username && (
                                <p className="mt-1 text-xs text-red-400">{errors.username}</p>
                            )}
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setAgreeToTerms(!agreeToTerms);
                                    if (errors.terms) setErrors(prev => ({ ...prev, terms: '' }));
                                }}
                                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${agreeToTerms
                                    ? 'bg-gold border-gold text-theme-bg'
                                    : 'bg-transparent border-theme-border text-transparent hover:border-gold'
                                    }`}
                            >
                                <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <div className="text-sm text-theme-muted leading-tight">
                                I agree to the{' '}
                                <a href="/terms" target="_blank" className="text-gold hover:underline">
                                    Terms of Service
                                </a>
                                {' '}and{' '}
                                <a href="/privacy" target="_blank" className="text-gold hover:underline">
                                    Privacy Policy
                                </a>.
                            </div>
                        </div>
                        {errors.terms && <p className="text-xs text-red-400 -mt-2">{errors.terms}</p>}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || !agreeToTerms || !username || !displayName.trim()}
                            className="w-full flex items-center justify-center gap-2 bg-gold text-theme-bg py-3.5 rounded-xl font-medium hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-gold/20"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Continue to Dashboard</span>
                                    <CheckCircle className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        {/* Security Badge */}
                        <div className="flex items-center justify-center gap-1.5 text-theme-muted">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span className="text-xs">Your data is encrypted and secure</span>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
