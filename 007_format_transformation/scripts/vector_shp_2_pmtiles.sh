#!/bin/bash

# Asegura contexto de ejecución
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR" || exit

shopt -s nullglob
FILES=(input/*.shp)

if [ ${#FILES[@]} -eq 0 ]; then
    echo "ERROR: No hay archivos Shapefile (.shp) en la carpeta input/. Asegúrate de poner también sus ficheros hermanos (.shx, .dbf, .prj)."
    exit 1
fi

echo "Iniciando SHP -> PMTiles pipeline usando GDAL (Intermedio) + Tippecanoe..."

for file in "${FILES[@]}"; do
    filename=$(basename "$file")
    name="${filename%.*}"
    
    echo "======================================"
    echo "⏳ Transformando Shapefile: $filename"
    echo "======================================"
    
    # 1. GDAL (Ogr2ogr) traduce el binario SHP a GeoJSON en la carpeta output
    echo "   [1/2] GDAL -> Extrayendo geometrías a GeoJSON temporal..."
    docker compose run --rm gdal "ogr2ogr -f GeoJSON output/${name}_temp.geojson input/${filename}"
    
    # 2. Tippecanoe comprime el GeoJSON a PMTiles
    echo "   [2/2] Tippecanoe -> Comprimiendo en pirámide PMTiles (0-15)..."
    docker compose run --rm tippecanoe "tippecanoe -f -Z0 -z15 --drop-densest-as-needed -o output/${name}.pmtiles output/${name}_temp.geojson"
    
    # 3. Limpieza de rastros
    echo "   [3/3] Limpiando archivos intermedios..."
    rm -f "output/${name}_temp.geojson"
    
    echo "✅ Terminado: output/${name}.pmtiles"
    echo ""
done

echo "Transformación Shapefile Completa. Puedes subirlos a /006_cassini_hackathons/public/data/vector"
