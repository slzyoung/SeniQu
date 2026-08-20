import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';

/**
 * CookieConsent Component
 * Ultra-modern, glassmorphic, compact consent banner designed for high-end Web3/Art UI.
 * Positioned above mobile bottom navigation with safe contrast in both light and dark themes.
 */
export const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('seniqu_cookie_consent');
        if (!consent) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('seniqu_cookie_consent', 'accepted');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('seniqu_cookie_consent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div 
            className={`fixed bottom-20 left-3 right-3 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[9999] transition-all duration-500 ease-out ${
                isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95 pointer-events-none'
            }`}
        >
            <div 
                className="relative overflow-hidden rounded-2xl p-3.5 sm:p-4 transition-all duration-300 shadow-2xl backdrop-blur-xl"
                style={{
                    backgroundColor: 'var(--cookie-bg, rgba(255, 255, 255, 0.92))',
                    borderColor: 'var(--cookie-border, rgba(0, 0, 0, 0.08))',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    boxShadow: '0 12px 32px var(--cookie-shadow, rgba(0, 0, 0, 0.12))',
                }}
            >
                {/* CSS Theme Tokens */}
                <style>{`
                    :root {
                        --cookie-bg: rgba(255, 255, 255, 0.94);
                        --cookie-border: rgba(15, 23, 42, 0.1);
                        --cookie-shadow: rgba(15, 23, 42, 0.1);
                        --cookie-text: #0F172A;
                        --cookie-muted: #64748B;
                        --cookie-icon-bg: rgba(201, 168, 76, 0.12);
                        --cookie-icon-border: rgba(201, 168, 76, 0.25);
                        --cookie-btn-decline-bg: rgba(15, 23, 42, 0.04);
                        --cookie-btn-decline-text: #334155;
                    }
                    .dark {
                        --cookie-bg: rgba(18, 18, 22, 0.94);
                        --cookie-border: rgba(255, 255, 255, 0.1);
                        --cookie-shadow: rgba(0, 0, 0, 0.4);
                        --cookie-text: #F8FAFC;
                        --cookie-muted: #94A3B8;
                        --cookie-icon-bg: rgba(201, 168, 76, 0.15);
                        --cookie-icon-border: rgba(201, 168, 76, 0.3);
                        --cookie-btn-decline-bg: rgba(255, 255, 255, 0.06);
                        --cookie-btn-decline-text: #CBD5E1;
                    }
                `}</style>

                {/* Subtle gold glow corner accent */}
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div 
                        className="p-2 rounded-xl shrink-0 mt-0.5"
                        style={{
                            backgroundColor: 'var(--cookie-icon-bg)',
                            borderColor: 'var(--cookie-icon-border)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                        }}
                    >
                        <ShieldCheck className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h4 
                                className="text-xs sm:text-sm font-semibold tracking-wide"
                                style={{ color: 'var(--cookie-text)' }}
                            >
                                Cookie Preference
                            </h4>
                            <Link 
                                to="/privacy" 
                                className="text-[10px] sm:text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline underline-offset-2 ml-auto sm:ml-0"
                            >
                                Policy
                            </Link>
                        </div>
                        <p 
                            className="text-[11px] sm:text-xs leading-relaxed line-clamp-2"
                            style={{ color: 'var(--cookie-muted)' }}
                        >
                            We use cookies to secure Web3 smart contracts, optimize digital art loading, and personalize your experience.
                        </p>
                    </div>

                    {/* Quick Close Button */}
                    <button
                        onClick={handleDecline}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0 -mr-1 -mt-1"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-slate-200/50 dark:border-white/5">
                    <button
                        onClick={handleDecline}
                        className="px-3.5 py-1.5 text-[11px] font-medium rounded-xl transition-all duration-200 active:scale-95"
                        style={{
                            backgroundColor: 'var(--cookie-btn-decline-bg)',
                            color: 'var(--cookie-btn-decline-text)',
                        }}
                    >
                        Decline
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-4 py-1.5 text-[11px] font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-md shadow-amber-500/20 transition-all duration-200 active:scale-95"
                    >
                        Accept All
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
