/**
 * Email Verification Page
 * Handles the verification link clicked from email
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link — no token found.');
            return;
        }

        const verify = async () => {
            try {
                const result = await authService.verifyEmail(token);
                setStatus('success');
                setMessage(result.message || 'Email verified successfully!');
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'Verification failed. The link may have expired.');
            }
        };

        verify();
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-theme-bg flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* Card */}
                <div className="bg-theme-surface border border-theme-border rounded-2xl p-10 shadow-xl">
                    {status === 'loading' && (
                        <>
                            <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            </div>
                            <h1 className="text-2xl font-serif font-bold text-theme-text mb-3">
                                Verifying Your Email...
                            </h1>
                            <p className="text-theme-muted text-sm">Please wait while we verify your email address.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <h1 className="text-2xl font-serif font-bold text-theme-text mb-3">
                                Email Verified!
                            </h1>
                            <p className="text-theme-muted text-sm mb-8">{message}</p>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white py-3 rounded-xl font-semibold hover:from-amber-700 hover:to-amber-800 transition-all shadow-lg"
                            >
                                <span>Sign In Now</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                                <XCircle className="w-10 h-10 text-red-500" />
                            </div>
                            <h1 className="text-2xl font-serif font-bold text-theme-text mb-3">
                                Verification Failed
                            </h1>
                            <p className="text-theme-muted text-sm mb-8">{message}</p>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full bg-theme-elevated border border-theme-border text-theme-text py-3 rounded-xl font-semibold hover:bg-theme-elevated/80 transition-all"
                            >
                                Back to Home
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-theme-muted text-xs mt-6">
                    © {new Date().getFullYear()} SeniQu — Preserving Heritage Through Technology
                </p>
            </div>
        </div>
    );
}
