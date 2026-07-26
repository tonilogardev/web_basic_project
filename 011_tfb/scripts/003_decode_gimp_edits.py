"""
Script de decodificación (GIMP Bridge).

Este módulo revierte el proceso de curación visual. Toma los archivos TIFF multicapa
(`_SCL_GIMP.tif`) editados manualmente en GIMP, extrae la capa de la máscara y la
decodifica de vuelta a tensores matemáticos estrictos (valores 0-4). Esto genera
la Verdad Terreno (*Ground Truth*) absoluta libre de sesgos.
"""

import os
from pathlib import Path
import rasterio
from gimp_tools import decode_multilayer_to_classes


def main():
    print("=" * 50)
    print(" DECODIFICADOR DE GIMP -> MACHINE LEARNING ")
    print("=" * 50)

    base_download_dir = Path(__file__).parent.parent / "download"

    if not base_download_dir.exists():
        print("[-] No se encontró el directorio de descargas.")
        return

    # Buscar todos los archivos _SCL_GIMP.tif en las carpetas de training y test
    gimp_files = list(base_download_dir.glob("training/*/*_SCL_GIMP.tif")) + \
                 list(base_download_dir.glob("test/*/*_SCL_GIMP.tif"))

    if not gimp_files:
        print(
            "[!] No se han encontrado archivos editados (_SCL_GIMP.tif) en download/training o download/test."
        )
        print(
            "Asegúrate de editar los archivos a color en GIMP y guardarlos sobreescribiendo el mismo archivo."
        )
        return

    print(f"[*] Encontrados {len(gimp_files)} archivos multicapa GIMP para decodificar.")

    for gimp_file in gimp_files:
        print(f"\n[>] Extrayendo y analizando máscara de: {gimp_file.name}")

        # Buscamos el archivo VRT del ColorReal asociado para robarle el perfil espacial.
        # Es mucho más seguro robarlo del VRT original porque tiene la georreferencia pura e inalterada,
        # mientras que el TIFF guardado por GIMP puede haber perdido (o corrompido) sus tags espaciales.
        vrt_file = Path(str(gimp_file).replace("_SCL_GIMP.tif", "_ColorReal.vrt"))
        base_profile = None
        
        try:
            if vrt_file.exists():
                with rasterio.open(vrt_file) as src:
                    base_profile = src.profile
            else:
                # Fallback: intentar leer del propio TIFF si el VRT no existe
                with rasterio.open(gimp_file) as src:
                    base_profile = src.profile
        except Exception as e:
            print(f"    [!] Aviso: No se pudo leer el perfil de {vrt_file.name}. Error: {e}")

        # El archivo de salida será _SCL_edited.tif en la misma carpeta
        out_tif = Path(str(gimp_file).replace("_SCL_GIMP.tif", "_SCL_edited.tif"))

        if decode_multilayer_to_classes(gimp_file, out_tif, base_profile):
            print(f"    [v] Reconstrucción matemática completada: {out_tif.name}")
            print(f"    [+] Listo para ser usado como 'Golden Ground Truth'.")
        else:
            print("    [-] Error al decodificar la capa de la máscara.")

    print(
        "\n[+] Proceso finalizado. Tus máscaras matemáticas (_SCL_edited.tif) han sido generadas."
    )


if __name__ == "__main__":
    main()
