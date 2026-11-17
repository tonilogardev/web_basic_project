import type { StyleSpecification } from 'maplibre-gl';

export type BasemapKey = 'esritopo' | 'opentopo' | 'liberty';

// High-availability global topographic map (Esri World Topo)
export const esriTopoStyle: StyleSpecification = {
  version: 8,
  sources: {
    esritopo: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        'Tiles &copy; Esri &mdash; National Geographic, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China',
    },
  },
  layers: [
    {
      id: 'esritopo-layer',
      type: 'raster',
      source: 'esritopo',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

// Topographic raster map specification (OpenTopoMap)
export const openTopoStyle: StyleSpecification = {
  version: 8,
  sources: {
    opentopomap: {
      type: 'raster',
      tiles: [
        'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 17,
      attribution:
        'Map data: &copy; <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a> (CC-BY-SA)',
    },
  },
  layers: [
    {
      id: 'opentopo-layer',
      type: 'raster',
      source: 'opentopomap',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const libertyStyle = 'https://tiles.openfreemap.org/styles/liberty';

export function getStyleSpec(styleKey: BasemapKey): StyleSpecification | string {
  if (styleKey === 'opentopo') return openTopoStyle;
  if (styleKey === 'liberty') return libertyStyle;
  return esriTopoStyle;
}
