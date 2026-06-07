import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cron from 'node-cron';

// Configuración
const API_URL = process.env.BACKEND_API_URL || 'http://002_backend:3000';
const API_KEY = process.env.ETL_API_KEY || 'default-secret-key';
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 6 * * *'; // Por defecto a las 6:00 AM

console.log(`[ETL Worker] Inicializado. API_URL: ${API_URL}`);
console.log(`[ETL Worker] Cron schedule configurado: ${CRON_SCHEDULE}`);

// Interfaces
interface RawAsset {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  regionCode: string;
  assetValue: number;
}

interface RawCondition {
  id: number;
  assetId: number;
  hazardType: string;
  severityLevel: number;
  probabilityScore: number;
}

interface IngestPayload {
  assetName: string;
  latitude: number;
  longitude: number;
  assetValue: number;
  hazardName: string;
  riskScore: number; // Transformación: Severity * Probability
}

// 1. EXTRACT: Leer ficheros TXT
function extractData() {
  console.log('[ETL] Iniciando extracción (Extract)...');
  const assetsPath = path.join(__dirname, '../data/assets.txt');
  const conditionsPath = path.join(__dirname, '../data/conditions.txt');

  const assetsContent = fs.readFileSync(assetsPath, 'utf-8');
  const conditionsContent = fs.readFileSync(conditionsPath, 'utf-8');

  const assets: RawAsset[] = assetsContent
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      const [id, name, lat, lon, region, val] = line.split(',');
      return {
        id: parseInt(id),
        name,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        regionCode: region,
        assetValue: parseFloat(val)
      };
    });

  const conditions: RawCondition[] = conditionsContent
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      const [id, assetId, hazardType, severityLevel, probabilityScore] = line.split(',');
      return {
        id: parseInt(id),
        assetId: parseInt(assetId),
        hazardType,
        severityLevel: parseInt(severityLevel),
        probabilityScore: parseInt(probabilityScore)
      };
    });

  console.log(`[ETL] Extraídos ${assets.length} activos y ${conditions.length} condiciones.`);
  return { assets, conditions };
}

// 2. TRANSFORM: Unir datos y calcular RiskScore
function transformData(assets: RawAsset[], conditions: RawCondition[]): IngestPayload[] {
  console.log('[ETL] Iniciando transformación (Transform)...');
  const payload: IngestPayload[] = [];

  for (const condition of conditions) {
    // Filtrar: Solo nos interesan condiciones con severidad >= 3 (Alta criticidad)
    if (condition.severityLevel >= 3) {
      const asset = assets.find(a => a.id === condition.assetId);
      if (asset) {
        // Cálculo del RiskScore
        const riskScore = condition.severityLevel * condition.probabilityScore;
        
        // Añadir la fecha y hora al nombre para distinguir cada ejecución de 15 minutos
        const now = new Date();
        const dateString = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
        const timeString = now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Madrid' }).substring(0, 5);
        
        payload.push({
          assetName: `${asset.name} - ${dateString} ${timeString}`,
          latitude: asset.latitude,
          longitude: asset.longitude,
          assetValue: asset.assetValue,
          hazardName: condition.hazardType,
          riskScore: riskScore
        });
      }
    }
  }

  console.log(`[ETL] Transformación completa. ${payload.length} registros listos para inserción.`);
  return payload;
}

// 3. LOAD: Enviar al Backend vía API usando API Key
async function loadData(payload: IngestPayload[]) {
  console.log('[ETL] Iniciando carga (Load) hacia el Backend...');
  let successCount = 0;
  let errorCount = 0;

  for (const item of payload) {
    try {
      await axios.post(`${API_URL}/api/etl/ingest`, item, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      successCount++;
    } catch (error: any) {
      console.error(`[ETL Error] Fallo al insertar: ${item.assetName} - ${error.response?.status} ${error.response?.statusText}`);
      errorCount++;
    }
  }

  console.log(`[ETL] Carga finalizada. Éxitos: ${successCount}, Errores: ${errorCount}`);
}

// Flujo Principal
async function runEtlPipeline() {
  console.log('\n--- COMENZANDO FLUJO ETL ---');
  try {
    const { assets, conditions } = extractData();
    const payload = transformData(assets, conditions);
    await loadData(payload);
    console.log('--- FLUJO ETL COMPLETADO CON ÉXITO ---\n');
  } catch (error) {
    console.error('--- ERROR CRÍTICO EN FLUJO ETL ---', error);
  }
}

// Programar con node-cron
cron.schedule(CRON_SCHEDULE, () => {
  runEtlPipeline();
});

// Para facilitar las pruebas, si le pasamos "run-now" por argumento, lo ejecuta inmediatamente
if (process.argv.includes('run-now')) {
  runEtlPipeline();
} else {
  console.log(`[ETL Worker] Esperando a la ejecución programada (${CRON_SCHEDULE})...`);
}
