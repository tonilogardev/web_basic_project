import os
from pathlib import Path
import rasterio
from gimp_tools import decode_to_classes

def main():
    print("="*50)
    print(" DECODIFICADOR DE GIMP -> MACHINE LEARNING ")
    print("="*50)
    
    base_dir = Path(__file__).parent.parent / "visualizations" / "SCL_UNET"
    
    if not base_dir.exists():
        print("[-] No se encontró el directorio de visualizaciones.")
        return
        
    gimp_files = list(base_dir.glob("*_SCL_UNET_GIMP.tif"))
    if not gimp_files:
        print("[!] No se han encontrado archivos editados (_SCL_UNET_GIMP.tif) en la carpeta visualizations/SCL_UNET")
        print("Asegúrate de editar los archivos a color en GIMP y guardarlos sobreescribiendo el mismo archivo.")
        return
        
    print(f"[*] Encontrados {len(gimp_files)} archivos GIMP para decodificar.")
    
    for gimp_file in gimp_files:
        print(f"\n[>] Analizando colores de: {gimp_file.name}")
        
        # Buscar el TIF original para robarle el perfil espacial (CRS, Transform)
        original_tif = Path(str(gimp_file).replace('_GIMP.tif', '.tif'))
        base_profile = None
        if original_tif.exists():
            with rasterio.open(original_tif) as src:
                base_profile = src.profile
        else:
            print("    [!] Aviso: No se encontró el TIF matemático original. Se guardará usando la cabecera de GIMP.")
            
        # El archivo de salida será _SCL_edited.tif
        out_tif = Path(str(gimp_file).replace('_SCL_UNET_GIMP.tif', '_SCL_edited.tif'))
        
        if decode_to_classes(gimp_file, out_tif, base_profile):
            print(f"    [v] Reconstrucción matemática completada: {out_tif.name}")
            print(f"    [+] Listo para ser usado como 'Golden Ground Truth'.")
        else:
            print("    [-] Error al decodificar.")
            
    print("\n[+] Proceso finalizado. Puedes borrar los archivos _GIMP.tif si ya no los necesitas.")

if __name__ == "__main__":
    main()
