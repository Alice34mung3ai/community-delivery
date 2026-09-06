import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ResetPasswordPage from './components/ResetPasswordPage';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

// This app has no router yet, so the one auth page that needs its own URL
// (the Supabase password-reset email link) is handled with a plain
// pathname check rather than pulling in react-router for a single route.
// If real client-side routing is added later, move this into it.
function Root() {
  const isResetPasswordRoute = window.location.pathname === '/auth/reset-password';
  return isResetPasswordRoute ? <ResetPasswordPage /> : <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
);
