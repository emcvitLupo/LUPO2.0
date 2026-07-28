import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent benign offline/network fetch rejections (e.g., Supabase offline or blocked) from crashing the preview harness
window.addEventListener('unhandledrejection', (event) => {
  const reason = String(event?.reason?.message || event?.reason || '');
  if (reason.toLowerCase().includes('failed to fetch') || reason.toLowerCase().includes('networkerror') || reason.toLowerCase().includes('load failed')) {
    console.warn('Network request failed (offline or service unreachable):', reason);
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event?.message || event?.error || '');
  if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror') || msg.toLowerCase().includes('load failed')) {
    console.warn('Network error intercepted:', msg);
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

