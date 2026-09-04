import './style.css';
import { CookieManager } from './cookieManager';

// 1. Inicializar lógica crítica
const cookieManager = new CookieManager();
cookieManager.init();

// Menos es más: HTML y CSS Grid se encargan de toda la vista interactiva.
// Sólo inyectamos Javascript global cuando es absolutamente crucial (ej. Formularios, Cookies, Estado Complejo).

// 2. Inyección Dinámica de Subdominios (Patrón URL Base)
const baseUrl = import.meta.env.VITE_BASE_URL || 'http://{subdomain}.localhost:8001';
const getUrl = (subdomain: string) => baseUrl.replace('{subdomain}', subdomain);

document.addEventListener('DOMContentLoaded', () => {
  const sentinelLink = document.getElementById('link-sentinel');
  if (sentinelLink) sentinelLink.setAttribute('href', getUrl('sentinel'));

  const cassiniLink = document.getElementById('link-cassini');
  if (cassiniLink) cassiniLink.setAttribute('href', getUrl('cassini'));

  const tfbLink = document.getElementById('link-tfb');
  if (tfbLink) tfbLink.setAttribute('href', getUrl('tfb-viewer'));

  const devwebLink = document.getElementById('link-devweb');
  if (devwebLink) devwebLink.setAttribute('href', getUrl('dev-web'));
});
