import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService } from '../services/walletService';
import { useAuthStore } from '../stores/useAuthStore';

// ============================================
// QUERY KEYS
// ============================================

export const walletKeys = {
    all: ['wallet'] as const,
    portfolio: () => [...walletKeys.all, 'portfolio'] as const,
    transactions: () => [...walletKeys.all, 'transactions'] as const,
    connections: () => [...walletKeys.all, 'connections'] as const,
};

// ============================================
// HOOKS
// ============================================

/**
 * Fetch aggregated wallet portfolio
 */
export function useWalletPortfolio() {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: walletKeys.portfolio(),
        queryFn: () => walletService.getPortfolio(),
        enabled: isAuthenticated,
        staleTime: 1000 * 30, // 30 seconds
    });
}

/**
 * Fetch wallet transaction history
 */
export function useWalletTransactions() {
    const { isAuthenticated } = useAuthStore();

    return useQuery({
        queryKey: walletKeys.transactions(),
        queryFn: () => walletService.getTransactions(),
        enabled: isAuthenticated,
        staleTime: 1000 * 60, // 1 minute
    });
}

/**
 * Initiate a withdrawal
 */
export function useWalletWithdraw() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { amount: number; token: string; destination: string }) =>
            walletService.withdraw(data.amount, data.token, data.destination),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: walletKeys.portfolio() });
            queryClient.invalidateQueries({ queryKey: walletKeys.transactions() });
        },
    });
}
