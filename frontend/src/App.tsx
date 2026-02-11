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
        <PrivyWrapper>
          {/* Main Router — PrivyAuthBridge is inside AppRouter for useNavigate access */}
          <AppRouter />
        </PrivyWrapper>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;