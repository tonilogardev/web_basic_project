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

export type BandPreset =
  | { id: string; label: string; type: 'rgb'; assets: [string, string, string] | string[]; rescale: [number, number]; expression?: undefined; colormap_name?: undefined }
  | { id: string; label: string; type: 'expression'; assets: string[]; expression: string; rescale: [number, number]; colormap_name?: string }
  | { id: string; label: string; type: 'external_api'; assets?: undefined; rescale?: undefined; expression?: undefined; colormap_name?: undefined };

class SentinelStore {
  satelite = $state("sentinel-2");
  coberturaNubes = $state(20);
  maxResults = $state<number | 'all'>('all');
  fechaInicio = $state("");
  fechaFin = $state("");
  boundingBox = $state<[number, number, number, number] | null>(null);
  modoDibujo = $state(false);

  resultados = $state<StacFeature[]>([]);
  escenasVisibles = $state<Set<string>>(new Set());
  cargando = $state(false);
  busquedaRealizada = $state(false);
  resultadosColapsado = $state(false);

  cargaCapasPendiente = $state(false);
  mensajeCarga = $state("Loading...");
  progresoCarga = $state(0);
  mensajeExito = $state("");

  iniciarCargaCapas(mensaje: string = "Downloading image tiles...") {
    this.cargaCapasPendiente = true;
    this.mensajeCarga = mensaje;
  }

  finalizarCargaCapas(mensajeExito?: string) {
    this.cargaCapasPendiente = false;
    if (mensajeExito) {
      this.mostrarMensajeExito(mensajeExito);
    }
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

  toggleEscena(featureId: string) {
    const nuevaSet = new Set(this.escenasVisibles);
    if (nuevaSet.has(featureId)) {
      nuevaSet.delete(featureId);
    } else {
      nuevaSet.add(featureId);
    }
    this.escenasVisibles = nuevaSet;
  }

  limpiarTodasLasCapas() {
    this.escenasVisibles = new Set();
  }

  toggleTodas() {
    if (this.escenasVisibles.size === this.resultados.length) {
      this.limpiarTodasLasCapas();
    } else {
      const nuevaSet = new Set<string>();
      for (const r of this.resultados) {
        nuevaSet.add(r.id);
      }
      this.escenasVisibles = nuevaSet;
    }
  }
}

export const store = new SentinelStore();
