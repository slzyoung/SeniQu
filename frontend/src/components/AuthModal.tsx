
/**
 * AuthModal Component
 * Secure authentication modal with Google, Email, and Wallet options
 * OWASP-compliant with anti-throttling and validation
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff, AlertCircle, CheckCircle, Wallet, ShieldCheck, KeyRound, MailCheck } from 'lucide-react';
import Turnstile from 'react-turnstile';
const TurnstileComponent = Turnstile as any;
import { authService, loginSchema, registerSchema, AuthError, OtpRequiredResponse } from '../services/authService';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '../lib/reownConfig';

import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from '../stores/useNotificationStore';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
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

type AuthView = 'main' | 'email-login' | 'email-register' | 'wallet-select' | 'wallet-select-account' | 'otp-input' | 'email-verify-pending' | 'forgot-password' | 'forgot-password-otp';

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
    if (score <= 4) return { level: 2, label: 'Medium', color: 'bg-amber-500' };
    return { level: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.level ? strength.color : 'bg-theme-border'
              }`}
          />
        ))}
      </div>
      <span className={`text-xs font-semibold ${strength.level === 1 ? 'text-red-500 dark:text-red-400' : strength.level === 2 ? 'text-amber-500 dark:text-yellow-400' : 'text-emerald-600 dark:text-green-400'}`}>
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
        return {
          label: 'Verify domain is seniqu.art',
          color: 'text-yellow-400',
          icon: <ShieldCheck className="w-4 h-4" />
        };
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
  const location = useLocation();
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
  
  // Anti-bot states
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [website, setWebsite] = useState('');
  const turnstileRef = React.useRef<any>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpEmail, setOtpEmail] = useState(''); // real email for API call
  const [otpMaskedEmail, setOtpMaskedEmail] = useState(''); // masked email for display
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const otpInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [forgotResendCooldown, setForgotResendCooldown] = useState(0);
  const forgotOtpInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [forgotPasswordFocused, setForgotPasswordFocused] = useState(false);

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
    setOtpDigits(['', '', '', '', '', '']);
    setOtpEmail('');
    setOtpMaskedEmail('');
    setOtpResendCooldown(0);
    setForgotEmail('');
    setForgotNewPassword('');
    setForgotOtpDigits(['', '', '', '', '', '']);
    setForgotMaskedEmail('');
    setForgotResendCooldown(0);
    setPasswordFocused(false);
    setForgotPasswordFocused(false);
    setTurnstileToken(null);
    setWebsite('');
    try {
      turnstileRef.current?.reset();
    } catch (e) {
      console.warn('Failed to reset turnstile:', e);
    }

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
  const switchView = useCallback((newView: AuthView) => {
    setErrors({});
    setView(newView);
    setTurnstileToken(null);
    setWebsite('');
    try {
      turnstileRef.current?.reset();
    } catch (e) {
      // ignore
    }
  }, []);

  // Helper to determine redirect path based on role and location state
  const getRedirectPath = useCallback((userObj: any) => {
    const defaultRedirect = needsProfileCompletion(userObj)
      ? '/complete-profile'
      : getDashboardRoute(userObj);
    
    const from = (location.state as { from?: Location })?.from?.pathname || defaultRedirect;
    return from;
  }, [location.state]);

  // Helper: Handle successful login result
  const onLoginSuccess = useCallback((result: any) => {
    storeLogin(result.user, result.accessToken, result.refreshToken);
    const targetPath = getRedirectPath(result.user);
    setTimeout(() => {
      handleClose();
      navigate(targetPath, { replace: true });
    }, 800);
  }, [storeLogin, handleClose, navigate, getRedirectPath]);

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

      // STRICT GUARD: Only process if user EXPLICITLY selected WalletConnect
      // This prevents "Preparing signature request" loops when modal opens
      if (manualWallet.activeWalletType !== 'walletconnect') return;

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

      // Single account — proceed to login.
      // For mobile: we might need to delay slightly to ensure the modal doesn't close too fast if they just returned?
      // But actually we want to trigger the signature request immediately.

      // CRITICAL: Check if we recently requested a signature to avoid loops
      const lastSignRequest = sessionStorage.getItem('seniqu_last_signature_request');
      const now = Date.now();
      if (lastSignRequest && (now - parseInt(lastSignRequest) < 2000)) {
        console.log('[AuthModal] Debouncing signature request');
        return;
      }
      sessionStorage.setItem('seniqu_last_signature_request', now.toString());

      const result = await manualWallet.loginWithProvider(reownAddress, reownProvider, 'solana');

      if (result) {
        onLoginSuccess(result);
      }
    };

    if (isOpen) {
      handleReownLogin();
    }

    return () => {
      hasProcessedReownRef.current = null;
    };
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

            const targetPath = getRedirectPath(response.user);
            navigate(targetPath, { replace: true });
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




  // Handle email login — now triggers OTP flow
  const handleEmailLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const validatedData = loginSchema.parse({ email, password });
      const response = await authService.login(validatedData);

      // Check if OTP is required
      if ('requiresOtp' in response) {
        const otpResponse = response as OtpRequiredResponse;
        setOtpEmail(email); // Store real email for verify-otp API
        setOtpMaskedEmail(otpResponse.email); // masked email for display
        setOtpDigits(['', '', '', '', '', '']);
        setView('otp-input');
        toast.success('OTP Sent', otpResponse.message);
        // Start cooldown
        setOtpResendCooldown(60);
        return;
      }

      // Direct auth response (legacy fallback)
      const authResponse = response;
      storeLogin(authResponse.user, authResponse.accessToken, authResponse.refreshToken);
      toast.success('Welcome back!', 'You have successfully signed in.');
      const targetPath = getRedirectPath(authResponse.user);
      navigate(targetPath, { replace: true });
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

  // Handle email registration — now triggers verification flow
  const handleEmailRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Client-side Turnstile check
    if (!turnstileToken) {
      setErrors({ general: 'Please complete the security check.' });
      setIsLoading(false);
      return;
    }

    try {
      const validatedData = registerSchema.parse({
        email,
        password,
        displayName: displayName || undefined,
        username: username || undefined,
        turnstileToken: turnstileToken || undefined,
        website: website || undefined,
      });

      const response = await authService.register(validatedData);

      // Check if verification is required
      if ('requiresVerification' in response) {
        setView('email-verify-pending');
        toast.success('Check Your Email', response.message);
        return;
      }

      // Direct auth response (legacy fallback)
      const authResponse = response;
      storeLogin(authResponse.user, authResponse.accessToken, authResponse.refreshToken);
      toast.success('Welcome to SeniQu!', 'Your account has been created successfully.');
      const targetPath = getRedirectPath(authResponse.user);
      navigate(targetPath, { replace: true });
      handleClose();
    } catch (error) {
      // Reset Turnstile on registration failure so a new challenge can be completed
      try {
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      } catch (e) {
        // ignore
      }

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
  }, [email, password, displayName, username, turnstileToken, website, storeLogin, toast, handleClose, navigate]);

  // Handle OTP verification
  const handleVerifyOtp = useCallback(async (otpCode: string) => {
    if (otpCode.length !== 6) return;
    setIsLoading(true);
    setErrors({});

    try {
      const response = await authService.verifyOtp(otpEmail, otpCode);

      storeLogin(response.user, response.accessToken, response.refreshToken);
      toast.success('Welcome back!', 'Authentication successful.');
      const targetPath = getRedirectPath(response.user);
      navigate(targetPath, { replace: true });
      handleClose();
    } catch (error) {
      const authError = error as AuthError;
      setErrors({ general: authError.message });
      toast.error('Invalid OTP', authError.message);
      // Clear OTP inputs
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [otpEmail, storeLogin, toast, handleClose, navigate]);

  // Handle OTP resend
  const handleResendOtp = useCallback(async () => {
    if (otpResendCooldown > 0) return;
    try {
      await authService.resendOtp(otpEmail);
      toast.success('OTP Resent', 'A new code has been sent to your email.');
      setOtpResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (error) {
      const authError = error as AuthError;
      toast.error('Resend Failed', authError.message);
    }
  }, [otpEmail, otpResendCooldown, toast]);

  // OTP resend cooldown timer
  React.useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpResendCooldown]);

  // Handle OTP digit input
  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    const fullOtp = newDigits.join('');
    if (fullOtp.length === 6) {
      handleVerifyOtp(fullOtp);
    }
  }, [otpDigits, handleVerifyOtp]);

  // Handle OTP paste
  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      handleVerifyOtp(pasted);
    }
  }, [handleVerifyOtp]);

  // Handle OTP backspace
  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }, [otpDigits]);

  // Handle Forgot Password Request (Step 1)
  const handleForgotPasswordRequest = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsLoading(true);
    setErrors({});

    try {
      const response = await authService.forgotPasswordRequest(forgotEmail);
      setForgotMaskedEmail(response.email);
      setForgotOtpDigits(['', '', '', '', '', '']);
      setView('forgot-password-otp');
      toast.success('Reset Code Sent', response.message || 'OTP code sent successfully.');
      setForgotResendCooldown(60);
    } catch (error: any) {
      const msg = error.message || 'Failed to request password reset.';
      setErrors({ general: msg });
      toast.error('Request Failed', msg);
    } finally {
      setIsLoading(false);
    }
  }, [forgotEmail, toast]);

  // Handle Forgot Password Verify & Reset (Step 2)
  const handleForgotPasswordVerify = useCallback(async (otpCode: string) => {
    if (otpCode.length !== 6) return;
    if (forgotNewPassword.length < 8) {
      setErrors({ newPassword: 'Password must be at least 8 characters' });
      toast.error('Weak Password', 'Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    setErrors({});

    try {
      await authService.forgotPasswordVerify(forgotEmail, otpCode, forgotNewPassword);
      toast.success('Success', 'Password has been reset successfully. Please sign in.');
      // Reset forgot state
      setForgotEmail('');
      setForgotNewPassword('');
      setForgotOtpDigits(['', '', '', '', '', '']);
      setView('email-login');
    } catch (error: any) {
      const msg = error.message || 'Failed to reset password. Invalid or expired OTP.';
      setErrors({ general: msg });
      toast.error('Reset Failed', msg);
      setForgotOtpDigits(['', '', '', '', '', '']);
      forgotOtpInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [forgotEmail, forgotNewPassword, toast]);

  // Handle Forgot OTP resend
  const handleResendForgotOtp = useCallback(async () => {
    if (forgotResendCooldown > 0) return;
    try {
      await authService.forgotPasswordRequest(forgotEmail);
      toast.success('Code Resent', 'A new reset code has been sent to your email.');
      setForgotResendCooldown(60);
      setForgotOtpDigits(['', '', '', '', '', '']);
      forgotOtpInputRefs.current[0]?.focus();
    } catch (error: any) {
      toast.error('Resend Failed', error.message || 'Failed to resend code.');
    }
  }, [forgotEmail, forgotResendCooldown, toast]);

  // Forgot password OTP resend cooldown timer
  useEffect(() => {
    if (forgotResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotResendCooldown]);

  // Handle Forgot OTP digit input
  const handleForgotOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...forgotOtpDigits];
    newDigits[index] = value.slice(-1);
    setForgotOtpDigits(newDigits);

    if (value && index < 5) {
      forgotOtpInputRefs.current[index + 1]?.focus();
    }

    const fullOtp = newDigits.join('');
    if (fullOtp.length === 6) {
      handleForgotPasswordVerify(fullOtp);
    }
  }, [forgotOtpDigits, handleForgotPasswordVerify]);

  // Handle Forgot OTP paste
  const handleForgotOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setForgotOtpDigits(digits);
      handleForgotPasswordVerify(pasted);
    }
  }, [handleForgotPasswordVerify]);

  // Handle Forgot OTP backspace
  const handleForgotOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !forgotOtpDigits[index] && index > 0) {
      forgotOtpInputRefs.current[index - 1]?.focus();
    }
  }, [forgotOtpDigits]);

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
        <div className="px-5 sm:px-8 pt-10 pb-6 text-center">
          <h2 className="text-3xl font-serif font-bold text-theme-text mb-2">
            Welcome to <span className="text-amber-600 dark:text-gold italic">SeniQu</span>
          </h2>
          <p className="text-theme-muted text-sm">
            Sign in to preserve and collect digital heritage.
          </p>
        </div>

        {/* Auth Options */}
        <div className="px-5 sm:px-8 pb-10 space-y-5">
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
            className="group w-full flex items-center justify-center gap-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-3.5 rounded-xl font-medium hover:bg-black dark:hover:bg-neutral-100 transition-all shadow-md hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <div className="p-0.5 bg-white rounded-full"><GoogleIcon /></div>
                <span className="font-semibold tracking-wide text-sm">Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800"></div>
            <span className="text-[11px] uppercase tracking-widest font-bold text-theme-muted">
              OR
            </span>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800"></div>
          </div>

          {/* Email Login */}
          <button
            onClick={() => switchView('email-login')}
            disabled={isLoading || isWalletBusy}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 py-3 rounded-xl font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900/80 hover:border-gold/50 dark:hover:border-gold/50 transition-all disabled:opacity-50 text-sm"
          >
            <Mail className="w-5 h-5 text-neutral-500" />
            <span>Sign in with Email</span>
          </button>

          {/* Wallet Options - Vertical Stack for Premium Feel */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-gold/80">
                <Wallet className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold tracking-wider uppercase">Connect Wallet</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
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
                        ? 'bg-amber-500/[0.08] dark:bg-gold/10 border-amber-500 dark:border-gold shadow-[0_0_12px_rgba(201,168,76,0.15)]'
                        : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800/80 hover:border-gold/50 dark:hover:border-gold/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/80 hover:shadow-sm'
                      }
                        ${isWalletBusy && !isActive ? 'opacity-30 blur-[1px]' : ''}
                      `}
                  >
                    {/* Wallet Icon */}
                    <div className={`w-8 h-8 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800/50 flex items-center justify-center transition-transform duration-300 ${!isWalletBusy ? 'group-hover:scale-110' : ''}`}>
                      <img
                        src={wallet.logo}
                        alt={wallet.name}
                        className="w-5 h-5 object-contain"
                        loading="eager"
                      />
                    </div>

                    {/* Wallet Name */}
                    <div className="w-full flex flex-col items-center">
                      <span className={`font-semibold text-[10px] tracking-tight transition-colors truncate max-w-full ${isActive ? 'text-amber-600 dark:text-gold' : 'text-theme-muted group-hover:text-theme-text'}`}>
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
      <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-4">
        <button
          onClick={() => switchView('main')}
          className="flex items-center gap-2 text-theme-muted hover:text-theme-text transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs sm:text-sm font-medium">Back</span>
        </button>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-theme-text mb-1">
          Sign in with Email
        </h2>
        <p className="text-theme-muted text-xs sm:text-sm">
          Enter your email and password to continue.
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleEmailLogin} className="px-5 sm:px-8 pb-8 sm:pb-10 space-y-4">
        {/* General Error */}
        {errors.general && (
          <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Email Input */}
        <div>
          <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-theme-muted mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={`w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-900/90 focus:bg-white dark:focus:bg-neutral-950 border ${errors.email ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-800/80'
                } rounded-xl text-base sm:text-sm text-theme-text placeholder-theme-muted/65 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all duration-200`}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.email}</p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-theme-muted">Password</label>
            <button
              type="button"
              onClick={() => switchView('forgot-password')}
              className="text-xs text-amber-700 hover:text-amber-800 dark:text-gold dark:hover:text-gold-light hover:underline font-semibold"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full pl-11 pr-11 py-3 bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-900/90 focus:bg-white dark:focus:bg-neutral-950 border ${errors.password ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-800/80'
                } rounded-xl text-base sm:text-sm text-theme-text placeholder-theme-muted/65 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all duration-200`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-gold text-charcoal py-3 sm:py-3.5 rounded-xl font-semibold hover:from-amber-600 hover:to-gold transition-all active:scale-[0.98] shadow-md hover:shadow-gold/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
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
        <p className="text-center text-xs sm:text-sm text-theme-muted pt-1">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => switchView('email-register')}
            className="text-amber-700 hover:text-amber-800 dark:text-gold dark:hover:text-gold-light hover:underline font-semibold"
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
      <div className="px-5 sm:px-8 pt-5 sm:pt-6 pb-2">
        <button
          onClick={() => switchView('email-login')}
          className="flex items-center gap-2 text-theme-muted hover:text-theme-text transition-colors mb-2.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs sm:text-sm font-medium">Back to login</span>
        </button>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-theme-text mb-1">
          Create Account
        </h2>
        <p className="text-theme-muted text-xs leading-relaxed">
          Join SeniQu to start your digital art heritage journey.
        </p>
      </div>

      {/* Register Form */}
      <form onSubmit={handleEmailRegister} className="px-5 sm:px-8 pb-8 space-y-4">
        {/* General Error */}
        {errors.general && (
          <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Display Name Input */}
        <div>
          <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-theme-muted mb-1.5">
            Display Name <span className="text-red-500 font-bold">*</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your full name"
            required
            minLength={2}
            maxLength={50}
            className={`w-full px-4 py-3 bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-900/90 focus:bg-white dark:focus:bg-neutral-950 border ${errors.displayName ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-800/80'
              } rounded-xl text-base sm:text-sm text-theme-text placeholder-theme-muted/65 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all duration-200`}
          />
          {errors.displayName && (
            <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.displayName}</p>
          )}
        </div>

        {/* Username Input */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-theme-muted">
              Username <span className="text-red-500 font-bold">*</span>
            </label>
            <span className="text-[10px] text-theme-muted font-medium">a-z, 0-9, _ only</span>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted text-base sm:text-sm font-semibold select-none">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="username"
              required
              minLength={3}
              maxLength={20}
              className={`w-full pl-8 pr-4 py-3 bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-900/90 focus:bg-white dark:focus:bg-neutral-950 border ${errors.username ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-800/80'
                } rounded-xl text-base sm:text-sm text-theme-text placeholder-theme-muted/65 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all duration-200`}
            />
          </div>
          {errors.username && (
            <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.username}</p>
          )}
        </div>

        {/* Email Input */}
        <div>
          <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-theme-muted mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={`w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-900/90 focus:bg-white dark:focus:bg-neutral-950 border ${errors.email ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-800/80'
                } rounded-xl text-base sm:text-sm text-theme-text placeholder-theme-muted/65 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all duration-200`}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.email}</p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-theme-muted mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="••••••••"
              required
              className={`w-full pl-11 pr-11 py-3 bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-900/90 focus:bg-white dark:focus:bg-neutral-950 border ${errors.password ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-800/80'
                } rounded-xl text-base sm:text-sm text-theme-text placeholder-theme-muted/65 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all duration-200`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.password}</p>
          )}
          <PasswordStrength password={password} />
        </div>

        {/* Password Requirements - Focus Triggered Grid for Mobile Neatness */}
        {passwordFocused && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] sm:text-xs text-theme-muted bg-neutral-50 dark:bg-neutral-900/80 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800/80 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-600 dark:text-green-400 font-semibold' : ''}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-emerald-500 dark:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
              <span>Min. 8 characters</span>
            </div>
            <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? 'text-emerald-600 dark:text-green-400 font-semibold' : ''}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-emerald-500 dark:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
              <span>Uppercase letter</span>
            </div>
            <div className={`flex items-center gap-1.5 ${/[a-z]/.test(password) ? 'text-emerald-600 dark:text-green-400 font-semibold' : ''}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(password) ? 'bg-emerald-500 dark:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
              <span>Lowercase letter</span>
            </div>
            <div className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? 'text-emerald-600 dark:text-green-400 font-semibold' : ''}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-emerald-500 dark:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
              <span>One number</span>
            </div>
            <div className={`flex items-center gap-1.5 ${/[^A-Za-z0-9]/.test(password) ? 'text-emerald-600 dark:text-green-400 font-semibold' : ''}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${/[^A-Za-z0-9]/.test(password) ? 'bg-emerald-500 dark:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
              <span>Special char</span>
            </div>
          </div>
        )}

        {/* Honeypot field (anti-bot trap) */}
        <div className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Cloudflare Turnstile widget */}
        <div className="flex justify-center my-3.5">
          <TurnstileComponent
            ref={turnstileRef}
            sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
            onVerify={(token: string) => setTurnstileToken(token)}
            onError={() => {
              setTurnstileToken(null);
              setErrors({ general: 'Security challenge failed to load. Please try again.' });
            }}
            onExpire={() => setTurnstileToken(null)}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-gold text-charcoal py-3 sm:py-3.5 rounded-xl font-semibold hover:from-amber-600 hover:to-gold transition-all active:scale-[0.98] shadow-md hover:shadow-gold/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
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
        <p className="text-center text-xs text-theme-muted pt-0.5">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => switchView('email-login')}
            className="text-amber-700 hover:text-amber-800 dark:text-gold dark:hover:text-gold-light hover:underline font-semibold"
          >
            Sign in
          </button>
        </p>
      </form>
    </>
  );

  // Render forgot password form (Step 1)
  const renderForgotPasswordView = () => (
    <>
      {/* Header with Back Button */}
      <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-4">
        <button
          onClick={() => switchView('email-login')}
          className="flex items-center gap-2 text-theme-muted hover:text-theme-text transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs sm:text-sm font-medium">Back to login</span>
        </button>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-theme-text mb-1">
          Reset Password
        </h2>
        <p className="text-theme-muted text-xs sm:text-sm leading-relaxed">
          Enter your email to receive a 6-digit recovery code.
        </p>
      </div>

      {/* Forgot Password Form */}
      <form onSubmit={handleForgotPasswordRequest} className="px-5 sm:px-8 pb-8 sm:pb-10 space-y-4">
        {/* General Error */}
        {errors.general && (
          <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Email Input */}
        <div>
          <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-theme-muted mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-900/90 focus:bg-white dark:focus:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 rounded-xl text-base sm:text-sm text-theme-text placeholder-theme-muted/65 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all duration-200"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-gold text-charcoal py-3 sm:py-3.5 rounded-xl font-semibold hover:from-amber-600 hover:to-gold transition-all active:scale-[0.98] shadow-md hover:shadow-gold/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Send Recovery Code</span>
              <CheckCircle className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </>
  );

  // Render forgot password OTP and new password form (Step 2)
  const renderForgotPasswordOtpView = () => (
    <>
      {/* Header with Back Button */}
      <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-4">
        <button
          onClick={() => switchView('forgot-password')}
          className="flex items-center gap-2 text-theme-muted hover:text-theme-text transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs sm:text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/20 flex-shrink-0">
            <KeyRound className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-theme-text">Enter Reset Code</h2>
            <p className="text-theme-muted text-xs truncate max-w-[240px]">Sent to {forgotMaskedEmail}</p>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-8 pb-8 sm:pb-10 space-y-4">
        {/* General Error */}
        {errors.general && (
          <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* New Password Input */}
        <div>
          <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-theme-muted mb-1.5">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={forgotNewPassword}
              onChange={(e) => setForgotNewPassword(e.target.value)}
              onFocus={() => setForgotPasswordFocused(true)}
              onBlur={() => setForgotPasswordFocused(false)}
              placeholder="••••••••"
              required
              className="w-full pl-11 pr-11 py-3 bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-900/90 focus:bg-white dark:focus:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 rounded-xl text-base sm:text-sm text-theme-text placeholder-theme-muted/65 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {forgotPasswordFocused && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] sm:text-xs text-theme-muted bg-neutral-50 dark:bg-neutral-900/80 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800/80 mt-2.5 animate-in fade-in duration-200">
              <div className={`flex items-center gap-1.5 ${forgotNewPassword.length >= 8 ? 'text-emerald-600 dark:text-green-400 font-semibold' : ''}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${forgotNewPassword.length >= 8 ? 'bg-emerald-500 dark:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
                <span>Min. 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(forgotNewPassword) ? 'text-emerald-600 dark:text-green-400 font-semibold' : ''}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(forgotNewPassword) ? 'bg-emerald-500 dark:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
                <span>Uppercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${/[a-z]/.test(forgotNewPassword) ? 'text-emerald-600 dark:text-green-400 font-semibold' : ''}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(forgotNewPassword) ? 'bg-emerald-500 dark:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
                <span>Lowercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${/[0-9]/.test(forgotNewPassword) ? 'text-emerald-600 dark:text-green-400 font-semibold' : ''}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(forgotNewPassword) ? 'bg-emerald-500 dark:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
                <span>One number</span>
              </div>
              <div className={`flex items-center gap-1.5 ${/[^A-Za-z0-9]/.test(forgotNewPassword) ? 'text-emerald-600 dark:text-green-400 font-semibold' : ''}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${/[^A-Za-z0-9]/.test(forgotNewPassword) ? 'bg-emerald-500 dark:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
                <span>Special char</span>
              </div>
            </div>
          )}
        </div>

        {/* OTP Inputs */}
        <div className="pt-2">
          <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-theme-muted mb-2 text-center">6-Digit Reset Code</label>
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleForgotOtpPaste}>
            {forgotOtpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { forgotOtpInputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleForgotOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleForgotOtpKeyDown(index, e)}
                autoFocus={index === 0}
                disabled={isLoading}
                className={`w-9 h-11 sm:w-10 sm:h-12 text-center text-lg sm:text-xl font-bold bg-white dark:bg-neutral-900 border-2 ${
                  digit ? 'border-amber-500 text-amber-600 dark:border-gold dark:text-gold' : 'border-neutral-200 dark:border-neutral-800/80'
                } rounded-xl text-theme-text focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all`}
              />
            ))}
          </div>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-amber-500 text-xs sm:text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying & resetting...</span>
          </div>
        )}

        {/* Timer + Resend */}
        <div className="text-center pt-2">
          <p className="text-theme-muted text-xs mb-1.5">
            Code expires in <span className="text-amber-500 font-semibold">5 minutes</span>
          </p>
          {forgotResendCooldown > 0 ? (
            <p className="text-theme-muted text-xs">
              Resend code in <span className="text-amber-500 font-mono font-semibold">{forgotResendCooldown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResendForgotOtp}
              className="text-amber-600 dark:text-gold hover:underline text-xs font-semibold transition-colors"
            >
              Resend Code
            </button>
          )}
        </div>
      </div>
    </>
  );

  // Render wallet selection view with connection status
  const renderWalletSelectView = () => {
    const isWalletBusy = manualWallet.state !== 'idle' && manualWallet.state !== 'error' && manualWallet.state !== 'authenticated';
    const activeWallet = WALLET_OPTIONS.find(w => w.id === manualWallet.activeWalletType);

    return (
      <>
        {/* Header */}
        <div className="px-5 sm:px-8 pt-10 pb-4">
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
        <div className="px-5 sm:px-8 pb-8 space-y-3">
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
                  : 'bg-black/[0.02] dark:bg-white/[0.02] border-theme-border hover:border-gold/40 hover:bg-gold/5'
                  } ${isWalletBusy && !isActive ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-theme-bg bg-opacity-50 border border-theme-border flex items-center justify-center flex-shrink-0 transition-transform ${!isWalletBusy ? 'group-hover:scale-110' : ''
                  }`}>
                  <img
                    src={wallet.logo}
                    alt={wallet.name}
                    className="w-7 h-7"
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold text-sm transition-colors ${isActive && isWalletBusy ? 'text-gold' : 'text-theme-text group-hover:text-gold'
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
                      ? 'bg-green-500'
                      : 'bg-theme-muted/30'
                      } transition-colors`} />
                  </div>
                )}
              </button>
            );
          })}

          <div className="flex items-start gap-2 pt-2">
            <ShieldCheck className="w-4 h-4 text-theme-muted mt-0.5 flex-shrink-0" />
            <p className="text-xs text-theme-muted leading-relaxed">
              You'll be asked to sign a message to verify ownership. No funds will be moved.
            </p>
          </div>
        </div>
      </>
    );
  };

  // Render wallet selection view — with loading + chain badges + security notice
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
        <div className="px-5 sm:px-8 pt-10 pb-4">
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
              <div className="w-10 h-10 rounded-xl bg-theme-bg bg-opacity-50 flex items-center justify-center border border-theme-border">
                <img src={activeWallet.logo} alt={activeWallet.name} className="w-6 h-6" loading="eager" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-serif font-bold text-theme-text">
                {isConnecting ? 'Connecting...' : 'Select'} <span className="text-gold italic">{isConnecting ? '' : 'Account'}</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
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

        <div className="px-5 sm:px-8 pb-8 space-y-3">
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
                className="w-full py-2.5 text-sm font-semibold text-gold border border-gold/30 rounded-xl hover:bg-gold/5 transition-colors"
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
              <div className="text-center px-4">
                <p className="text-sm text-theme-text font-semibold">Connecting to {activeWallet?.name}...</p>
                <p className="text-xs text-theme-muted mt-1 leading-relaxed">Please approve the connection in your wallet</p>
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
                  className="w-full flex items-center gap-4 p-4 border rounded-xl transition-all duration-200 bg-black/[0.02] dark:bg-white/[0.02] border-theme-border hover:border-gold/40 hover:bg-gold/5 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-xl bg-theme-bg bg-opacity-50 flex items-center justify-center flex-shrink-0 border border-theme-border">
                    {activeWallet ? (
                      <img src={activeWallet.logo} alt="" className="w-6 h-6" />
                    ) : (
                      <span className="text-gold font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-theme-text font-mono text-sm">
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
            <div className="flex items-start gap-2 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500/70 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-theme-muted leading-relaxed">
                You'll sign a verification message only. <span className="text-emerald-600 dark:text-green-400 font-semibold">No funds will be moved.</span>
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#FAF9F5] dark:bg-[#0D0D0D] border border-neutral-200 dark:border-neutral-800/80 rounded-2xl shadow-2xl pointer-events-auto relative"
            >
              {/* Decorative Top Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors z-10"
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
                  {view === 'forgot-password' && renderForgotPasswordView()}
                  {view === 'forgot-password-otp' && renderForgotPasswordOtpView()}
                  {view === 'otp-input' && (
                    <>
                      {/* OTP Input View */}
                      <div className="px-5 sm:px-8 pt-8 pb-6">
                        <button
                          onClick={() => switchView('email-login')}
                          className="flex items-center gap-2 text-theme-muted hover:text-theme-text transition-colors mb-4"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span className="text-xs sm:text-sm font-medium">Back</span>
                        </button>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/20">
                            <KeyRound className="w-6 h-6 text-amber-500" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-serif font-bold text-theme-text">Enter OTP Code</h2>
                            <p className="text-theme-muted text-sm">Sent to {otpMaskedEmail}</p>
                          </div>
                        </div>
                      </div>

                      <div className="px-5 sm:px-8 pb-10 space-y-6">
                        {/* Error */}
                        {errors.general && (
                          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errors.general}</span>
                          </div>
                        )}

                        {/* OTP Inputs */}
                        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                          {otpDigits.map((digit, index) => (
                            <input
                              key={index}
                              ref={(el) => { otpInputRefs.current[index] = el; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleOtpChange(index, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(index, e)}
                              autoFocus={index === 0}
                              disabled={isLoading}
                              className={`w-9 h-11 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-white dark:bg-neutral-900 border-2 ${
                                digit ? 'border-amber-500 text-amber-600 dark:border-gold dark:text-gold' : 'border-neutral-200 dark:border-neutral-800/80'
                              } rounded-xl text-theme-text focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all`}
                            />
                          ))}
                        </div>

                        {/* Loading indicator */}
                        {isLoading && (
                          <div className="flex items-center justify-center gap-2 text-amber-500">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-medium">Verifying...</span>
                          </div>
                        )}

                        {/* Timer + Resend */}
                        <div className="text-center">
                          <p className="text-theme-muted text-sm mb-2">
                            Code expires in <span className="text-amber-500 font-semibold">5 minutes</span>
                          </p>
                          {otpResendCooldown > 0 ? (
                            <p className="text-theme-muted text-sm">
                              Resend code in <span className="text-amber-500 font-mono font-semibold">{otpResendCooldown}s</span>
                            </p>
                          ) : (
                            <button
                              onClick={handleResendOtp}
                              className="text-amber-600 dark:text-gold hover:underline text-sm font-medium transition-colors"
                            >
                              Resend Code
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {view === 'email-verify-pending' && (
                    <>
                      {/* Email Verification Pending View */}
                      <div className="px-5 sm:px-8 py-12 sm:py-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center border border-green-500/20 mx-auto mb-6">
                          <MailCheck className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-theme-text mb-3">
                          Check Your Email
                        </h2>
                        <p className="text-theme-muted text-sm leading-relaxed mb-2">
                          We've sent a verification link to:
                        </p>
                        <p className="text-amber-600 dark:text-gold font-semibold text-lg mb-6">
                          {email}
                        </p>
                        <p className="text-theme-muted text-sm leading-relaxed mb-8">
                          Click the link in the email to activate your account.<br />
                          The link expires in <span className="text-amber-500 font-semibold">24 hours</span>.
                        </p>
                        <button
                          onClick={() => switchView('email-login')}
                          className="w-full bg-gradient-to-r from-amber-500 to-gold text-charcoal py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-gold transition-all active:scale-[0.98] shadow-md hover:shadow-gold/10"
                        >
                          Back to Sign In
                        </button>
                        <p className="text-theme-muted text-xs mt-4">
                          Didn't receive the email? Check your spam folder.
                        </p>
                      </div>
                    </>
                  )}

                  {view === 'wallet-select' && renderWalletSelectView()}
                  {view === 'wallet-select-account' && renderWalletAccountSelectView()}
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              <div className="px-5 sm:px-8 py-4 bg-neutral-100/50 dark:bg-[#121212] border-t border-neutral-200 dark:border-neutral-800/80 text-center">
                <p className="text-xs text-theme-muted leading-relaxed">
                  By continuing, you agree to our{' '}
                  <a href="/terms" className="font-semibold text-amber-700 dark:text-gold hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="font-semibold text-amber-700 dark:text-gold hover:underline">
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
