<script lang="ts">
  import { onMount } from "svelte";
  import maplibregl from "maplibre-gl";
  import { Protocol, PMTiles } from "pmtiles";

  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map;
  let mapLoaded = false;

  // Listado de ficheros según tu estructura de carpetas
  const rasters = [
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
  const vectors = ["barris_BDN", "viales_bdn"];

  let activeRaster = rasters[0];
  let activeVector = "none";

  // Función para obtener la extensión y hacer zoom
  async function zoomToPmtiles(filename: string, isRaster: boolean) {
    const type = isRaster ? "raster" : "vector";
    const url = `${window.location.origin}/data/${type}/${filename}.pmtiles`;
    const p = new PMTiles(url);

    try {
      const header = await p.getHeader();
      console.log(`Extensión de ${filename}:`, [
        header.minLon,
        header.minLat,
        header.maxLon,
        header.maxLat,
      ]);

      map.fitBounds(
        [
          [header.minLon, header.minLat],
          [header.maxLon, header.maxLat],
        ],
        { padding: 50, duration: 2000 },
      );
    } catch (e) {
      console.error(`Error leyendo cabecera de ${filename}:`, e);
    }
  }

  onMount(() => {
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
            id: "osm-layer",
            type: "raster",
            source: "osm",
            paint: { "raster-opacity": 0.4 }, // Bajamos opacidad para resaltar tus datos
          },
        ],
      },
      center: [1.5, 41.8], // Cataluña inicial
      zoom: 7,
      attributionControl: false,
    });

    map.on("load", async () => {
      mapLoaded = true;

      // 1. Cargar fuentes y capas
      for (const id of rasters) {
        const url = `${window.location.origin}/data/raster/${id}.pmtiles`;
        map.addSource(`src-${id}`, {
          type: "raster",
          url: `pmtiles://${url}`,
          tileSize: 256,
        });
        map.addLayer({
          id: `layer-${id}`,
          type: "raster",
          source: `src-${id}`,
          layout: { visibility: id === activeRaster ? "visible" : "none" },
        });
      }

      for (const id of vectors) {
        const url = `${window.location.origin}/data/vector/${id}.pmtiles`;
        map.addSource(`src-${id}`, { type: "vector", url: `pmtiles://${url}` });
        map.addLayer({
          id: `layer-${id}-line`,
          type: "line",
          source: `src-${id}`,
          "source-layer": id,
          paint: { "line-color": "#4ade80", "line-width": 2 },
          layout: { visibility: "none" },
        });
      }

      // 2. Ejecutar Zoom a la primera imagen
      await zoomToPmtiles(activeRaster, true);
    });

    return () => map.remove();
  });

  // Reactividad para los checks
  $: if (mapLoaded && map) {
    rasters.forEach((id) => {
      if (map.getLayer(`layer-${id}`)) {
        map.setLayoutProperty(
          `layer-${id}`,
          "visibility",
          id === activeRaster ? "visible" : "none",
        );
      }
    });
    vectors.forEach((id) => {
      if (map.getLayer(`layer-${id}-line`)) {
        map.setLayoutProperty(
          `layer-${id}-line`,
          "visibility",
          id === activeVector ? "visible" : "none",
        );
      }
    });
  }
</script>

<div class="legend">
  <div class="section">
    <h3>Modelos Raster</h3>
    {#each rasters as r}
      <label class:active={activeRaster === r}>
        <input type="radio" bind:group={activeRaster} value={r} />
        {r.split("_").slice(1).join(" ")}
      </label>
    {/each}
  </div>

  <div class="section">
    <h3>Capas Vector</h3>
    <label
      ><input type="radio" bind:group={activeVector} value="none" /> Ninguna</label
    >
    {#each vectors as v}
      <label class:active={activeVector === v}>
        <input type="radio" bind:group={activeVector} value={v} />
        {v}
      </label>
    {/each}
  </div>
</div>

<div class="map-wrapper" bind:this={mapContainer}></div>

<style>
  .map-wrapper {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: #000;
  }
  .legend {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 10;
    width: 280px;
    background: rgba(10, 10, 12, 0.8);
    backdrop-filter: blur(8px);
    padding: 20px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    font-family: sans-serif;
  }
  .section {
    margin-bottom: 20px;
  }
  h3 {
    font-size: 0.8rem;
    text-transform: uppercase;
    color: #4ade80;
    margin-bottom: 10px;
  }
  label {
    display: block;
    padding: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    border-radius: 4px;
  }
  label.active {
    background: rgba(74, 222, 128, 0.2);
  }
  input {
    margin-right: 10px;
  }
</style>
