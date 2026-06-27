import './index.css';

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from "./App";
import { initializeAuth } from './stores';

// Initialize token synchronously to prevent initial queries from going out unauthorized
initializeAuth();

// Prevent MetaMask MaxListenersExceededWarning memory leak warnings on hot reloads
if (typeof window !== 'undefined') {
    const handleEthereum = () => {
        const eth = (window as any).ethereum;
        if (eth && typeof eth.setMaxListeners === 'function') {
            try {
                eth.setMaxListeners(100);
            } catch (e) {
                // Ignore any silent failures
            }
        }
    };
    handleEthereum();
    window.addEventListener('ethereum#initialized', handleEthereum, { once: true });
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