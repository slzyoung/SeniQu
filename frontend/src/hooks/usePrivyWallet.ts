
import { usePrivy, useWallets } from '@privy-io/react-auth';

export const usePrivyWallet = () => {
    const { wallets } = useWallets();
    // In Privy v3, loginWithCustomToken is removed and replaced by useSyncJwtBasedAuthState
    // which handles syncing automatically. We don't expose manual login anymore.
    const { ready, authenticated, createWallet, user, login, logout, connectWallet } = usePrivy();

    // Removed useSolanaWallets as it is not exported from @privy-io/react-auth/solana
    // internal createWallet handles chains based on provider config.

    const solanaWallets = wallets.filter((wallet) => (wallet as any).chainType === 'solana');
    const ethereumWallets = wallets.filter((wallet) => (wallet as any).chainType === 'ethereum');

    // Helper to find specific embedded wallet
    // Helper to find specific embedded wallet
    const findEmbedded = (chain: 'solana' | 'ethereum') => {
        // 1. Try to find in active wallets list (has provider)
        const inWallets = wallets.find(w => (w as any).chainType === chain && w.walletClientType === 'privy');
        if (inWallets) return inWallets;

        // 2. Fallback to user linked accounts (address only)
        // This is crucial when the wallet exists on the user profile but hasn't been loaded into the 'wallets' array by the SDK yet.
        const inLinked = user?.linkedAccounts?.find(a =>
            a.type === 'wallet' &&
            (a as any).walletClientType === 'privy' &&
            // Check both camelCase and snake_case to be safe
            ((a as any).chainType === chain || (a as any).chain_type === chain)
        );
        if (inLinked) {
            return {
                address: (inLinked as any).address,
                chainType: chain,
                walletClientType: 'privy',
                // Mock properties to satisfy types if needed, though mostly we just need address
            } as any;
        }

        return undefined;
    };

    const embeddedSolanaWallet = findEmbedded('solana');
    const embeddedEthereumWallet = findEmbedded('ethereum');

    // Generic embedded wallet (first one found)
    const embeddedWallet = embeddedSolanaWallet || embeddedEthereumWallet;

    return {
        ready,
        authenticated,
        user,
        createWallet,
        login,
        logout,
        connectWallet,

        wallets,
        solanaWallets,
        ethereumWallets,
        embeddedSolanaWallet,
        embeddedEthereumWallet,
        embeddedWallet,

        // Removed raw: { createSolanaWallet } as distinct hook is unavailable/unnecessary
        raw: {}
    };
};
