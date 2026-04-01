import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import './index.css';

Sentry.init({
  dsn: (import.meta as any).env.VITE_SENTRY_DSN || "https://614b28051d03851974f49ea487888084@o4511143451426816.ingest.us.sentry.io/4511143551303680",
  release: `tutorxyz@${(import.meta as any).env.VITE_APP_VERSION || "0.0.0"}`,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, 
  // Keep only localhost to avoid CORS issues with third-party APIs (Google/Gemini)
  tracePropagationTargets: ["localhost"],
  // Session Replay
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0, 
});

const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '460394973365-mcns5e5ru5tornbmofh2cb0ld12a5nco.apps.googleusercontent.com';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);
