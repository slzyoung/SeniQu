/**
 * Seniqu WebApp - Main Application Entry Point
 * 
 * Enterprise-grade art gallery and marketplace platform
 */


import { ThemeProvider } from './hooks/useTheme';
import { AppRouter } from './routes';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PrivyWrapper } from './components/providers/PrivyProvider';


export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        {/* PrivyWrapper includes PrivySyncManager internally, but we add AuthBridge for custom JWT flow */}
        <PrivyWrapper>
          {/* Main Router — PrivyAuthBridge is handled inside GlobalLayout within the Router context */}
          <AppRouter />
        </PrivyWrapper>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;