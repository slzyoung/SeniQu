import './index.css';

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from "./App";
import { initializeAuth } from './stores';

// Initialize token synchronously to prevent initial queries from going out unauthorized
initializeAuth();

// Prevent wallet MaxListenersExceededWarning memory leak warnings
if (typeof window !== 'undefined') {
    const patchMaxListeners = (obj: any) => {
        if (obj && typeof obj.setMaxListeners === 'function') {
            try {
                obj.setMaxListeners(100);
            } catch (e) {
                // Ignore any silent failures
            }
        }
    };

    const handleWalletListeners = () => {
        patchMaxListeners((window as any).ethereum);
        patchMaxListeners((window as any).solana);
        patchMaxListeners((window as any).phantom?.solana);
        patchMaxListeners((window as any).solflare);
    };

    handleWalletListeners();
    window.addEventListener('ethereum#initialized', handleWalletListeners, { once: true });
    window.addEventListener('solana#initialized', handleWalletListeners, { once: true });
    
    // Also patch periodically/on interval for late-injected providers (e.g. extension load delays)
    const interval = setInterval(handleWalletListeners, 1000);
    setTimeout(() => clearInterval(interval), 10000);
}

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
        },
    },
});

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
    <QueryClientProvider client={queryClient}>
        <App />
    </QueryClientProvider>
);