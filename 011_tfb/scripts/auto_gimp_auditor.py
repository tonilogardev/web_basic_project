import os
from pathlib import Path
import rasterio
import numpy as np
import shutil

# Colores mapeados en el proyecto (GIMP)
COLOR_SUELO = [34, 139, 34]
COLOR_AGUA = [0, 0, 255]
COLOR_NUBE = [255, 255, 255]
COLOR_SOMBRA = [100, 100, 100]
COLOR_NIEVE = [0, 255, 255]
COLOR_NODATA = [0, 0, 0]

def auto_audit_gimp_file(granule_dir: Path):
    """
    Escanea la matriz SCL, y si encuentra sombras o NoData, consulta 
    las imágenes de Color Real y Falso Color para diagnosticar si es un arrozal (agua).
    """
    scl_path = granule_dir / f"{granule_dir.name}_SCL_GIMP.tif"
    real_path = granule_dir / f"{granule_dir.name}_ColorReal.tif"
    falso_path = granule_dir / f"{granule_dir.name}_FalsoColor_Nieve.tif"
    
    out_path = granule_dir / f"{granule_dir.name}_SCL_GIMP_AUDITED.tif"

    if not all([scl_path.exists(), real_path.exists(), falso_path.exists()]):
        print(f"[-] Faltan archivos TIF base en {granule_dir}")
        return False

    print(f"[*] Iniciando Auditoría Algorítmica en {granule_dir.name}...")

    # Copiamos para no romper el original y trabajar sobre el auditado
    shutil.copy(scl_path, out_path)

    with rasterio.open(out_path, 'r+') as src_scl, \
         rasterio.open(real_path) as src_real, \
         rasterio.open(falso_path) as src_falso:
         
        scl = src_scl.read()  # (3, 1830, 1830)
        
        # Leemos y redimensionamos a 60m (1830) usando slicing (factor 6)
        real = src_real.read()[:, ::6, ::6]   # (3, 1830, 1830)
        falso = src_falso.read()[:, ::6, ::6] # (3, 1830, 1830)
        
        # 1. Buscar píxeles conflictivos en la SCL original (Sombras y NoData)
        mask_nodata = (scl[0] == 0) & (scl[1] == 0) & (scl[2] == 0)
        mask_sombra = (scl[0] == 100) & (scl[1] == 100) & (scl[2] == 100)
        
        conflict_mask = mask_nodata | mask_sombra
        
        total_conflictivos = np.sum(conflict_mask)
        print(f"    [>] Se han detectado {total_conflictivos} píxeles clasificados como Sombra o NoData.")
        
        # 2. Extraer propiedades físicas
        # En Falso Color (SWIR), el agua absorbe mucha luz (valores RGB bajos)
        # En Color Real, los arrozales suelen ser muy oscuros o verdosos.
        # Simplificación heurística para arrozales en el Delta (y masas de agua profunda mal clasificadas):
        # Si el falso color es oscuro (SWIR absorbido) -> Agua
        # (El falso color RGB en esta visualización: R~B12, G~B8A, B~B04)
        
        # Calcular luminosidad en Falso Color (Promedio RGB)
        # Convertimos a int32 para evitar overflow
        falso_int = falso.astype(np.int32)
        falso_lum = (falso_int[0] + falso_int[1] + falso_int[2]) / 3.0
        
        # Umbral heurístico: Si la luminosidad en falso color es baja, es agua/arrozal.
        # Si es nube brillante, la luminosidad será alta.
        # Establecemos un umbral empírico basado en inspección visual (< 100)
        is_water = falso_lum < 100
        
        # Combinamos: Es conflictivo Y se comporta físicamente como agua
        water_anomalies = conflict_mask & is_water
        
        # 3. Aplicar Pincel Digital a clase Agua [0, 0, 255]
        scl[0][water_anomalies] = COLOR_AGUA[0]
        scl[1][water_anomalies] = COLOR_AGUA[1]
        scl[2][water_anomalies] = COLOR_AGUA[2]
        
        corrections = np.sum(water_anomalies)
        print(f"    [+] Se han re-clasificado matemáticamente {corrections} píxeles anómalos a la clase 'Masas de Agua'.")
        
        # Escribir de vuelta
        src_scl.write(scl)
        
    print(f"[v] Archivo curado guardado en: {out_path.name}\n")
    return True

if __name__ == "__main__":
    base_dir = Path("/dades/antonio/tfb/download/training/2021-06-09_T31TCF/")
    auto_audit_gimp_file(base_dir)
