<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { Protocol } from 'pmtiles';
  
  import Buscador from './components/Buscador.svelte';
  import PanelPmtiles from './components/PanelPmtiles.svelte';
  import CapasActivas from './components/CapasActivas.svelte';
  import { capasState } from './state/capasState.svelte';

  let mapContainer: HTMLElement;
  let map: MapLibreMap;
  
  let isProcessingQueue = false;
  let mapLoaded = $state(false);

  /**
   * Sincroniza el estado global reactivo (capasState) con las capas reales de MapLibre.
   * Implementa un sistema de cola (Queue System) para añadir las imágenes secuencialmente
   * con un retardo de 100ms. Esto evita saturar el motor WebGL y el límite de 
   * conexiones HTTP concurrentes del navegador cuando el usuario carga múltiples PMTiles.
   */
  async function processLayerQueue() {
    if (isProcessingQueue || !mapLoaded || !map) return;
    isProcessingQueue = true;
    
    try {
      const stateLayers = capasState.capasActivas;
      const currentMapSources = map.getStyle()?.sources || {};
      
      // 1. Eliminar capas que ya no están en el estado
      const stateLayerIds = stateLayers.map(c => c.id);
      for (const sourceId in currentMapSources) {
        if (sourceId.startsWith('pmtiles-') && !stateLayerIds.includes(sourceId.replace('pmtiles-', ''))) {
          const id = sourceId.replace('pmtiles-', '');
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      }
      
      // 2. Añadir/Actualizar capas activas
      for (const capa of stateLayers) {
        const sourceId = `pmtiles-${capa.id}`;
        
        // Si no existe, la instanciamos con retardo
        if (!map.getSource(sourceId)) {
          const isMask = capa.url.includes('mask_clouds');
          
          if (isMask) {
            map.addSource(sourceId, {
              type: 'vector',
              url: `pmtiles://${window.location.origin}${capa.url}`
            });
            
            map.addLayer({
              id: capa.id,
              type: 'fill',
              source: sourceId,
              'source-layer': 'clouds',
              paint: {
                'fill-color': '#ff0000',
                'fill-opacity': capa.opacidad
              },
              layout: {
                visibility: capa.visible ? 'visible' : 'none'
              }
            });
          } else {
            map.addSource(sourceId, {
              type: 'raster',
              url: `pmtiles://${window.location.origin}${capa.url}`
            });
            
            map.addLayer({
              id: capa.id,
              type: 'raster',
              source: sourceId,
              minzoom: 0, // Fuerza overzoom desde lejos ignorando minzoom del PMTiles
              paint: {
                'raster-opacity': capa.opacidad
              },
              layout: {
                visibility: capa.visible ? 'visible' : 'none'
              }
            });
          }
          
          // Retardo para que el navegador no se ahogue con muchas peticiones Range seguidas
          await new Promise(r => setTimeout(r, 100));
        } else {
          // Si ya existe, actualizamos sus propiedades (Slider y Checkbox) muy rápido
          if (map.getLayer(capa.id)) {
            const isMask = capa.url.includes('mask_clouds');
            if (isMask) {
              map.setPaintProperty(capa.id, 'fill-opacity', capa.opacidad);
            } else {
              map.setPaintProperty(capa.id, 'raster-opacity', capa.opacidad);
            }
            map.setLayoutProperty(capa.id, 'visibility', capa.visible ? 'visible' : 'none');
          }
        }
      }
    } finally {
      isProcessingQueue = false;
    }
  }

  // Effect para reaccionar a cambios en capasActivas y en mapLoaded
  $effect(() => {
    // Al acceder a capasState.capasActivas Svelte 5 se suscribe a los cambios profundos
    const _capas = capasState.capasActivas;
    if (mapLoaded) {
      processLayerQueue();
    }
  });

  /**
   * Centra la cámara del mapa en un lugar geocodificado
   * @param lugar Objeto devuelto por el buscador nominatim con coords y boundingbox
   */
  function irALugar(lugar: any) {
    if (!map) return;
    const { boundingbox, lat, lon } = lugar;
    if (boundingbox) {
      const [latMin, latMax, lonMin, lonMax] = boundingbox.map(Number);
      map.fitBounds([ [lonMin, latMin], [lonMax, latMax] ], { padding: 50, duration: 1500 });
    } else {
      map.flyTo({ center: [Number(lon), Number(lat)], zoom: 12, duration: 1500 });
    }
  }

  onMount(() => {
    // Registramos PMTiles en MapLibre
    let protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    map = new MapLibreMap({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [1.74, 41.69],
      zoom: 7.5
    });

    map.on('load', () => {
      mapLoaded = true;
    });

    return () => {
      if (map) map.remove();
      maplibregl.removeProtocol('pmtiles');
    };
  });
</script>

<main class="app-layout">
  <div class="left-sidebar">
    <PanelPmtiles />
    <CapasActivas />
  </div>
  <Buscador onLugarSeleccionado={irALugar} />
  <div class="map-container" bind:this={mapContainer}></div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background-color: #0f172a;
  }

  .app-layout {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    position: relative;
  }

  .left-sidebar {
    position: absolute;
    top: 20px;
    left: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    z-index: 20;
    pointer-events: none; /* Dejar pasar los clicks al mapa... */
    max-height: calc(100vh - 40px);
  }

  /* ...pero capturar clicks en los hijos */
  .left-sidebar > :global(*) {
    pointer-events: auto;
  }

  .map-container {
    flex: 1;
    height: 100%;
    background-color: #0f172a;
  }
</style>
