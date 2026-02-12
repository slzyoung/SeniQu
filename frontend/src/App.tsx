/**
 * Seniqu WebApp - Main Application Entry Point
 * 
 * Enterprise-grade art gallery and marketplace platform
 */


import { ThemeProvider } from './hooks/useTheme';
import { AppRouter } from './routes';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PrivyWrapper } from './components/providers/PrivyProvider';
import { PrivyAuthBridge } from './components/PrivyAuthBridge';

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        {/* PrivyWrapper includes PrivySyncManager internally, but we add AuthBridge for custom JWT flow */}
        <PrivyWrapper>
          <PrivyAuthBridge />
          {/* Main Router — PrivyAuthBridge is inside AppRouter for useNavigate access */}
          <AppRouter />
        </PrivyWrapper>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;