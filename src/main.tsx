import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent benign offline/network fetch rejections (e.g., Supabase offline or blocked) from crashing the preview harness
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason?.message || event?.reason?.toString() || '';
  if (reason.includes('Failed to fetch') || reason.includes('NetworkError') || reason.includes('Load failed')) {
    console.warn('Network request failed (offline or service unreachable):', reason);
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

