/**
 * AuthModal Component
 * Secure authentication modal with Google, Email, and Wallet options
 * OWASP-compliant with anti-throttling and validation
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { authService, loginSchema, registerSchema, AuthError } from '../services/authService';
import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from '../stores/useNotificationStore';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { getDashboardRoute } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: AuthView;
}

type AuthView = 'main' | 'email-login' | 'email-register' | 'wallet-select';

type WalletType = 'metamask' | 'phantom' | 'solflare' | 'walletconnect';

const WALLET_OPTIONS: { id: WalletType; name: string; logo: string; description: string }[] = [
  { id: 'phantom', name: 'Phantom', logo: '/images/wallets/phantom.svg', description: 'Solana\'s most popular wallet' },
  { id: 'solflare', name: 'Solflare', logo: '/images/wallets/solflare.svg', description: 'Advanced Solana wallet' },
  { id: 'metamask', name: 'MetaMask', logo: '/images/wallets/metamask.svg', description: 'Multi-chain browser wallet' },
  { id: 'walletconnect', name: 'WalletConnect', logo: '/images/wallets/walletconnect.svg', description: 'Connect any mobile wallet' },
];

// Password strength indicator
function PasswordStrength({ password }: { password: string }) {
  const getStrength = (pwd: string): { level: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { level: 2, label: 'Medium', color: 'bg-yellow-500' };
    return { level: 3, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-1">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.level ? strength.color : 'bg-theme-border'
              }`}
          />
        ))}
      </div>
      <span className={`text-xs ${strength.level === 1 ? 'text-red-400' : strength.level === 2 ? 'text-yellow-400' : 'text-green-400'}`}>
        {strength.label} password
      </span>
    </div>
  );
}

export function AuthModal({ isOpen, onClose, initialView = 'main' }: AuthModalProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { login: storeLogin } = useAuthStore();

  // View state
  const [view, setView] = useState<AuthView>(initialView);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset view when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setView(initialView);
    }
  }, [isOpen, initialView]);

  // Reset form on close
  const handleClose = useCallback(() => {
    // Delay reset slightly to allow close animation to finish
    setTimeout(() => {
      setView('main'); // Reset to main for next time by default
      setEmail('');
      setPassword('');
      setDisplayName('');
      setErrors({});
      setShowPassword(false);
    }, 300);
    onClose();
  }, [onClose]);

  // Reset form when switching views
  const switchView = useCallback((newView: AuthView) => {
    setErrors({});
    setView(newView);
  }, []);

  // Handle Google login
  const handleGoogleLogin = useCallback(async () => {
    setIsLoading(true);
    setErrors({});

    try {
      const authUrl = await authService.initiateGoogleAuth();
      window.location.href = authUrl;
    } catch (error) {
      const authError = error as AuthError;
      toast.error('Google Login Failed', authError.message);
      setErrors({ general: authError.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Handle wallet connect (Privy)
  const handleWalletConnect = useCallback(async (walletType?: WalletType) => {
    setIsLoading(true);
    setErrors({});

    try {
      toast.info('Wallet Connect', `Connecting to ${walletType ? WALLET_OPTIONS.find(w => w.id === walletType)?.name : 'wallet'}...`);

      // In production, this integrates with Privy SDK
      // const privyToken = await privy.connectWallet({ walletType });
      // const response = await authService.authenticateWithPrivy(privyToken);
      // storeLogin(response.user, response.accessToken, response.refreshToken);

      // Placeholder for Privy integration
      toast.warning('Coming Soon', 'Wallet authentication will be available soon.');
    } catch (error) {
      const authError = error as AuthError;
      toast.error('Wallet Connect Failed', authError.message);
      setErrors({ general: authError.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Handle email login
  const handleEmailLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate with Zod
      const validatedData = loginSchema.parse({ email, password });

      const response = await authService.login(validatedData);

      // Update auth store
      storeLogin(response.user, response.accessToken, response.refreshToken);

      toast.success('Welcome back!', 'You have successfully signed in.');

      // Redirect to dashboard FIRST (before modal closes)
      const redirectPath = getDashboardRoute(response.user.role);
      navigate(redirectPath);

      // Then close modal
      handleClose();
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
        toast.error('Login Failed', authError.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, storeLogin, toast, handleClose, navigate]);

  // Handle email registration
  const handleEmailRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate with Zod
      const validatedData = registerSchema.parse({
        email,
        password,
        displayName: displayName || undefined
      });

      const response = await authService.register(validatedData);

      // Update auth store
      storeLogin(response.user, response.accessToken, response.refreshToken);

      toast.success('Welcome to Seniqu!', 'Your account has been created successfully.');

      // Redirect to dashboard FIRST (before modal closes)
      const redirectPath = getDashboardRoute(response.user.role);
      navigate(redirectPath);

      // Then close modal
      handleClose();
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
        toast.error('Registration Failed', authError.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, displayName, storeLogin, toast, handleClose, navigate]);

  // Google Icon SVG
  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );

  // Render main auth options
  const renderMainView = () => (
    <>
      {/* Header */}
      <div className="px-8 pt-10 pb-6 text-center">
        <h2 className="text-2xl font-serif font-bold text-theme-text mb-2">
          Welcome to <span className="text-gold italic">Seniqu</span>
        </h2>
        <p className="text-theme-muted text-sm">
          Sign in to start collecting and preserving heritage.
        </p>
      </div>

      {/* Auth Options */}
      <div className="px-8 pb-10 space-y-4">
        {/* Error Message */}
        {errors.general && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Google Login (Primary) */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-theme-text text-theme-bg py-3.5 rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-black/5 hover:shadow-gold/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-theme-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-theme-glass px-2 text-theme-muted tracking-wider">
              Or continue with
            </span>
          </div>
        </div>

        {/* Email Login */}
        <button
          onClick={() => switchView('email-login')}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-theme-elevated/50 border border-theme-border text-theme-text py-3 rounded-xl font-medium hover:bg-theme-border transition-colors disabled:opacity-50"
        >
          <Mail className="w-5 h-5" />
          <span>Sign in with Email</span>
        </button>

        {/* Connect Wallet */}
        <button
          onClick={() => switchView('wallet-select')}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-transparent border border-gold/40 text-gold py-3 rounded-xl font-medium hover:bg-gold/5 transition-colors disabled:opacity-50"
        >
          <Wallet className="w-5 h-5" />
          <span>Connect Wallet</span>
        </button>
      </div>
    </>
  );

  // Render email login form
  const renderEmailLoginView = () => (
    <>
      {/* Header with Back Button */}
      <div className="px-8 pt-8 pb-6">
        <button
          onClick={() => switchView('main')}
          className="flex items-center gap-2 text-theme-muted hover:text-theme-text transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <h2 className="text-2xl font-serif font-bold text-theme-text mb-2">
          Sign in with Email
        </h2>
        <p className="text-theme-muted text-sm">
          Enter your email and password to continue.
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleEmailLogin} className="px-8 pb-10 space-y-4">
        {/* General Error */}
        {errors.general && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Email Input */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-theme-elevated border ${errors.email ? 'border-red-500' : 'border-theme-border'
                } rounded-xl text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-gold/50`}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email}</p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-theme-elevated border ${errors.password ? 'border-red-500' : 'border-theme-border'
                } rounded-xl text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-gold/50`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-400">{errors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-gold text-theme-bg py-3.5 rounded-xl font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <CheckCircle className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Register Link */}
        <p className="text-center text-sm text-theme-muted">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => switchView('email-register')}
            className="text-gold hover:underline"
          >
            Sign up
          </button>
        </p>
      </form>
    </>
  );

  // Render email register form
  const renderEmailRegisterView = () => (
    <>
      {/* Header with Back Button */}
      <div className="px-8 pt-8 pb-6">
        <button
          onClick={() => switchView('email-login')}
          className="flex items-center gap-2 text-theme-muted hover:text-theme-text transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to login</span>
        </button>
        <h2 className="text-2xl font-serif font-bold text-theme-text mb-2">
          Create Account
        </h2>
        <p className="text-theme-muted text-sm">
          Join Seniqu to start your art collection journey.
        </p>
      </div>

      {/* Register Form */}
      <form onSubmit={handleEmailRegister} className="px-8 pb-10 space-y-4">
        {/* General Error */}
        {errors.general && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Display Name Input (Optional) */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-2">
            Display Name <span className="text-theme-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-theme-elevated border ${errors.displayName ? 'border-red-500' : 'border-theme-border'
              } rounded-xl text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-gold/50`}
          />
          {errors.displayName && (
            <p className="mt-1 text-xs text-red-400">{errors.displayName}</p>
          )}
        </div>

        {/* Email Input */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-theme-elevated border ${errors.email ? 'border-red-500' : 'border-theme-border'
                } rounded-xl text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-gold/50`}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email}</p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-theme-elevated border ${errors.password ? 'border-red-500' : 'border-theme-border'
                } rounded-xl text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-gold/50`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-400">{errors.password}</p>
          )}
          <PasswordStrength password={password} />
        </div>

        {/* Password Requirements */}
        <div className="text-xs text-theme-muted bg-theme-elevated/30 p-3 rounded-xl">
          <p className="font-medium mb-1">Password requirements:</p>
          <ul className="space-y-0.5 ml-3 list-disc">
            <li className={password.length >= 8 ? 'text-green-400' : ''}>At least 8 characters</li>
            <li className={/[A-Z]/.test(password) ? 'text-green-400' : ''}>One uppercase letter</li>
            <li className={/[a-z]/.test(password) ? 'text-green-400' : ''}>One lowercase letter</li>
            <li className={/[0-9]/.test(password) ? 'text-green-400' : ''}>One number</li>
            <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-400' : ''}>One special character</li>
          </ul>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-gold text-theme-bg py-3.5 rounded-xl font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Create Account</span>
              <CheckCircle className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Login Link */}
        <p className="text-center text-sm text-theme-muted">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => switchView('email-login')}
            className="text-gold hover:underline"
          >
            Sign in
          </button>
        </p>
      </form>
    </>
  );

  // Render wallet selection view
  const renderWalletSelectView = () => (
    <>
      {/* Header */}
      <div className="px-8 pt-10 pb-4">
        <button
          onClick={() => initialView === 'wallet-select' ? handleClose() : switchView('main')}
          className="flex items-center gap-2 text-theme-muted hover:text-theme-text transition-colors mb-4"
        >
          {initialView === 'wallet-select' ? <X className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span className="text-sm">{initialView === 'wallet-select' ? 'Close' : 'Back'}</span>
        </button>
        <h2 className="text-2xl font-serif font-bold text-theme-text mb-2">
          Connect <span className="text-gold italic">Wallet</span>
        </h2>
        <p className="text-theme-muted text-sm">
          Choose your preferred wallet to connect.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 font-medium border border-purple-500/20">
            Solana
          </span>
          <span className="text-xs text-theme-muted">Powered by Privy</span>
        </div>
      </div>

      {/* Wallet Options */}
      <div className="px-8 pb-8 space-y-3">
        {/* Error Message */}
        {errors.general && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        {WALLET_OPTIONS.map((wallet) => (
          <button
            key={wallet.id}
            onClick={() => handleWalletConnect(wallet.id)}
            disabled={isLoading}
            className="w-full flex items-center gap-4 p-4 bg-theme-elevated/50 border border-theme-border hover:border-gold/40 hover:bg-gold/5 rounded-xl transition-all duration-200 disabled:opacity-50 group"
          >
            <div className="w-10 h-10 rounded-xl bg-theme-surface flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <img
                src={wallet.logo}
                alt={wallet.name}
                className="w-7 h-7"
              />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-theme-text group-hover:text-gold transition-colors">
                {wallet.name}
              </p>
              <p className="text-xs text-theme-muted">
                {wallet.description}
              </p>
            </div>
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-theme-muted animate-spin flex-shrink-0" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-green-500/50 group-hover:bg-green-500 transition-colors flex-shrink-0" />
            )}
          </button>
        ))}

        <p className="text-xs text-center text-theme-muted pt-2">
          Your wallet will be securely connected via encrypted channels.
        </p>
      </div>
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-theme-glass backdrop-blur-2xl border border-theme-glass-border rounded-2xl shadow-2xl pointer-events-auto relative"
            >
              {/* Decorative Top Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-theme-muted hover:text-theme-text hover:bg-theme-border rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content based on view */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {view === 'main' && renderMainView()}
                  {view === 'email-login' && renderEmailLoginView()}
                  {view === 'email-register' && renderEmailRegisterView()}
                  {view === 'wallet-select' && renderWalletSelectView()}
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              <div className="px-8 py-4 bg-theme-elevated/30 border-t border-theme-border text-center backdrop-blur-sm">
                <p className="text-xs text-theme-muted">
                  By continuing, you agree to our{' '}
                  <a href="/terms" className="text-gold hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-gold hover:underline">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}