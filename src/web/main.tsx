import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import '@fontsource-variable/noto-sans-tc';
import './styles/app.css';
createRoot(document.getElementById('root')!).render(<App />);
