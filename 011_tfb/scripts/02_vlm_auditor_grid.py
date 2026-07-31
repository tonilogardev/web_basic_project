import os
import time
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

# Cargar variables de entorno
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("ERROR: Faltan credenciales GEMINI_API_KEY en .env")
    exit(1)

client = genai.Client(api_key=API_KEY)
# Para este pipeline recomendamos el modelo Pro por la complejidad espacial
MODEL_ID = os.getenv("GEMINI_MODEL", "gemini-3.1-pro-preview")

BASE_DIR = 'download/training/2025-01-01_T31TDG'
IN_DIR = os.path.join(BASE_DIR, '001_grid_tiles')
META_PATH = os.path.join(IN_DIR, 'tiles_metadata.json')
OUT_PATH = os.path.join(IN_DIR, 'audit_results.json')

# El Grid Prompt (La clave de la arquitectura híbrida)
PROMPT = """
Actúa como un experto GIS. Se te presenta una imagen satelital con 3 paneles alineados:
1. Color Real (Izquierda)
2. Falso Color Nieve (Centro)
3. Máscara de clasificación con CUADRÍCULA (Derecha)

Leyenda Máscara: 0=Nodata(Negro), 1=Nube(Blanco), 2=Sombra(Gris), 3=Nieve(Cian), 4=Vegetación/Suelo(Verde), 5=Agua(Azul).

Analiza estrictamente si hay errores de clasificación comparando la máscara con los otros dos paneles (ej. Nubes gruesas clasificadas como vegetación (verde), o nodatas (negros) que deberían tener una clase real).
La cuadrícula de la máscara usa columnas A-H y filas 1-8.

Si encuentras un error claro, devuelve la celda y la clase correcta.
TU RESPUESTA DEBE SER ESTRICTAMENTE ESTE JSON, SIN TEXTO EXTRA, NI MARKDOWN:
[
  {"celda": "A4", "nueva_clase": 1},
  {"celda": "C2", "nueva_clase": 4}
]

Si la clasificación es correcta o los errores son ambiguos, devuelve una lista vacía: []
"""

def evaluate_tile(image_path, retries=3):
    for attempt in range(retries):
        try:
            img = Image.open(image_path)
            response = client.models.generate_content(
                model=MODEL_ID,
                contents=[PROMPT, img],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0, # Determinismo máximo
                ),
            )
            return response.text
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f" [Rate Limit. Esperando 20s (intento {attempt+1}/{retries})]...", end='', flush=True)
                time.sleep(20)
            else:
                print(f" Error API: {e}")
                return None
    return None

def main():
    if not os.path.exists(META_PATH):
        print(f"No se encontró {META_PATH}. Ejecuta el script 01_grid_tiling.py primero.")
        return

    with open(META_PATH, 'r') as f:
        metadata = json.load(f)

    audit_results = {}
    # Limite temporal para la prueba
    MAX_TILES = 5
    print(f"Iniciando Auditoría VLM de {MAX_TILES} baldosas (Prueba) usando {MODEL_ID}...")
    
    for i, (tile_name, _) in enumerate(metadata.items()):
        if i >= MAX_TILES:
            break
            
        img_path = os.path.join(IN_DIR, tile_name)
        print(f"[{i+1}/{MAX_TILES}] Auditando {tile_name}...", end='', flush=True)
        
        result_str = evaluate_tile(img_path)
        
        if result_str:
            try:
                # Limpieza defensiva por si el modelo devuelve markdown
                result_str = result_str.replace("```json", "").replace("```", "").strip()
                data = json.loads(result_str)
                audit_results[tile_name] = data
                print(f" HECHO ({len(data)} celdas corregidas)")
            except json.JSONDecodeError:
                audit_results[tile_name] = []
                print(" ERROR JSON")
        else:
            audit_results[tile_name] = []
            print(" ERROR API")
            
        time.sleep(2) # Respetar cuotas de la API Free Tier
        
    with open(OUT_PATH, 'w') as f:
        json.dump(audit_results, f, indent=2)
        
    print(f"\n[v] Auditoría VLM completada. Archivo generado: {OUT_PATH}")

if __name__ == "__main__":
    main()
