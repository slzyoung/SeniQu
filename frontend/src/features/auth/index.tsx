/**
 * Auth Feature - Login and Callback Pages with Backend Integration
 * OWASP-compliant with proper security measures
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Card, Button, Input } from '../../components/ui';
import { useAuthStore } from '../../stores/useAuthStore';
import { useToast } from '../../stores/useNotificationStore';
import { ROUTES } from '../../lib/constants';
import { getDashboardRoute } from '../../lib/utils';
import { authService, loginSchema, AuthError } from '../../services/authService';
import { z } from 'zod';

// ============================================
// LOGIN PAGE
// ============================================

export function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login: storeLogin } = useAuthStore();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        try {
            // Validate with Zod
            const validatedData = loginSchema.parse(formData);

            // Call auth service
            const response = await authService.login(validatedData);

            // Update store
            storeLogin(response.user, response.accessToken, response.refreshToken);

            toast.success('Welcome back!', 'You have successfully signed in.');


            // Determine redirect path based on role
            const redirectPath = getDashboardRoute(response.user.role);

            const from = (location.state as { from?: Location })?.from?.pathname || redirectPath;
            navigate(from, { replace: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: Record<string, string> = {};
                error.errors.forEach((err) => {
                    const field = err.path[0] as string;
                    fieldErrors[field] = err.message;
                });
                setErrors(fieldErrors);
            } else {
                const authError = error as AuthError;
                setErrors({ general: authError.message });
                toast.error('Login failed', authError.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const authUrl = await authService.initiateGoogleAuth();
            window.location.href = authUrl;
        } catch (error) {
            const authError = error as AuthError;
            toast.error('Google Login Failed', authError.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-gold mb-2">Seniqu</h1>
                    <p className="text-theme-muted">Sign in to continue to your dashboard</p>
                </div>

                <Card variant="elevated" padding="lg">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* General Error */}
                        {errors.general && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{errors.general}</span>
                            </div>
                        )}

                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="you@example.com"
                            leftIcon={<Mail className="w-4 h-4" />}
                            error={errors.email}
                            required
                        />

                        <Input
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            leftIcon={<Lock className="w-4 h-4" />}
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                            error={errors.password}
                            required
                        />

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded border-theme-border" />
                                <span className="text-theme-muted">Remember me</span>
                            </label>
                            <a href="#" className="text-gold hover:underline">Forgot password?</a>
                        </div>

                        <Button
                            type="submit"
                            variant="gold"
                            fullWidth
                            isLoading={isLoading}
                            rightIcon={!isLoading && <ArrowRight className="w-4 h-4" />}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-theme-border text-center">
                        <p className="text-theme-muted text-sm">
                            Don't have an account?{' '}
                            <Link to={ROUTES.REGISTER} className="text-gold hover:underline">Sign up</Link>
                        </p>
                    </div>

                    {/* Social Login */}
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-theme-border" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-theme-surface text-theme-muted">Or continue with</span>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google
                            </Button>
                            <Button variant="outline" className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                </svg>
                                GitHub
                            </Button>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}

// ============================================
// AUTH CALLBACK PAGE
// ============================================

export function AuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login: storeLogin } = useAuthStore();
    const toast = useToast();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    const processedCode = useRef<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const error = searchParams.get('error');

            // Handle OAuth error
            if (error) {
                setStatus('error');
                setErrorMessage(error === 'access_denied'
                    ? 'Authentication was cancelled.'
                    : 'Authentication failed. Please try again.');
                setTimeout(() => navigate(ROUTES.LOGIN), 3000);
                return;
            }

            // Validate code and state
            if (!code || !state) {
                setStatus('error');
                setErrorMessage('Invalid authentication response.');
                setTimeout(() => navigate(ROUTES.LOGIN), 3000);
                return;
            }

            // Prevent double execution (React Strict Mode)
            if (processedCode.current === code) return;
            processedCode.current = code;

            try {
                // Exchange code for tokens
                const response = await authService.handleGoogleCallback(code, state);

                // Update store
                storeLogin(response.user, response.accessToken, response.refreshToken);

                setStatus('success');
                toast.success('Welcome!', 'You have successfully signed in.');

                const redirectPath = getDashboardRoute(response.user.role);
                setTimeout(() => navigate(redirectPath), 1500);
            } catch (error) {
                const authError = error as AuthError;
                setStatus('error');
                setErrorMessage(authError.message || 'Authentication failed.');
                toast.error('Authentication Failed', authError.message);
                setTimeout(() => navigate(ROUTES.LOGIN), 3000);
            }
        };

        handleCallback();
    }, [searchParams, storeLogin, navigate, toast]);

    return (
        <div className="min-h-screen bg-theme-bg flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-8"
            >
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-12 h-12 mx-auto mb-4 text-gold animate-spin" />
                        <p className="text-theme-muted">Completing authentication...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-12 h-12 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-theme-text font-medium mb-2">Authentication successful!</p>
                        <p className="text-theme-muted text-sm">Redirecting to dashboard...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-12 h-12 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-theme-text font-medium mb-2">Authentication failed</p>
                        <p className="text-theme-muted text-sm mb-4">{errorMessage}</p>
                        <p className="text-theme-muted text-xs">Redirecting to login...</p>
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default { Login, AuthCallback };
