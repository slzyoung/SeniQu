import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * CookieConsent Component
 * Renders a premium, glassmorphism cookie consent banner with smooth micro-animations.
 */
export const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has already accepted/declined cookie consent
        const consent = localStorage.getItem('seniqu_cookie_consent');
        if (!consent) {
            // Show the banner with a slight delay for high-end feel
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1200);
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
            className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md w-auto z-[9999] transform transition-all duration-700 ease-out ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
        >
            <div className="glass-card p-6 rounded-2xl border border-[var(--glass-border)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden group">
                {/* Micro-glow background effect */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--text-gold)] opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-700" />
                
                {/* Header */}
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-[rgba(201,168,76,0.1)] rounded-xl border border-[rgba(201,168,76,0.2)] text-[var(--text-gold)] shrink-0 animate-pulse">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            strokeWidth={1.5} 
                            stroke="currentColor" 
                            className="w-6 h-6"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" 
                            />
                        </svg>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-wide font-sans mb-1">
                            Cookie Preference
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] leading-relaxed font-sans">
                            SeniQu uses cookies to elevate your digital art exploration, secure Web3 smart contracts, and personalize features.
                        </p>
                    </div>
                </div>

                {/* Divider */}
                <div className="my-4 h-[1px] bg-[var(--border-color)]" />

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                    {/* Learn More link */}
                    <Link 
                        to="/privacy" 
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-gold)] transition-colors duration-300 font-medium tracking-wider uppercase underline underline-offset-4 w-full sm:w-auto text-center sm:text-left py-2"
                    >
                        Privacy Policy
                    </Link>

                    <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
                        <button
                            onClick={handleDecline}
                            className="px-4 py-2 text-xs font-semibold tracking-widest text-[var(--text-primary)] hover:text-[var(--text-gold)] border border-[var(--border-color)] hover:border-[var(--text-gold)] rounded-xl transition-all duration-300 uppercase w-full sm:w-auto hover:bg-[rgba(201,168,76,0.02)] active:scale-95"
                        >
                            Decline
                        </button>
                        <button
                            onClick={handleAccept}
                            className="px-5 py-2 text-xs font-semibold tracking-widest text-[#0D0D0D] bg-[var(--text-gold)] hover:bg-[#ebd07c] hover:shadow-[0_0_15px_rgba(201,168,76,0.4)] rounded-xl transition-all duration-300 uppercase w-full sm:w-auto active:scale-95 transform"
                        >
                            Accept All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
