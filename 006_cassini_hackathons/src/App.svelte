<script lang="ts">
  import { onMount } from "svelte";
  import maplibregl from "maplibre-gl";
  import { Protocol, PMTiles } from "pmtiles";
  import "maplibre-gl/dist/maplibre-gl.css";

  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map;

  // --- ESTADO DE INTERFAZ ---
  let sidebarOpen = true; // Por defecto abierto

  // --- CONFIGURACIÓN DE CAPAS ---
  const RASTERS = [
    "01_landuse_aligned_to_dem",
    "02_buildings_aligned",
    "03_roads_aligned",
    "04_curve_number_cn",
    "05_impervious_mask_buildings_roads",
    "06_runoff_local_mm",
    "07_local_volume_m3",
    "07_local_volume_mm",
    "08_accumulated_volume_m3",
    "08_accumulated_volume_m3_log",
    "08_accumulated_volume_m3_log_nearest_neigh",
    "09_upstream_area_km2",
    "10_flood_index",
    "11_flood_hotspots",
  ];

  const VECTORS = [
    { id: "barris_BDN", label: "Barrios (Polígonos)", color: "#3b82f6" },
    { id: "viales_bdn", label: "Viales (Líneas)", color: "#10b981" },
  ];

  // --- ESTADO REACTIVO CAPAS ---
  let activeRaster = RASTERS[0];
  let activeVectors = new Set(VECTORS.map((v) => v.id));

  $: if (map && map.loaded()) {
    RASTERS.forEach((id) => {
      const visibility = id === activeRaster ? "visible" : "none";
      if (map.getLayer(`layer-raster-${id}`)) {
        map.setLayoutProperty(`layer-raster-${id}`, "visibility", visibility);
      }
    });
  }

  $: if (map && map.loaded()) {
    VECTORS.forEach((v) => {
      const visibility = activeVectors.has(v.id) ? "visible" : "none";
      if (map.getLayer(`layer-vector-${v.id}-fill`)) {
        map.setLayoutProperty(
          `layer-vector-${v.id}-fill`,
          "visibility",
          visibility,
        );
      }
      if (map.getLayer(`layer-vector-${v.id}-line`)) {
        map.setLayoutProperty(
          `layer-vector-${v.id}-line`,
          "visibility",
          visibility,
        );
      }
    });
  }

  function toggleVector(id: string) {
    if (activeVectors.has(id)) {
      activeVectors.delete(id);
    } else {
      activeVectors.add(id);
    }
    activeVectors = activeVectors;
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  async function zoomToLayer(filename: string, type: "raster" | "vector") {
    const url = `${window.location.origin}/data/${type}/${filename}.pmtiles`;
    const p = new PMTiles(url);
    try {
      const header = await p.getHeader();
      map.flyTo({
        center: [header.centerLon, header.centerLat],
        zoom: header.centerZoom || 14,
        duration: 1000,
      });

      // Auto-cerrar menú en móviles al hacer click en una capa
      if (window.innerWidth <= 768) {
        sidebarOpen = false;
      }
    } catch (e) {
      console.error("Error al centrar:", e);
    }
  }

  onMount(() => {
    // Si es pantalla pequeña (móvil/tablet), empieza cerrado
    if (window.innerWidth <= 768) {
      sidebarOpen = false;
    }

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    map = new maplibregl.Map({
      container: mapContainer,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            paint: { "raster-opacity": 0.4 },
          },
        ],
      },
      center: [2.247, 41.45],
      zoom: 13,
      attributionControl: false,
    });

    map.on("load", async () => {
      RASTERS.forEach((id) => {
        map.addSource(`src-raster-${id}`, {
          type: "raster",
          url: `pmtiles://${window.location.origin}/data/raster/${id}.pmtiles`,
          tileSize: 256,
        });
        map.addLayer({
          id: `layer-raster-${id}`,
          type: "raster",
          source: `src-raster-${id}`,
          layout: { visibility: id === activeRaster ? "visible" : "none" },
        });
      });

      VECTORS.forEach((v) => {
        map.addSource(`src-vector-${v.id}`, {
          type: "vector",
          url: `pmtiles://${window.location.origin}/data/vector/${v.id}.pmtiles`,
        });
        map.addLayer({
          id: `layer-vector-${v.id}-fill`,
          type: "fill",
          source: `src-vector-${v.id}`,
          "source-layer": v.id,
          paint: { "fill-color": v.color, "fill-opacity": 0.3 },
        });
        map.addLayer({
          id: `layer-vector-${v.id}-line`,
          type: "line",
          source: `src-vector-${v.id}`,
          "source-layer": v.id,
          paint: { "line-color": v.color, "line-width": 2 },
        });
      });

      await zoomToLayer(activeRaster, "raster");
    });

    return () => map?.remove();
  });
</script>

<button class="toggle-btn" on:click={toggleSidebar} aria-label="Toggle Menu">
  {#if sidebarOpen}
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      ><line x1="18" y1="6" x2="6" y2="18"></line><line
        x1="6"
        y1="6"
        x2="18"
        y2="18"
      ></line></svg
    >
  {:else}
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      ><line x1="3" y1="12" x2="21" y2="12"></line><line
        x1="3"
        y1="6"
        x2="21"
        y2="6"
      ></line><line x1="3" y1="18" x2="21" y2="18"></line></svg
    >
  {/if}
</button>

<div class="sidebar {sidebarOpen ? 'open' : ''}">
  <header>
    <h2>Explorador Hidrológico</h2>
  </header>

  <section>
    <h3>Capas Ráster (Análisis)</h3>
    <div class="layer-list">
      {#each RASTERS as id}
        <label class="layer-item {activeRaster === id ? 'active' : ''}">
          <input
            type="radio"
            name="raster"
            value={id}
            bind:group={activeRaster}
            on:change={() => zoomToLayer(id, "raster")}
          />
          <span>{id.replace(/_/g, " ").replace(/^\d+_/, "")}</span>
        </label>
      {/each}
    </div>
  </section>

  <section>
    <h3>Capas Vectoriales (Contexto)</h3>
    <div class="layer-list">
      {#each VECTORS as v}
        <label class="layer-item {activeVectors.has(v.id) ? 'active' : ''}">
          <input
            type="checkbox"
            checked={activeVectors.has(v.id)}
            on:change={() => toggleVector(v.id)}
          />
          <span style="border-left: 4px solid {v.color}; padding-left: 8px;"
            >{v.label}</span
          >
        </label>
      {/each}
    </div>
  </section>
</div>

<div class="map-wrapper" bind:this={mapContainer}></div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-family: "Inter", system-ui, sans-serif;
    background: #0f172a;
  }

  /* El mapa ahora ocupa SIEMPRE toda la pantalla */
  .map-wrapper {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  /* Botón flotante */
  .toggle-btn {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 30;
    width: 44px;
    height: 44px;
    background: #1e293b;
    color: #f8fafc;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    transition: background 0.2s;
  }

  .toggle-btn:hover {
    background: #334155;
  }

  .toggle-btn svg {
    width: 24px;
    height: 24px;
  }

  /* Sidebar flotante con animación */
  .sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 320px;
    background: rgba(30, 41, 59, 0.95);
    backdrop-filter: blur(10px);
    color: #f8fafc;
    z-index: 20;
    display: flex;
    flex-direction: column;
    box-shadow: 4px 0 15px rgba(0, 0, 0, 0.5);
    overflow-y: auto;
    /* Comienza oculta desplazada a la izquierda */
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Clase que activa la visibilidad */
  .sidebar.open {
    transform: translateX(0);
  }

  /* Desplazamos el contenido del header para no chocar con el botón flotante */
  header {
    padding: 24px 24px 24px 76px;
    border-bottom: 1px solid #334155;
  }
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #3b82f6;
  }

  section {
    padding: 20px;
    border-bottom: 1px solid #334155;
  }
  h3 {
    margin: 0 0 12px 0;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #94a3b8;
  }

  .layer-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .layer-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.2s;
    border: 1px solid transparent;
  }

  .layer-item:hover {
    background: #334155;
  }
  .layer-item.active {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    color: #60a5fa;
  }

  input {
    cursor: pointer;
  }

  /* Ajustes para móviles */
  @media (max-width: 768px) {
    .sidebar {
      width: 100%; /* Ocupa toda la pantalla al abrirse */
      max-width: 360px;
    }
  }
</style>
