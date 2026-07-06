/**
 * Seniqu WebApp - Main Application Entry Point
 * 
 * Enterprise-grade art gallery and marketplace platform
 */


import './lib/reownConfig';
import { ThemeProvider } from './hooks/useTheme';
import { LanguageProvider } from './hooks/useLanguage';
import { AppRouter } from './routes';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PrivyWrapper } from './components/providers/PrivyProvider';

// Mitigate MaxListenersExceededWarning from injected Web3 browser extension providers
if (typeof window !== 'undefined') {
  const providers = [
    (window as any).ethereum,
    (window as any).phantom?.solana,
    (window as any).solana,
  ];
  providers.forEach((provider) => {
    if (provider && typeof provider.setMaxListeners === 'function') {
      try {
        provider.setMaxListeners(100);
      } catch (err) {
        console.debug('Failed to setMaxListeners on provider:', err);
      }
    }
  });
}


export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          {/* PrivyWrapper includes PrivySyncManager internally, but we add AuthBridge for custom JWT flow */}
          <PrivyWrapper>
            {/* Main Router — PrivyAuthBridge is handled inside GlobalLayout within the Router context */}
            <AppRouter />
          </PrivyWrapper>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;