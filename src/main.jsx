import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// iOS PWA / “Aggiungi a Home”: window.innerHeight è l’unica altezza affidabile; evita spazio vuoto sotto i CTA
const setAppHeight = () => {
  const vv = window.visualViewport;
  const inner = window.innerHeight;
  const fromVisual = vv ? vv.height : inner;
  const h = Math.max(inner, fromVisual, 1);
  document.documentElement.style.setProperty('--app-height', `${h}px`);
};
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 150));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setAppHeight);
  window.visualViewport.addEventListener('scroll', setAppHeight);
}
// Quando l’app da home viene riaperta (es. da multitasking)
window.addEventListener('focus', setAppHeight);
window.addEventListener('pageshow', (e) => e.persisted && setAppHeight());
setAppHeight();
// Secondo pass dopo il layout (utile su iOS standalone al primo caricamento)
requestAnimationFrame(setAppHeight);
[100, 300, 500, 800, 1200, 2000].forEach((ms) => setTimeout(setAppHeight, ms));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
