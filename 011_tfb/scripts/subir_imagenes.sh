#!/bin/bash
# Script para sincronizar las imágenes satelitales (PMTiles) con el servidor de producción (Hetzner)
# Utiliza rsync para transferir únicamente los archivos nuevos o modificados, ahorrando ancho de banda.

# ==========================================
# CONFIGURACIÓN (Ajustar con la IP de tu VPS)
# ==========================================
VPS_IP="<IP_DE_TU_SERVIDOR>"
VPS_USER="root"

# Directorios de origen y destino
DIR_LOCAL="../visualizations/SCL_UNET_catalonia/"
DIR_REMOTO="/opt/gis_platform/011_tfb/visualizations/SCL_UNET_catalonia/"

echo "============================================="
echo "  Sincronización de PMTiles a Producción     "
echo "============================================="

# Comprobar si el directorio local existe
if [ ! -d "$DIR_LOCAL" ]; then
    echo "[!] Error: No se encuentra el directorio $DIR_LOCAL"
    exit 1
fi

echo "[*] Escaneando archivos locales y remotos..."
echo "[*] Conectando con $VPS_USER@$VPS_IP..."

# Comando rsync:
# -a : Modo archivo (recursivo, mantiene permisos)
# -v : Verbose (muestra lo que hace)
# -z : Comprime los datos durante la transferencia
# -h : Tamaños legibles por humanos
# --progress : Muestra barra de progreso por archivo
# --exclude : Ignora archivos temporales (tif, jp2) para subir SOLO lo que necesita el visor
rsync -avzh --progress \
    --exclude="*.tif" \
    --exclude="*.jp2" \
    --exclude="*.vrt" \
    --exclude="*.txt" \
    --exclude="*.tfw" \
    "$DIR_LOCAL" "$VPS_USER@$VPS_IP:$DIR_REMOTO"

if [ $? -eq 0 ]; then
    echo ""
    echo "[v] ¡Sincronización completada con éxito!"
    echo "[v] Los nuevos días ya deberían estar disponibles en el visor."
else
    echo ""
    echo "[!] Hubo un error durante la sincronización."
fi
