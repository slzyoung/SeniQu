/**
 * Seniqu WebApp - Main Application Entry Point
 * 
 * Enterprise-grade art gallery and NFT marketplace platform
 */


import { ThemeProvider } from './hooks/useTheme';
import { AppRouter } from './routes';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        {/* Main Router */}
        <AppRouter />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;