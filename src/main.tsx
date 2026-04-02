import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '460394973365-mcns5e5ru5tornbmofh2cb0ld12a5nco.apps.googleusercontent.com';

createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={clientId}>
    <App />
  </GoogleOAuthProvider>,
);