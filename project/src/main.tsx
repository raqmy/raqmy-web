import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (import.meta.env.DEV) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  console.log('🔍 Supabase URL (first 25 chars):', supabaseUrl.substring(0, 25));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
