import type { StacFeature } from './stacApi';

export const BANDAS_DISPONIBLES = ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B8A', 'B09', 'B11', 'B12'];

export const BAND_TO_ASSET: Record<string, string> = {
  B01: 'coastal', B02: 'blue', B03: 'green', B04: 'red',
  B05: 'rededge1', B06: 'rededge2', B07: 'rededge3',
  B08: 'nir', B8A: 'nir08', B09: 'nir09',
  B11: 'swir16', B12: 'swir22',
};

export const PRESETS = [
  { id: 'true-color', label: 'True Color (RGB)', type: 'rgb' as const, assets: ['red', 'green', 'blue'] as [string, string, string], rescale: [0, 3000] as [number, number] },
  { id: 'false-color', label: 'False Color (Urban)', type: 'rgb' as const, assets: ['swir22', 'swir16', 'red'] as [string, string, string], rescale: [0, 3000] as [number, number] },
  { id: 'cir', label: 'Color Infrared (CIR)', type: 'rgb' as const, assets: ['nir', 'red', 'green'] as [string, string, string], rescale: [0, 3000] as [number, number] },
  { id: 'agriculture', label: 'Agriculture', type: 'rgb' as const, assets: ['swir16', 'nir', 'red'] as [string, string, string], rescale: [0, 3000] as [number, number] },
  { id: 'geology', label: 'Geology', type: 'rgb' as const, assets: ['swir22', 'swir16', 'blue'] as [string, string, string], rescale: [0, 3000] as [number, number] },
  { id: 'bathymetric', label: 'Coastal / Bathymetric', type: 'rgb' as const, assets: ['red', 'green', 'coastal'] as [string, string, string], rescale: [0, 3000] as [number, number] },
  { id: 'ndvi', label: 'NDVI (Vegetation)', type: 'expression' as const, assets: ['nir', 'red'], expression: '(b1-b2)/(b1+b2)', rescale: [-1, 1] as [number, number], colormap_name: 'rdylgn' },
  { id: 'ndwi', label: 'NDWI (Water)', type: 'expression' as const, assets: ['green', 'nir'], expression: '(b1-b2)/(b1+b2)', rescale: [-1, 1] as [number, number], colormap_name: 'blues' },
  { id: 'ndbi', label: 'NDBI (Built-up)', type: 'expression' as const, assets: ['swir16', 'nir'], expression: '(b1-b2)/(b1+b2)', rescale: [-1, 1] as [number, number], colormap_name: 'ylorbr' },
  { id: 'water-quality', label: 'Water Quality Analysis', type: 'external_api' as const },
];

export function getPresetBadge(presetId: string): string {
  switch (presetId) {
    case 'true-color': return 'RGB';
    case 'ndvi': return 'NDVI';
    case 'ndwi': return 'NDWI';
    case 'ndbi': return 'NDBI';
    case 'false-color': return 'False Color';
    case 'cir': return 'CIR';
    case 'agriculture': return 'Agriculture';
    case 'geology': return 'Geology';
    case 'bathymetric': return 'Bathymetric';
    case 'water-quality': return 'Water Quality';
    case 'custom': return 'Custom';
    default: return presetId.toUpperCase();
  }
}

export interface BusquedaSession {
  id: string;
  presetId: string;
  presetLabel: string;
  bandConfig: BandPreset;
  resultados: StacFeature[];
  escenasVisibles: Set<string>;
  opacidad: number;
  colapsado: boolean;
  x?: number;
  y?: number;
}

export type BandPreset =
  | { id: string; label: string; type: 'rgb'; assets: [string, string, string] | string[]; rescale: [number, number]; expression?: undefined; colormap_name?: undefined }
  | { id: string; label: string; type: 'expression'; assets: string[]; expression: string; rescale: [number, number]; colormap_name?: string }
  | { id: string; label: string; type: 'external_api'; assets?: undefined; rescale?: undefined; expression?: undefined; colormap_name?: undefined };

function getDefaultDates(days: number = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

class SentinelStore {
  satelite = $state("sentinel-2");
  coberturaNubes = $state(20);
  maxResults = $state<number | 'all'>('all');
  fechaInicio = $state(getDefaultDates(30).start);
  fechaFin = $state(getDefaultDates(30).end);
  boundingBox = $state<[number, number, number, number] | null>(null);
  modoDibujo = $state(false);

  panelControlesPos = $state<{ x: number; y: number }>({ x: 20, y: 20 });
  busquedas = $state<BusquedaSession[]>([]);
  cargando = $state(false);
  busquedaRealizada = $state(false);

  cargaCapasPendiente = $state(false);
  mensajeCarga = $state("Loading...");
  progresoCarga = $state(0);
  tiempoEstimado = $state<number | null>(null);
  tiempoTranscurrido = $state(0);
  mensajeExito = $state("");

  private timerCarga: ReturnType<typeof setInterval> | null = null;
  private inicioCargaTimestamp = 0;

  iniciarCargaCapas(mensaje: string = "Downloading image tiles...", tiempoEstimado?: number) {
    if (this.timerCarga) {
      clearInterval(this.timerCarga);
      this.timerCarga = null;
    }
    this.cargaCapasPendiente = true;
    this.mensajeCarga = mensaje;
    this.tiempoEstimado = tiempoEstimado ?? null;
    this.tiempoTranscurrido = 0;
    this.inicioCargaTimestamp = Date.now();

    this.timerCarga = setInterval(() => {
      this.tiempoTranscurrido = Math.round((Date.now() - this.inicioCargaTimestamp) / 100) / 10;
    }, 100);
  }

  finalizarCargaCapas(mensajeExito?: string) {
    if (this.timerCarga) {
      clearInterval(this.timerCarga);
      this.timerCarga = null;
    }
    const duracion = this.inicioCargaTimestamp > 0
      ? ((Date.now() - this.inicioCargaTimestamp) / 1000).toFixed(1)
      : '0.0';

    this.cargaCapasPendiente = false;
    this.tiempoEstimado = null;

    if (mensajeExito) {
      const textoFinal = mensajeExito.includes('loaded') || mensajeExito.includes('Loaded')
        ? `${mensajeExito} in ${duracion}s`
        : `${mensajeExito} (${duracion}s)`;
      this.mostrarMensajeExito(textoFinal);
    }

    this.tiempoTranscurrido = 0;
    this.inicioCargaTimestamp = 0;
  }

  agregarOActualizarBusqueda(presetId: string, bandConfig: BandPreset, resultados: StacFeature[]) {
    const existente = this.busquedas.find(b => b.presetId === presetId);
    if (existente) {
      existente.resultados = resultados;
      existente.bandConfig = JSON.parse(JSON.stringify(bandConfig));
      existente.presetLabel = getPresetBadge(presetId);
      existente.colapsado = false;
      if (existente.escenasVisibles.size === 0 && resultados.length > 0) {
        existente.escenasVisibles = new Set([resultados[0].id]);
      }
    } else {
      const existingCount = this.busquedas.length;
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      const cardWidth = 320;
      const startX = 355; // Next to Copernicus Viewer (width 320 at left 20)
      const availableWidth = Math.max(320, screenWidth - startX - cardWidth);
      const cols = Math.max(1, Math.floor(availableWidth / (cardWidth + 15)));

      const colIndex = existingCount % (cols + 1);
      const rowIndex = Math.floor(existingCount / (cols + 1));

      const initialX = Math.min(Math.max(20, screenWidth - cardWidth - 20), startX + colIndex * (cardWidth + 15));
      const initialY = Math.min(Math.max(20, screenHeight - 350), 20 + rowIndex * 35);

      const nueva: BusquedaSession = {
        id: `search_${presetId}_${Date.now()}`,
        presetId,
        presetLabel: getPresetBadge(presetId),
        bandConfig: JSON.parse(JSON.stringify(bandConfig)),
        resultados,
        escenasVisibles: new Set(resultados.length > 0 ? [resultados[0].id] : []),
        opacidad: 100,
        colapsado: false,
        x: initialX,
        y: initialY,
      };
      this.busquedas.push(nueva);
    }
  }

  toggleEscenaEnBusqueda(busquedaId: string, featureId: string) {
    const b = this.busquedas.find(item => item.id === busquedaId);
    if (!b) return;
    const nuevaSet = new Set(b.escenasVisibles);
    if (nuevaSet.has(featureId)) {
      nuevaSet.delete(featureId);
    } else {
      nuevaSet.add(featureId);
    }
    b.escenasVisibles = nuevaSet;
  }

  toggleTodasEnBusqueda(busquedaId: string) {
    const b = this.busquedas.find(item => item.id === busquedaId);
    if (!b) return;
    if (b.escenasVisibles.size === b.resultados.length) {
      b.escenasVisibles = new Set();
    } else {
      b.escenasVisibles = new Set(b.resultados.map(r => r.id));
    }
  }

  eliminarBusqueda(busquedaId: string) {
    this.busquedas = this.busquedas.filter(b => b.id !== busquedaId);
  }

  limpiarTodasLasBusquedas() {
    this.busquedas = [];
  }

  presetActivo = $state('true-color');
  bandasCustom = $state<[string, string, string]>(['B04', 'B03', 'B02']);
  opacidadCapas = $state(90);

  get bandConfig(): BandPreset {
    return this.presetActivo === 'custom'
      ? {
          id: 'custom', label: 'Custom', type: 'rgb',
          assets: this.bandasCustom.map(b => BAND_TO_ASSET[b] ?? b) as [string, string, string],
          rescale: [0, 3000] as [number, number]
        }
      : PRESETS.find(p => p.id === this.presetActivo)!;
  }

  get areaKm2(): number {
    if (!this.boundingBox) return 0;
    const [minLng, minLat, maxLng, maxLat] = this.boundingBox;
    const midLat = (minLat + maxLat) / 2;
    const latRad = (midLat * Math.PI) / 180;
    const widthKm = Math.abs(maxLng - minLng) * 111.32 * Math.cos(latRad);
    const heightKm = Math.abs(maxLat - minLat) * 110.574;
    return Math.round(widthKm * heightKm);
  }

  get areaValida(): boolean {
    return this.areaKm2 > 0 && this.areaKm2 <= 10000;
  }

  get diasRango(): number {
    if (!this.fechaInicio || !this.fechaFin) return 0;
    const d1 = new Date(this.fechaInicio).getTime();
    const d2 = new Date(this.fechaFin).getTime();
    if (isNaN(d1) || isNaN(d2) || d2 < d1) return 0;
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  }

  get rangoFechasValido(): boolean {
    return this.diasRango > 0 && this.diasRango <= 90;
  }

  limpiarBoundingBox() {
    this.boundingBox = null;
    this.modoDibujo = false;
  }

  mostrarMensajeExito(msg: string) {
    this.mensajeExito = msg;
    setTimeout(() => {
      this.mensajeExito = "";
    }, 3500);
  }
}

export const store = new SentinelStore();
