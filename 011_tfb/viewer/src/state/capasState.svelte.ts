/**
 * Estructura de datos para una capa PMTiles cargada en MapLibre.
 * Representa de forma individualizada la capa RGB o la máscara.
 */
export type CapaPMTiles = {
  id: string;          
  granulo: string;     
  tipo: 'RGB' | 'Mask';
  url: string;         
  visible: boolean;    
  opacidad: number;    
};

/**
 * Estado global reactivo (Svelte 5) para manejar los PMTiles.
 * @property seleccionados Lista de gránulos base activos.
 * @property capasActivas Lista detallada de sub-capas (RGB y Mask) generadas a partir de los gránulos.
 */
export const capasState = $state({
  seleccionados: [] as string[],
  capasActivas: [] as CapaPMTiles[]
});

/**
 * Activa o desactiva un gránulo específico.
 * Si se activa, genera sus dos capas hijas (RGB y Máscara) con sus opacidades por defecto.
 * @param granulo Identificador base del gránulo (ej: 2025-01-01_T31TCF)
 */
export function toggleGranulo(granulo: string) {
  if (capasState.seleccionados.includes(granulo)) {
    // Eliminar de seleccionados
    capasState.seleccionados = capasState.seleccionados.filter(g => g !== granulo);
    // Eliminar las capas (RGB y Mask) relacionadas con este gránulo
    capasState.capasActivas = capasState.capasActivas.filter(c => c.granulo !== granulo);
  } else {
    // Añadir a seleccionados
    capasState.seleccionados.push(granulo);
    
    // Generar un timestamp para evitar la caché del navegador
    const version = Date.now();
    
    // Añadir capa RGB por defecto visible 100%
    capasState.capasActivas.push({
      id: `${granulo}_ColorReal`,
      granulo,
      tipo: 'RGB',
      url: `/data/${granulo}_ColorReal.pmtiles?v=${version}`, // Se sirven dinámicamente desde el volumen /data
      visible: true,
      opacidad: 1.0
    });
    
    // Añadir capa Mask por defecto visible 100% (según indicación)
    capasState.capasActivas.push({
      id: `${granulo}_mask_clouds`,
      granulo,
      tipo: 'Mask',
      url: `/data/${granulo}_mask_clouds.pmtiles?v=${version}`, // Se sirven dinámicamente desde el volumen /data
      visible: true,
      opacidad: 1.0
    });
  }
}

/**
 * Selecciona todos los gránulos de la lista de opciones disponibles.
 * @param opciones Array de gránulos válidos disponibles en disco
 */
export function selectAllGranulos(opciones: string[]) {
  capasState.seleccionados = [];
  capasState.capasActivas = [];
  opciones.forEach(granulo => toggleGranulo(granulo));
}

/**
 * Limpia totalmente la selección de gránulos y capas activas.
 */
export function selectNoneGranulos() {
  capasState.seleccionados = [];
  capasState.capasActivas = [];
}

/**
 * Invierte la selección actual. Desmarca los seleccionados y selecciona los que no lo estaban.
 * @param opciones Array de gránulos válidos disponibles en disco
 */
export function invertSelectionGranulos(opciones: string[]) {
  const nuevosSeleccionados = opciones.filter(op => !capasState.seleccionados.includes(op));
  selectNoneGranulos();
  nuevosSeleccionados.forEach(granulo => toggleGranulo(granulo));
}

/**
 * Actualiza el estado reactivo individual de una sub-capa (ej: ajustar su opacidad o visibilidad).
 * @param id ID único de la sub-capa (ej: 2025-01-01_T31TCF_ColorReal)
 * @param partialState Objeto con las propiedades parciales a modificar
 */
export function updateCapaState(id: string, partialState: Partial<CapaPMTiles>) {
  const index = capasState.capasActivas.findIndex(c => c.id === id);
  if (index !== -1) {
    capasState.capasActivas[index] = { ...capasState.capasActivas[index], ...partialState };
  }
}
