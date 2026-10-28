import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import '@fontsource-variable/noto-sans-tc';
import './styles/app.css';
createRoot(document.getElementById('root')!).render(<App />);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => undefined); });
}
