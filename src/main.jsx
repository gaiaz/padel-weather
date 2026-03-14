import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// iOS PWA / “Aggiungi a Home”: window.innerHeight è l’unica altezza affidabile; evita spazio vuoto sotto i CTA
const setAppHeight = () => {
  const h = window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${h}px`);
};
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 100));
// Quando l’app da home viene riaperta (es. da multitasking)
window.addEventListener('focus', setAppHeight);
window.addEventListener('pageshow', (e) => e.persisted && setAppHeight());
setAppHeight();
// Secondo pass dopo il layout (utile su iOS standalone al primo caricamento)
requestAnimationFrame(setAppHeight);
setTimeout(setAppHeight, 300);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
