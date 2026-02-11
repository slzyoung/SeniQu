import { useWallets } from '@privy-io/react-auth';

/**
 * Hook to manage Privy Embedded Wallets vs External Wallets
 * Helps distinguish the "App Wallet" (Embedded) from user's personal wallets (Phantom, etc.)
 */
export const usePrivyWallet = () => {
    const { wallets } = useWallets();

    // The embedded wallet created by Privy (Non-custodial)
    const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

    // External wallets connected by the user (Phantom, Metamask, etc.)
    const externalWallets = wallets.filter(wallet => wallet.walletClientType !== 'privy');

    // The currently active wallet (usually the last connected or selected one)
    // Note: Privy's useWallets() doesn't explicitly denote "active" in the array, 
    // but usually the first one or we use usePrivy().user.wallet

    return {
        hasEmbeddedWallet: !!embeddedWallet,
        embeddedWallet,
        externalWallets,
        allWallets: wallets
    };
};
