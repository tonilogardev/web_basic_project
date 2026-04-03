import 'leaflet/dist/leaflet.css';
import './style.css';
import L from 'leaflet';

// 1. Inicialización centrada en Cataluña
const map = L.map('map').setView([41.5912, 1.5209], 8);

// 2. Capa pública estándar (OpenStreetMap) que evade cualquier bloqueo o AdBlock
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

console.log("Leaflet base cargado sin customizaciones complejas.");
