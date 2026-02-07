/**
 * Registration Page
 * STRICTLY for User/Collector registration.
 * Admin/Artist accounts must be created by SuperAdmin.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, AlertCircle } from 'lucide-react';
import { Card, Button, Input } from '../../../components/ui';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useToast } from '../../../stores/useNotificationStore';
import { ROUTES } from '../../../lib/constants';
import { authService, registerSchema, AuthError } from '../../../services/authService';
import { z } from 'zod';

export function Register() {
    const navigate = useNavigate();
    const { login: storeLogin } = useAuthStore();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // We strictly register as USER
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: '',
        displayName: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        try {
            // Validate with Zod
            const validatedData = registerSchema.parse({
                ...formData,
                role: 'user' // Force role to USER for public registration
            });

            // Call auth service
            const response = await authService.register(validatedData);

            // Update store (log them in immediately)
            storeLogin(response.user, response.accessToken, response.refreshToken);

            toast.success('Welcome to Seniqu!', 'Your account has been created.');

            // Redirect to User Dashboard
            navigate(ROUTES.USER_DASHBOARD, { replace: true });

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
                toast.error('Registration failed', authError.message);
            }
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
                    <h1 className="text-3xl font-serif font-bold text-gold mb-2">Join Seniqu</h1>
                    <p className="text-theme-muted">Start your art collection journey today</p>
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
                            label="Username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="johndoe"
                            leftIcon={<User className="w-4 h-4" />}
                            error={errors.username}
                            required
                        />

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
                            placeholder="Create a strong password"
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

                        <Button
                            type="submit"
                            variant="gold"
                            fullWidth
                            isLoading={isLoading}
                            rightIcon={!isLoading && <ArrowRight className="w-4 h-4" />}
                        >
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-theme-border text-center">
                        <p className="text-theme-muted text-sm">
                            Already have an account?{' '}
                            <Link to={ROUTES.LOGIN} className="text-gold hover:underline">Sign in</Link>
                        </p>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}

export default Register;
