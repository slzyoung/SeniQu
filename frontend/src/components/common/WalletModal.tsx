import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';

// ============================================================
// STYLES
// ============================================================

const styles = {
    overlay: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
    },
    modal: {
        width: '100%',
        maxWidth: '420px',
        maxHeight: '85vh',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'linear-gradient(180deg, rgba(30, 30, 30, 0.98), rgba(15, 15, 15, 0.98))',
        backdropFilter: 'blur(40px)',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        animation: 'slideUp 0.3s ease-out',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    },
    title: {
        fontSize: '18px',
        fontWeight: 700,
        color: '#ffffff',
        margin: 0,
    },
    closeButton: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: 'none',
        background: 'rgba(255, 255, 255, 0.06)',
        color: '#999',
        cursor: 'pointer',
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
    },
    body: {
        padding: '16px 24px 24px',
        overflowY: 'auto' as const,
    },
    sectionTitle: {
        fontSize: '11px',
        fontWeight: 700,
        color: 'rgba(255, 255, 255, 0.4)',
        textTransform: 'uppercase' as const,
        letterSpacing: '1px',
        marginBottom: '12px',
        marginTop: '16px',
    },
    walletOption: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(255, 255, 255, 0.03)',
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.2s ease',
        marginBottom: '8px',
        fontFamily: 'inherit',
        textAlign: 'left' as const,
        color: '#ffffff',
    },
    walletOptionHover: {
        background: 'rgba(212, 175, 55, 0.08)',
        borderColor: 'rgba(212, 175, 55, 0.2)',
        transform: 'translateX(2px)',
    },
    walletOptionDisabled: {
        opacity: 0.4,
        cursor: 'not-allowed' as const,
    },
    walletIcon: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
        flexShrink: 0,
    },
    walletInfo: {
        flex: 1,
    },
    walletName: {
        fontSize: '15px',
        fontWeight: 600,
        color: '#ffffff',
        marginBottom: '2px',
    },
    walletDesc: {
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.4)',
    },
    badge: {
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
    },
    detectedBadge: {
        background: 'rgba(34, 197, 94, 0.15)',
        color: '#22c55e',
    },
    mobileBadge: {
        background: 'rgba(59, 130, 246, 0.15)',
        color: '#3b82f6',
    },
    embeddedSection: {
        padding: '16px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(212, 175, 55, 0.03))',
        border: '1px solid rgba(212, 175, 55, 0.15)',
        marginBottom: '16px',
    },
    embeddedTitle: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#D4AF37',
        marginBottom: '4px',
    },
    embeddedDesc: {
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.5)',
        lineHeight: 1.5,
    },
    footer: {
        padding: '16px 24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.3)',
        textAlign: 'center' as const,
    },
};

// ============================================================
// WALLET OPTIONS CONFIG
// ============================================================

interface WalletOptionConfig {
    name: string;
    type: string;
    icon: string;
    iconBg: string;
    description: string;
    chain: 'solana' | 'ethereum' | 'both';
}

const WALLET_OPTIONS: WalletOptionConfig[] = [
    {
        name: 'Phantom',
        type: 'phantom',
        icon: '👻',
        iconBg: 'linear-gradient(135deg, #AB9FF2, #7B61FF)',
        description: 'Solana & Ethereum',
        chain: 'both',
    },
    {
        name: 'Solflare',
        type: 'solflare',
        icon: '☀️',
        iconBg: 'linear-gradient(135deg, #FC9642, #E8713A)',
        description: 'Solana wallet',
        chain: 'solana',
    },
    {
        name: 'MetaMask',
        type: 'metamask',
        icon: '🦊',
        iconBg: 'linear-gradient(135deg, #F5841F, #E2761B)',
        description: 'Ethereum & EVM chains',
        chain: 'ethereum',
    },
    {
        name: 'Backpack',
        type: 'backpack',
        icon: '🎒',
        iconBg: 'linear-gradient(135deg, #E33E3F, #CF2D2E)',
        description: 'xNFT & Solana',
        chain: 'solana',
    },
    {
        name: 'WalletConnect',
        type: 'walletconnect',
        icon: '🔗',
        iconBg: 'linear-gradient(135deg, #3B99FC, #2680EB)',
        description: 'Scan QR or mobile deep link',
        chain: 'both',
    },
];

// ============================================================
// COMPONENT
// ============================================================

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * WalletModal — Multi-wallet selection dialog
 *
 * Desktop: Lists detected browser extensions + WalletConnect QR
 * Mobile: Lists installed apps with deep links + WalletConnect
 */
export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
    const { connect, availableWallets, isMobile, embeddedWallet } = useWallet();
    const [hoveredOption, setHoveredOption] = useState<string | null>(null);

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleWalletSelect = () => {
        // Privy handles the actual wallet connection via its UI
        connect();
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    // Separate detected and non-detected wallets
    const detectedWallets = WALLET_OPTIONS.filter((opt) => {
        const available = availableWallets.find((w) => w.type === opt.type);
        return available?.available && !available?.isMobileApp;
    });

    const otherWallets = WALLET_OPTIONS.filter((opt) => {
        const available = availableWallets.find((w) => w.type === opt.type);
        return !available?.available || available?.isMobileApp;
    });

    return (
        <div style={styles.overlay} onClick={handleOverlayClick} role="dialog" aria-modal="true">
            <div style={styles.modal}>
                {/* Header */}
                <div style={styles.header}>
                    <h2 style={styles.title}>Connect Wallet</h2>
                    <button
                        style={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close wallet modal"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={styles.body}>
                    {/* Embedded Wallet Info */}
                    {embeddedWallet && (
                        <div style={styles.embeddedSection}>
                            <div style={styles.embeddedTitle}>
                                🔐 Embedded Wallet Active
                            </div>
                            <div style={styles.embeddedDesc}>
                                Your Privy embedded wallet is ready. Connect an external wallet
                                below to use it alongside your embedded wallet.
                            </div>
                        </div>
                    )}

                    {/* Detected Wallets (Desktop) */}
                    {detectedWallets.length > 0 && !isMobile && (
                        <>
                            <div style={styles.sectionTitle}>Detected wallets</div>
                            {detectedWallets.map((wallet) => (
                                <button
                                    key={wallet.type}
                                    style={{
                                        ...styles.walletOption,
                                        ...(hoveredOption === wallet.type ? styles.walletOptionHover : {}),
                                    }}
                                    onMouseEnter={() => setHoveredOption(wallet.type)}
                                    onMouseLeave={() => setHoveredOption(null)}
                                    onClick={handleWalletSelect}
                                >
                                    <div style={{ ...styles.walletIcon, background: wallet.iconBg }}>
                                        {wallet.icon}
                                    </div>
                                    <div style={styles.walletInfo}>
                                        <div style={styles.walletName}>{wallet.name}</div>
                                        <div style={styles.walletDesc}>{wallet.description}</div>
                                    </div>
                                    <span style={{ ...styles.badge, ...styles.detectedBadge }}>
                                        Detected
                                    </span>
                                </button>
                            ))}
                        </>
                    )}

                    {/* All Wallets (Mobile) or Other Wallets (Desktop) */}
                    <div style={styles.sectionTitle}>
                        {isMobile ? 'Available wallets' : detectedWallets.length > 0 ? 'Other wallets' : 'Select wallet'}
                    </div>
                    {(isMobile ? WALLET_OPTIONS : otherWallets).map((wallet) => (
                        <button
                            key={wallet.type}
                            style={{
                                ...styles.walletOption,
                                ...(hoveredOption === wallet.type ? styles.walletOptionHover : {}),
                            }}
                            onMouseEnter={() => setHoveredOption(wallet.type)}
                            onMouseLeave={() => setHoveredOption(null)}
                            onClick={handleWalletSelect}
                        >
                            <div style={{ ...styles.walletIcon, background: wallet.iconBg }}>
                                {wallet.icon}
                            </div>
                            <div style={styles.walletInfo}>
                                <div style={styles.walletName}>{wallet.name}</div>
                                <div style={styles.walletDesc}>
                                    {isMobile ? `Open ${wallet.name} app` : wallet.description}
                                </div>
                            </div>
                            {isMobile && (
                                <span style={{ ...styles.badge, ...styles.mobileBadge }}>
                                    App
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    Powered by Privy • WalletConnect by Reown
                </div>
            </div>
        </div>
    );
};

export default WalletModal;
