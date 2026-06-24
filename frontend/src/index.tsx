import './index.css';

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from "./App";
import { initializeAuth } from './stores';

// Initialize token synchronously to prevent initial queries from going out unauthorized
initializeAuth();

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