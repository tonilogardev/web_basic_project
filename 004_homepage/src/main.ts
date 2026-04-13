import './style.css';
import { CookieManager } from './cookieManager';

// 1. Inicializar lógica crítica
const cookieManager = new CookieManager();
cookieManager.init();

// Menos es más: HTML y CSS Grid se encargan de toda la vista interactiva.
// Sólo inyectamos Javascript global cuando es absolutamente crucial (ej. Formularios, Cookies, Estado Complejo).
