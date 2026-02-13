
/**
 * AuthModal Component
 * Secure authentication modal with Google, Email, and Wallet options
 * OWASP-compliant with anti-throttling and validation
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff, AlertCircle, CheckCircle, Wallet, ShieldCheck } from 'lucide-react';
import { authService, loginSchema, registerSchema, AuthError } from '../services/authService';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '../lib/reownConfig';

import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from '../stores/useNotificationStore';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { getDashboardRoute } from '../lib/utils';
import { useManualWallet, isWalletInstalled } from '../hooks/useManualWallet';
import { needsProfileCompletion } from '../lib/authHelpers';
import { usePrivy } from '@privy-io/react-auth';

import type { ManualWalletType, WalletConnectionState } from '../hooks/useManualWallet';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: AuthView;
}

type AuthView = 'main' | 'email-login' | 'email-register' | 'wallet-select' | 'wallet-select-account';

type WalletType = 'metamask' | 'phantom' | 'solflare' | 'walletconnect';

const WALLET_OPTIONS: { id: WalletType; name: string; logo: string; description: string }[] = [
  { id: 'phantom', name: 'Phantom', logo: '/images/wallets/phantom.svg', description: 'Solana\'s most popular wallet' },
  { id: 'solflare', name: 'Solflare', logo: '/images/wallets/solflare.svg', description: 'Advanced Solana wallet' },
  { id: 'metamask', name: 'MetaMask', logo: '/images/wallets/metamask.svg', description: 'Multi-chain browser wallet' },
  { id: 'walletconnect', name: 'WalletConnect (Reown)', logo: '/images/wallets/walletconnect.svg', description: 'Mobile apps via Reown' },
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

// Wallet connection status indicator
function WalletConnectionStatus({ state, walletName }: { state: WalletConnectionState; walletName: string }) {
  const getStatusInfo = () => {
    switch (state) {
      case 'connecting':
        return { label: `Connecting to ${walletName}...`, color: 'text-blue-400', icon: <Loader2 className="w-4 h-4 animate-spin" /> };
      case 'connected':
        return { label: 'Wallet connected', color: 'text-green-400', icon: <CheckCircle className="w-4 h-4" /> };
      case 'requesting-nonce':
        return { label: 'Preparing signature request...', color: 'text-blue-400', icon: <Loader2 className="w-4 h-4 animate-spin" /> };
      case 'awaiting-signature':
        return { label: 'Please sign the message in your wallet', color: 'text-yellow-400', icon: <ShieldCheck className="w-4 h-4" /> };
      case 'verifying':
        return { label: 'Verifying signature...', color: 'text-blue-400', icon: <Loader2 className="w-4 h-4 animate-spin" /> };
      case 'authenticated':
        return { label: 'Authentication successful!', color: 'text-green-400', icon: <CheckCircle className="w-4 h-4" /> };
      case 'error':
        return { label: 'Connection failed', color: 'text-red-400', icon: <AlertCircle className="w-4 h-4" /> };
      default:
        return null;
    }
  };

  const info = getStatusInfo();
  if (!info) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-center gap-2 p-3 rounded-xl border ${state === 'error'
        ? 'bg-red-500/10 border-red-500/30'
        : state === 'authenticated'
          ? 'bg-green-500/10 border-green-500/30'
          : state === 'awaiting-signature'
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-blue-500/10 border-blue-500/30'
        } ${info.color} text-sm`}
    >
      {info.icon}
      <span>{info.label}</span>
    </motion.div>
  );
}

export function AuthModal({ isOpen, onClose, initialView = 'main' }: AuthModalProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { login: storeLogin } = useAuthStore();
  const manualWallet = useManualWallet();

  // Guard against re-processing same Reown address (prevents mobile loops)
  const hasProcessedReownRef = React.useRef<string | null>(null);

  // Auto-timeout for stuck wallet connections
  const connectionTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Privy Hooks - MOVED UP
  const { logout: privyLogout, user: privyUser, authenticated: privyAuthenticated, getAccessToken } = usePrivy();

  // Reown AppKit Hooks
  const { open: openAppKit } = useAppKit();
  const { address: reownAddress, isConnected: isReownConnected } = useAppKitAccount();
  const { walletProvider: reownProvider } = useAppKitProvider('solana');

  // View state
  const [view, setView] = useState<AuthView>(initialView);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Track modal open state for async operations
  const isOpenRef = React.useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setView(initialView);
    }
  }, [isOpen, initialView]);

  // COMPLETE RESET of all state
  const resetState = useCallback(() => {
    setView('main');
    setEmail('');
    setPassword('');
    setDisplayName('');
    setUsername('');
    setErrors({});
    setShowPassword(false);
    setIsLoading(false);

    // If we are partly authenticated in Privy but not Backend, Force Logout from Privy
    // This ensures next time user opens modal, they start fresh
    if (privyAuthenticated && !useAuthStore.getState().isAuthenticated) {
      console.log('[AuthModal] Closing with partial auth - forcing Privy logout for fresh start');
      privyLogout().catch(console.error);
    }
  }, [privyAuthenticated, privyLogout]);

  // Reset form on close
  const handleClose = useCallback(() => {
    // Immediate close for UX
    onClose();

    // Clear auto-timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Reset state after animation
    setTimeout(() => {
      resetState();
      manualWallet.reset();
      hasProcessedReownRef.current = null;
    }, 300);
  }, [onClose, resetState, manualWallet]);

  // Reset form when switching views
  // Reset form when switching views
  const switchView = useCallback((newView: AuthView) => {
    setErrors({});
    setView(newView);
  }, []);

  // Helper: Handle successful login result
  const onLoginSuccess = useCallback((result: any) => {
    if (result.isNewUser) {
      // New user — switch to profile completion page
      storeLogin(result.user, result.accessToken, result.refreshToken);
      handleClose();
      navigate('/complete-profile');
    } else {
      // Existing user — check if profile is complete
      const needsCompletion = needsProfileCompletion(result.user);

      if (needsCompletion) {
        // Incomplete profile -> redirect
        storeLogin(result.user, result.accessToken, result.refreshToken);
        handleClose();
        navigate('/complete-profile');
      } else {
        // Fully complete — success & close
        setTimeout(() => {
          handleClose();
          // manualWallet.reset(); // Already called in handleClose
        }, 800);
      }
    }
  }, [storeLogin, handleClose, navigate]);

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

  /**
   * Handle wallet connect — manual direct connection (no Privy)
   *
   * Flow:
   * 1. Connect to wallet extension (desktop) or deep link (mobile)
   * 2. Request nonce from backend
   * 3. User signs the nonce message
   * 4. Verify signature → authenticate → get JWT
   *
   * Anti-Hacking: Nonce expiry, signature verification, sanitized errors
   */

  // NOTE: Syncing is now handled automatically by PrivySyncManager monitoring auth store.
  // We no longer manually call loginWithCustomToken here.

  // Sync logout: If app logs out, ensure Privy also logs out to prevent auto-relogin loops
  useEffect(() => {
    // Check if we are logged out in app but still logged in Privy
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated && privyAuthenticated) {
      privyLogout();
    }
  }, [privyAuthenticated, privyLogout]);

  // Effect: Handle Reown (WalletConnect) Connection -> Manual Login Flow
  // GUARD: hasProcessedReownRef prevents re-processing same address (mobile loop fix)
  useEffect(() => {
    const handleReownLogin = async () => {
      if (!isReownConnected || !reownAddress || !reownProvider) return;

      // Skip if already processed this exact address
      if (hasProcessedReownRef.current === reownAddress) return;

      // Skip if already processing or authenticated
      if (manualWallet.state === 'authenticated' || manualWallet.state === 'verifying' || manualWallet.state === 'requesting-nonce') return;

      // Skip if user is already logged in with this address
      const authState = useAuthStore.getState();
      if (authState.isAuthenticated && authState.user?.wallets?.some((w: any) => w.address === reownAddress)) {
        return;
      }

      // Mark as processed BEFORE async work to prevent re-entry
      hasProcessedReownRef.current = reownAddress;
      console.log('[AuthModal] Detected Reown connection', reownAddress);

      // Check for multiple accounts
      let allAccounts: string[] = [reownAddress];
      try {
        if ((reownProvider as any)?.accounts && Array.isArray((reownProvider as any).accounts)) {
          const extras = (reownProvider as any).accounts.map((acc: any) => acc.toString());
          allAccounts = Array.from(new Set([...allAccounts, ...extras]));
        }
      } catch (e) {
        console.warn('[AuthModal] Failed to extract extra accounts from Reown provider', e);
      }

      // Show account selection for multiple accounts
      if (allAccounts.length > 1) {
        manualWallet.setActiveWalletType('walletconnect');
        manualWallet.setAvailableAccounts(allAccounts);
        setView('wallet-select-account');
        return;
      }

      // Single account — proceed to login
      const result = await manualWallet.loginWithProvider(reownAddress, reownProvider, 'solana');

      if (result) {
        onLoginSuccess(result);
      }
    };

    if (isOpen) {
      handleReownLogin();
    }
  }, [isOpen, isReownConnected, reownAddress, reownProvider, manualWallet, handleClose, onLoginSuccess]);

  // Handle wallet connect — always show account selection first
  const handleWalletConnect = useCallback(async (walletType: ManualWalletType) => {
    // WalletConnect via Reown AppKit — opens its own modal
    if (walletType === 'walletconnect') {
      try {
        hasProcessedReownRef.current = null; // Reset so new connection can be processed
        await openAppKit();
      } catch (err) {
        console.error('[AuthModal] Reown open error:', err);
        toast.error('Connection Failed', 'Could not open WalletConnect modal');
      }
      return;
    }

    // Manual Wallets (MetaMask, Phantom, Solflare)
    if (isLoading || manualWallet.state === 'connecting' || manualWallet.state === 'verifying') return;

    setErrors({});

    // Immediately switch to account selection view (shows loading while connecting)
    manualWallet.setActiveWalletType(walletType);
    setView('wallet-select-account');

    // Set auto-timeout: if connection hangs, reset after 30s
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = setTimeout(() => {
      if (manualWallet.state === 'connecting') {
        manualWallet.reset();
        setErrors({ general: 'Connection timed out. Please try again.' });
        toast.error('Timeout', 'Wallet connection timed out.');
        setView('main');
      }
    }, 30000);

    // Connect in background — will update availableAccounts and state
    const accounts = await manualWallet.connectWallet(walletType);

    // Clear timeout on completion
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // CRITICAL: Check if modal is still open
    if (!isOpenRef.current) {
      console.log('[AuthModal] Modal closed during wallet connection - ignoring result');
      return;
    }

    if (!accounts || accounts.length === 0) {
      // Error already handled by hook + toast, go back to main
      if (manualWallet.state === 'error') {
        setView('main');
      }
      return;
    }

    // Accounts are now visible in the wallet-select-account view.
    // If only 1 account, we STILL show it so user confirms which address to use.
    // This is a security best practice: user always explicitly picks their address.
  }, [isLoading, manualWallet, openAppKit, toast, onLoginSuccess]);

  // Effect: Handle Privy authentication success (for WalletConnect)
  useEffect(() => {
    // CRITICAL: Only attempt auto-login if the modal is OPEN.
    // This prevents background auto-login loops when the user logs out.
    if (!isOpen) return;

    const handlePrivyAuth = async () => {
      if (privyAuthenticated && privyUser && privyUser.wallet) {
        // Check if we already have this user in our auth store to avoid loops
        const currentAuth = useAuthStore.getState();
        if (currentAuth.isAuthenticated && currentAuth.user?.wallets?.some((w: any) => w.address === privyUser.wallet?.address)) {
          return;
        }

        // Authenticate with backend using Privy
        try {
          setIsLoading(true);
          const token = await getAccessToken();
          if (!token) throw new Error('Failed to get Privy access token');

          const response = await authService.authenticateWithPrivy(token);

          if (response.isNewUser) {
            storeLogin(response.user, response.accessToken, response.refreshToken);
            handleClose();
            navigate('/complete-profile');
          } else {
            // Existing user - check profile completion
            const needsCompletion = needsProfileCompletion(response.user);

            storeLogin(response.user, response.accessToken, response.refreshToken);
            toast.success('Welcome!', 'Connected via WalletConnect');
            handleClose();

            // Redirect to profile completion or dashboard
            const redirectPath = needsCompletion
              ? '/complete-profile'
              : getDashboardRoute(response.user.role);

            navigate(redirectPath);
          }
        } catch (error) {
          console.error('Privy backend auth failed:', error);
          toast.error('Login Failed', 'Failed to authenticate with backend');
          // If auth fails, we should logout from Privy strictly to avoid stuck state
          privyLogout();
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (privyAuthenticated && privyUser) {
      handlePrivyAuth();
    }
  }, [isOpen, privyAuthenticated, privyUser, storeLogin, toast, handleClose, navigate, getAccessToken, privyLogout]);




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

      // AUTOMATIC: Sync Privy Session handled by PrivySyncManager
      // if ((response as any).privyToken) ...

      toast.success('Welcome back!', 'You have successfully signed in.');

      // Check if profile needs completion (missing displayName or username)
      const { needsProfileCompletion } = await import('../lib/authHelpers');
      const needsCompletion = needsProfileCompletion(response.user);

      // Redirect to profile completion or dashboard
      const redirectPath = needsCompletion
        ? '/complete-profile'
        : getDashboardRoute(response.user.role);
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
        displayName: displayName || undefined,
        username: username || undefined,
      });

      const response = await authService.register(validatedData);

      // Update auth store
      storeLogin(response.user, response.accessToken, response.refreshToken);

      // AUTOMATIC: Sync Privy Session handled by PrivySyncManager

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
  }, [email, password, displayName, username, storeLogin, toast, handleClose, navigate]);

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
  const renderMainView = () => {
    const isWalletBusy = manualWallet.state !== 'idle' && manualWallet.state !== 'error' && manualWallet.state !== 'authenticated';
    const activeWallet = WALLET_OPTIONS.find(w => w.id === manualWallet.activeWalletType);

    return (
      <>
        {/* Header */}
        <div className="px-8 pt-10 pb-6 text-center">
          <h2 className="text-3xl font-serif font-bold text-theme-text mb-2">
            Welcome to <span className="text-gold italic">Seniqu</span>
          </h2>
          <p className="text-theme-muted text-sm">
            Sign in to preserve and collect digital heritage.
          </p>
        </div>

        {/* Auth Options */}
        <div className="px-8 pb-10 space-y-5">
          {/* Error Message */}
          {errors.general && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Google Login (Primary) */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading || isWalletBusy}
            className="group w-full flex items-center justify-center gap-3 bg-theme-text text-theme-bg py-3.5 rounded-xl font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <div className="p-0.5 bg-white rounded-full"><GoogleIcon /></div>
                <span className="font-semibold tracking-wide">Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-theme-border/60"></div>
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-widest font-semibold">
              <span className="bg-theme-bg px-3 text-theme-muted">
                OR
              </span>
            </div>
          </div>

          {/* Email Login */}
          <button
            onClick={() => switchView('email-login')}
            disabled={isLoading || isWalletBusy}
            className="w-full flex items-center justify-center gap-3 bg-theme-elevated/30 border border-theme-border text-theme-text py-3 rounded-xl font-medium hover:bg-theme-elevated/50 hover:border-theme-muted transition-all disabled:opacity-50"
          >
            <Mail className="w-5 h-5" />
            <span>Sign in with Email</span>
          </button>

          {/* Wallet Options - Vertical Stack for Premium Feel */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-theme-border to-transparent" />
              <div className="flex items-center gap-1.5 text-gold/80">
                <Wallet className="w-3.5 h-3.5" />
                <span className="text-xs font-medium tracking-wider uppercase">Connect Wallet</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-theme-border to-transparent" />
            </div>

            {/* Inline Connection Status */}
            <AnimatePresence mode="wait">
              {isWalletBusy && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-3"
                >
                  <WalletConnectionStatus
                    state={manualWallet.state}
                    walletName={activeWallet?.name || 'Wallet'}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-4 gap-2">
              {WALLET_OPTIONS.map((wallet) => {
                const isActive = manualWallet.activeWalletType === wallet.id;

                return (
                  <button
                    key={wallet.id}
                    onClick={() => handleWalletConnect(wallet.id)}
                    disabled={isLoading || (isWalletBusy && !isActive)}
                    className={`group relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all duration-300 w-full h-[88px]
                        ${isActive
                        ? 'bg-gold/10 border-gold shadow-[0_0_15px_rgba(255,215,0,0.1)]'
                        : 'bg-theme-elevated/30 border-theme-border hover:border-gold/50 hover:bg-theme-elevated/50'
                      }
                        ${isWalletBusy && !isActive ? 'opacity-30 blur-[1px]' : ''}
                      `}
                  >
                    {/* Wallet Icon */}
                    <div className={`w-8 h-8 rounded-lg bg-theme-bg/50 border border-theme-border/50 flex items-center justify-center transition-transform duration-300 ${!isWalletBusy ? 'group-hover:scale-110' : ''}`}>
                      <img
                        src={wallet.logo}
                        alt={wallet.name}
                        className="w-5 h-5 object-contain"
                        loading="eager"
                      />
                    </div>

                    {/* Wallet Name */}
                    <div className="w-full flex flex-col items-center">
                      <span className={`font-medium text-xs tracking-tight transition-colors truncate max-w-full ${isActive ? 'text-gold' : 'text-theme-text group-hover:text-theme-text/90'}`}>
                        {wallet.name.replace(' (Reown)', '')}
                      </span>
                    </div>

                    {/* Active Indicator (Corner) */}
                    {isActive && isWalletBusy && (
                      <div className="absolute top-1 right-1">
                        <Loader2 className="w-3 h-3 text-gold animate-spin" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </>
    );
  };

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

        {/* Display Name Input */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-2">
            Display Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            required
            minLength={2}
            maxLength={50}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-theme-elevated border ${errors.displayName ? 'border-red-500' : 'border-theme-border'
              } rounded-xl text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-gold/50`}
          />
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="username"
              required
              minLength={3}
              maxLength={20}
              className={`w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-theme-elevated border ${errors.username ? 'border-red-500' : 'border-theme-border'
                } rounded-xl text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-gold/50`}
            />
          </div>
          <p className="mt-1 text-xs text-theme-muted">Lowercase letters, numbers, and underscores only</p>
          {errors.username && (
            <p className="mt-1 text-xs text-red-400">{errors.username}</p>
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

  // Render wallet selection view with connection status
  const renderWalletSelectView = () => {
    const isWalletBusy = manualWallet.state !== 'idle' && manualWallet.state !== 'error' && manualWallet.state !== 'authenticated';
    const activeWallet = WALLET_OPTIONS.find(w => w.id === manualWallet.activeWalletType);

    return (
      <>
        {/* Header */}
        <div className="px-8 pt-10 pb-4">
          <button
            onClick={() => {
              manualWallet.reset();
              initialView === 'wallet-select' ? handleClose() : switchView('main');
            }}
            className="flex items-center gap-2 text-theme-muted hover:text-theme-text transition-colors mb-4"
          >
            {initialView === 'wallet-select' ? <X className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span className="text-sm">{initialView === 'wallet-select' ? 'Close' : 'Back'}</span>
          </button>
          <h2 className="text-2xl font-serif font-bold text-theme-text mb-2">
            Connect <span className="text-gold italic">Wallet</span>
          </h2>
          <p className="text-theme-muted text-sm">
            Choose your preferred wallet to sign in.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 font-medium border border-purple-500/20">
              Solana
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
              Ethereum
            </span>
            <span className="text-xs text-theme-muted">Secure Direct Connection</span>
          </div>
        </div>

        {/* Wallet Options */}
        <div className="px-8 pb-8 space-y-3">
          {/* Connection Status */}
          <AnimatePresence>
            {(manualWallet.state !== 'idle') && (
              <WalletConnectionStatus
                state={manualWallet.state}
                walletName={activeWallet?.name || 'Wallet'}
              />
            )}
          </AnimatePresence>

          {/* Error from hook */}
          {manualWallet.error && manualWallet.state === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{manualWallet.error}</span>
            </div>
          )}

          {/* Error Message */}
          {errors.general && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          {WALLET_OPTIONS.map((wallet) => {
            const isActive = manualWallet.activeWalletType === wallet.id;
            const installed = isWalletInstalled(wallet.id);

            return (
              <button
                key={wallet.id}
                onClick={() => handleWalletConnect(wallet.id)}
                disabled={isWalletBusy && !isActive}
                className={`w-full flex items-center gap-4 p-4 border rounded-xl transition-all duration-200 group ${isActive && isWalletBusy
                  ? 'bg-gold/5 border-gold/40'
                  : 'bg-theme-elevated/50 border-theme-border hover:border-gold/40 hover:bg-gold/5'
                  } ${isWalletBusy && !isActive ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-theme-surface flex items-center justify-center flex-shrink-0 transition-transform ${!isWalletBusy ? 'group-hover:scale-110' : ''
                  }`}>
                  <img
                    src={wallet.logo}
                    alt={wallet.name}
                    className="w-7 h-7"
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium transition-colors ${isActive && isWalletBusy ? 'text-gold' : 'text-theme-text group-hover:text-gold'
                    }`}>
                    {wallet.name}
                  </p>
                  <p className="text-xs text-theme-muted">
                    {wallet.description}
                  </p>
                </div>
                {isActive && isWalletBusy ? (
                  <Loader2 className="w-4 h-4 text-gold animate-spin flex-shrink-0" />
                ) : (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {installed && wallet.id !== 'walletconnect' && (
                      <span className="text-[10px] text-green-400 font-medium">Installed</span>
                    )}
                    <div className={`w-2 h-2 rounded-full ${installed || wallet.id === 'walletconnect'
                      ? 'bg-green-500/50 group-hover:bg-green-500'
                      : 'bg-theme-muted/30'
                      } transition-colors`} />
                  </div>
                )}
              </button>
            );
          })}

          <div className="flex items-center gap-2 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-theme-muted" />
            <p className="text-xs text-theme-muted">
              You'll be asked to sign a message to verify ownership. No funds will be moved.
            </p>
          </div>
        </div>
      </>
    );
  };

  // Render account selection view — with loading + chain badges + security notice
  const renderWalletAccountSelectView = () => {
    const isConnecting = manualWallet.state === 'connecting';
    const isProcessing = manualWallet.state === 'requesting-nonce' || manualWallet.state === 'awaiting-signature' || manualWallet.state === 'verifying';
    const hasAccounts = manualWallet.availableAccounts.length > 0;
    const activeWallet = WALLET_OPTIONS.find(w => w.id === manualWallet.activeWalletType);
    const chainLabel = manualWallet.activeWalletType === 'metamask' ? 'Ethereum' : 'Solana';
    const chainColor = manualWallet.activeWalletType === 'metamask' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20';

    return (
      <>
        {/* Header */}
        <div className="px-8 pt-10 pb-4">
          <button
            onClick={() => {
              manualWallet.reset();
              if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
              }
              switchView('main');
            }}
            className="flex items-center gap-2 text-theme-muted hover:text-theme-text transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="flex items-center gap-3 mb-3">
            {activeWallet && (
              <div className="w-10 h-10 rounded-xl bg-theme-surface flex items-center justify-center border border-theme-border/50">
                <img src={activeWallet.logo} alt={activeWallet.name} className="w-6 h-6" loading="eager" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-serif font-bold text-theme-text">
                {isConnecting ? 'Connecting...' : 'Select'} <span className="text-gold italic">{isConnecting ? '' : 'Account'}</span>
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${chainColor}`}>
                  {chainLabel}
                </span>
                <span className="text-xs text-theme-muted">{activeWallet?.name || 'Wallet'}</span>
              </div>
            </div>
          </div>

          {!isConnecting && hasAccounts && (
            <p className="text-theme-muted text-sm">
              {manualWallet.availableAccounts.length === 1
                ? 'Confirm the account below to sign in.'
                : 'Multiple accounts detected. Choose one to continue.'}
            </p>
          )}
        </div>

        <div className="px-8 pb-8 space-y-3">
          {/* Connection / Auth Status */}
          <AnimatePresence mode="wait">
            {(manualWallet.state !== 'idle' && manualWallet.state !== 'connected' && manualWallet.state !== 'error') && (
              <WalletConnectionStatus
                state={manualWallet.state}
                walletName={activeWallet?.name || 'Wallet'}
              />
            )}
          </AnimatePresence>

          {/* Error state with retry */}
          {manualWallet.state === 'error' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{manualWallet.error || 'Connection failed'}</span>
              </div>
              <button
                onClick={() => {
                  manualWallet.reset();
                  if (manualWallet.activeWalletType) {
                    handleWalletConnect(manualWallet.activeWalletType);
                  } else {
                    switchView('main');
                  }
                }}
                className="w-full py-2.5 text-sm font-medium text-gold border border-gold/30 rounded-xl hover:bg-gold/5 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading spinner while connecting */}
          {isConnecting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-gold/5 border border-gold/20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm text-theme-text font-medium">Connecting to {activeWallet?.name}...</p>
                <p className="text-xs text-theme-muted mt-1">Please approve the connection in your wallet</p>
              </div>
            </motion.div>
          )}

          {/* Account list */}
          {hasAccounts && !isConnecting && manualWallet.state !== 'error' && (
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
              {manualWallet.availableAccounts.map((account, index) => (
                <button
                  key={account}
                  onClick={async () => {
                    if (manualWallet.activeWalletType) {
                      const result = await manualWallet.loginWithWallet(account, manualWallet.activeWalletType);
                      if (result && isOpenRef.current) {
                        onLoginSuccess(result);
                      }
                    }
                  }}
                  disabled={isProcessing}
                  className="w-full flex items-center gap-4 p-4 border rounded-xl transition-all duration-200 bg-theme-elevated/30 border-theme-border hover:border-gold/40 hover:bg-gold/5 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-xl bg-theme-surface flex items-center justify-center flex-shrink-0 border border-theme-border/50">
                    {activeWallet ? (
                      <img src={activeWallet.logo} alt="" className="w-6 h-6" />
                    ) : (
                      <span className="text-gold font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-theme-text font-mono text-sm">
                      {account.slice(0, 6)}...{account.slice(-4)}
                    </p>
                    <p className="text-xs text-theme-muted mt-0.5 flex items-center gap-1.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${manualWallet.activeWalletType === 'metamask' ? 'bg-blue-400' : 'bg-purple-400'
                        }`} />
                      {chainLabel} • Account {index + 1}
                    </p>
                  </div>
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 text-gold animate-spin flex-shrink-0" />
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <CheckCircle className="w-5 h-5 text-gold" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Security notice */}
          {hasAccounts && !isConnecting && manualWallet.state !== 'error' && (
            <div className="flex items-center gap-2 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500/70" />
              <p className="text-[11px] text-theme-muted">
                You'll sign a verification message only. <span className="text-green-400/80 font-medium">No funds will be moved.</span>
              </p>
            </div>
          )}
        </div>
      </>
    );
  };



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
                  {view === 'wallet-select-account' && renderWalletAccountSelectView()}
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
