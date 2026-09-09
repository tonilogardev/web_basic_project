#!/bin/bash

# =================================================================
# Script: dev.run.sh
# Propósito: Ciclo de limpieza y levantamiento en desarrollo (WSL)
# =================================================================

# 1. Validación de existencia del archivo .env.development
if [ ! -f .env.development ]; then
    echo "ERROR: No se encuentra el archivo .env.development"
    echo "Copia el archivo de ejemplo o configúralo antes de continuar."
    exit 1
fi

echo "Iniciando entorno de desarrollo..."

# 2. Parar contenedores actuales y limpiar huérfanos
echo "Stopping containers..."
docker compose --env-file .env.development down --remove-orphans

# 3. Limpieza de temporales (prune)
# Mantenemos el entorno limpio de imágenes sin nombre y volúmenes basura
echo "Cleaning Docker artifacts..."
docker system prune -f
docker image prune -f

# 4. Construir y Levantar
echo "Building and launching services on localhost..."
docker compose --env-file .env.development up --build -d

echo "Entorno listo. Servicios corriendo en segundo plano."