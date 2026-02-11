
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
    const embeddedSolanaWallet = solanaWallets.find((w) => w.walletClientType === 'privy');
    const embeddedEthereumWallet = ethereumWallets.find((w) => w.walletClientType === 'privy');

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

        // Removed raw: { createSolanaWallet } as distinct hook is unavailable/unnecessary
        raw: {}
    };
};
