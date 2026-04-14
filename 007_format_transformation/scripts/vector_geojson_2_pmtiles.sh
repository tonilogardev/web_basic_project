#!/bin/bash

# Asegura contexto de ejecución
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR" || exit

shopt -s nullglob
FILES=(input/*.geojson input/*.json)

if [ ${#FILES[@]} -eq 0 ]; then
    echo "ERROR: No hay archivos GeoJSON en la carpeta input/"
    exit 1
fi

echo "Iniciando GeoJSON -> PMTiles pipeline usando Tippecanoe..."

for file in "${FILES[@]}"; do
    filename=$(basename "$file")
    name="${filename%.*}"
    
    echo "======================================"
    echo "⏳ Transformando: $filename -> $name.pmtiles"
    echo "======================================"
    
    docker compose run --rm tippecanoe "tippecanoe -f -Z0 -z15 --drop-densest-as-needed -o output/${name}.pmtiles input/${filename}"
    
    echo "✅ Terminado: output/${name}.pmtiles"
    echo ""
done

echo "Transformación Completa. Puedes subirlos a /006_cassini_hackathons/public/data/vector"
