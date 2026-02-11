import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';

// ============================================================
// STYLES
// ============================================================

const styles = {
    container: {
        position: 'relative' as const,
    },
    button: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '12px',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.05))',
        color: '#D4AF37',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 600,
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(8px)',
        fontFamily: 'inherit',
    },
    buttonHover: {
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))',
        borderColor: 'rgba(212, 175, 55, 0.5)',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(212, 175, 55, 0.15)',
    },
    connectButton: {
        background: 'linear-gradient(135deg, #D4AF37, #B8962E)',
        color: '#000',
        border: 'none',
    },
    dot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#22c55e',
        boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)',
    },
    disconnectedDot: {
        backgroundColor: '#94a3b8',
        boxShadow: 'none',
    },
    address: {
        maxWidth: '120px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
        fontSize: '13px',
    },
    chainBadge: {
        padding: '2px 6px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
    },
    solanaBadge: {
        background: 'linear-gradient(135deg, #9945FF20, #14F19520)',
        color: '#9945FF',
    },
    ethereumBadge: {
        background: 'linear-gradient(135deg, #627EEA20, #627EEA10)',
        color: '#627EEA',
    },
    dropdown: {
        position: 'absolute' as const,
        top: 'calc(100% + 8px)',
        right: 0,
        minWidth: '220px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(20, 20, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        padding: '4px',
        zIndex: 1000,
        animation: 'fadeInDown 0.15s ease-out',
    },
    dropdownItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '8px',
        border: 'none',
        background: 'transparent',
        color: '#e0e0e0',
        cursor: 'pointer',
        fontSize: '14px',
        width: '100%',
        textAlign: 'left' as const,
        transition: 'background 0.15s ease',
        fontFamily: 'inherit',
    },
    dropdownItemHover: {
        background: 'rgba(255, 255, 255, 0.06)',
    },
    dropdownDivider: {
        height: '1px',
        background: 'rgba(255, 255, 255, 0.08)',
        margin: '4px 8px',
    },
    disconnectItem: {
        color: '#ef4444',
    },
    walletIcon: {
        fontSize: '16px',
        width: '20px',
        textAlign: 'center' as const,
    },
    // Mobile compact style
    mobileButton: {
        padding: '8px 10px',
        borderRadius: '10px',
    },
};

// ============================================================
// COMPONENT
// ============================================================

interface WalletButtonProps {
    compact?: boolean;
    className?: string;
}

/**
 * WalletButton — Responsive wallet connect/disconnect button
 *
 * Desktop: Shows truncated address + balance + chain badge + dropdown
 * Mobile: Compact icon with status indicator
 */
export const WalletButton: React.FC<WalletButtonProps> = ({
    compact = false,
}) => {
    const {
        isConnected,
        address,
        chain,
        walletType,
        connect,
        disconnect,
        isMobile,
    } = useWallet();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ============================================
    // NOT CONNECTED
    // ============================================

    if (!isConnected) {
        return (
            <button
                onClick={connect}
                style={{
                    ...styles.button,
                    ...styles.connectButton,
                    ...(compact || isMobile ? styles.mobileButton : {}),
                    ...(isHovered ? { opacity: 0.9, transform: 'translateY(-1px)' } : {}),
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                aria-label="Connect wallet"
            >
                <span>🔗</span>
                {!compact && !isMobile && <span>Connect Wallet</span>}
                {compact && <span>Connect</span>}
            </button>
        );
    }

    // ============================================
    // CONNECTED
    // ============================================

    const truncatedAddress = address
        ? `${address.slice(0, 4)}...${address.slice(-4)}`
        : '';

    const chainBadgeStyle = chain === 'solana'
        ? { ...styles.chainBadge, ...styles.solanaBadge }
        : { ...styles.chainBadge, ...styles.ethereumBadge };

    const copyAddress = async () => {
        if (address) {
            await navigator.clipboard.writeText(address);
            setIsDropdownOpen(false);
        }
    };

    const viewOnExplorer = () => {
        if (!address) return;
        const url = chain === 'solana'
            ? `https://explorer.solana.com/address/${address}?cluster=devnet`
            : `https://etherscan.io/address/${address}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        setIsDropdownOpen(false);
    };

    const handleDisconnect = () => {
        disconnect();
        setIsDropdownOpen(false);
    };

    const walletLabel = walletType === 'embedded' ? '🔐' :
        walletType === 'phantom' ? '👻' :
            walletType === 'solflare' ? '☀️' :
                walletType === 'metamask' ? '🦊' :
                    walletType === 'walletconnect' ? '🔗' : '💳';

    return (
        <div style={styles.container} ref={dropdownRef}>
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                    ...styles.button,
                    ...(compact || isMobile ? styles.mobileButton : {}),
                    ...(isHovered ? styles.buttonHover : {}),
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                aria-label="Wallet menu"
                aria-expanded={isDropdownOpen}
            >
                <span style={styles.dot} />
                {!compact && (
                    <>
                        <span>{walletLabel}</span>
                        <span style={styles.address}>{truncatedAddress}</span>
                        <span style={chainBadgeStyle}>{chain === 'solana' ? 'SOL' : 'ETH'}</span>
                    </>
                )}
                {compact && <span style={styles.address}>{truncatedAddress}</span>}
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <div style={styles.dropdown}>
                    {/* Wallet info */}
                    <div style={{ padding: '10px 12px', opacity: 0.6, fontSize: '12px' }}>
                        {walletType === 'embedded' ? 'Embedded Wallet' : `${walletType.charAt(0).toUpperCase() + walletType.slice(1)} Wallet`}
                    </div>

                    <div style={styles.dropdownDivider} />

                    {/* Copy Address */}
                    <button
                        style={{
                            ...styles.dropdownItem,
                            ...(hoveredItem === 0 ? styles.dropdownItemHover : {}),
                        }}
                        onMouseEnter={() => setHoveredItem(0)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={copyAddress}
                    >
                        <span style={styles.walletIcon}>📋</span>
                        <span>Copy Address</span>
                    </button>

                    {/* View on Explorer */}
                    <button
                        style={{
                            ...styles.dropdownItem,
                            ...(hoveredItem === 1 ? styles.dropdownItemHover : {}),
                        }}
                        onMouseEnter={() => setHoveredItem(1)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={viewOnExplorer}
                    >
                        <span style={styles.walletIcon}>🔍</span>
                        <span>View on Explorer</span>
                    </button>

                    <div style={styles.dropdownDivider} />

                    {/* Disconnect */}
                    <button
                        style={{
                            ...styles.dropdownItem,
                            ...styles.disconnectItem,
                            ...(hoveredItem === 2 ? styles.dropdownItemHover : {}),
                        }}
                        onMouseEnter={() => setHoveredItem(2)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={handleDisconnect}
                    >
                        <span style={styles.walletIcon}>🔌</span>
                        <span>Disconnect</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default WalletButton;
