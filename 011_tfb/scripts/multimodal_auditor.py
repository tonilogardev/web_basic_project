import os
import csv
import time
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

# Cargar variables de entorno (.env)
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("\n[!] ERROR CRÍTICO: No se ha encontrado GEMINI_API_KEY.")
    print("Para usar la IA Multimodal como Auditor, necesitas añadir tu clave API de Google Gemini al archivo .env")
    print("Ejemplo en .env: GEMINI_API_KEY=AIzaSyTuClaveAcreta...")
    exit(1)

client = genai.Client(api_key=API_KEY)
# Por defecto he puesto gemini-2.5-flash por ser rápido/barato, pero si quieres la máxima
# capacidad de razonamiento para las montañas, puedes usar gemini-1.5-pro o el gemini-3.1-pro
MODEL_ID = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

tiles_dir = 'download/training/2025-01-01_T31TDG/000_tiles_2025-01-01_T31TDG_SCL_GIMP_FULL'
csv_path = os.path.join(tiles_dir, '000_tiles_2025-01-01_T31TDG_SCL_GIMP_FULL.csv')
output_csv_path = os.path.join(tiles_dir, '000_tiles_2025-01-01_T31TDG_SCL_GIMP_FULL_EVALUATED.csv')

prompt = """
Eres un experto auditor geoespacial. Tu tarea es la técnica "Early Visual Fusion".
Se te presenta un recorte dividido horizontalmente en 3 paneles idénticos en coordenadas:
1. Panel Izquierdo: Banda visible (Color Real).
2. Panel Central: Banda Infrarroja (Falso Color Nieve).
3. Panel Derecho: Máscara SCL de clasificación actual.

Leyenda de la Máscara SCL:
- Clase 0 (Negro): Nodata / Sin clasificar
- Clase 1 (Blanco): Nube
- Clase 2 (Gris): Sombra de nube
- Clase 3 (Cian): Nieve / Hielo
- Clase 4 (Verde): Vegetación / Suelo desnudo (incluye sombras topográficas)
- Clase 5 (Azul): Agua

Analiza visualmente la congruencia entre la Máscara (derecha) y la realidad espectral (izquierda y centro).
Presta especial atención a:
1. Si hay Nubes (masas blancas opacas) clasificadas erróneamente como Vegetación (Verde).
2. Píxeles Nodata (Negros) que deberían ser otra clase (mirando qué hay en esa zona en los otros paneles).
3. Sombras de montañas que deben ser Clase 4 (Verde), no Clase 2 (Gris).

Responde ESTRICTAMENTE en formato JSON válido con la siguiente estructura:
{
  "has_errors": true o false,
  "description": "Describe brevemente los errores encontrados (ej. 'Nube clasificada como vegetación en el centro'). Si no hay errores, escribe 'Correcto'.",
  "nodata_fixes": "Indica qué clase deberían tener los píxeles negros nodata (ej. 'Los nodata del sur son sombras topográficas (Clase 4)'). Si no hay nodata, escribe 'No aplica'."
}
"""

def evaluate_tile(image_path, retries=3):
    for attempt in range(retries):
        try:
            img = Image.open(image_path)
            response = client.models.generate_content(
                model=MODEL_ID,
                contents=[prompt, img],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1, # Queremos respuestas muy deterministas
                ),
            )
            return response.text
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f" [Cuota excedida. Esperando 20s (intento {attempt+1}/{retries})]...", end='', flush=True)
                time.sleep(20)
            else:
                print(f" Error en API al evaluar {image_path}: {e}")
                return None
    return None

if not os.path.exists(csv_path):
    print(f"No se encontró el CSV base en: {csv_path}")
    exit(1)

# Leer la lista de tiles del CSV base generado anteriormente
tiles_to_process = []
with open(csv_path, 'r') as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        tiles_to_process.append(row[0])

print(f"Iniciando Auditoría Multimodal de {len(tiles_to_process)} tiles...")
print(f"Modelo: {MODEL_ID}\n")

# Preparar archivo de salida
with open(output_csv_path, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['tile_name', 'has_errors', 'description', 'nodata_fixes'])
    
    for i, tile_name in enumerate(tiles_to_process):
        img_path = os.path.join(tiles_dir, tile_name)
        
        # Saltar si no existe la imagen
        if not os.path.exists(img_path):
            continue
            
        print(f"[{i+1}/{len(tiles_to_process)}] Analizando {tile_name}...", end='', flush=True)
        
        result_json = evaluate_tile(img_path)
        
        if result_json:
            try:
                data = json.loads(result_json)
                writer.writerow([tile_name, data.get('has_errors'), data.get('description'), data.get('nodata_fixes')])
                print(" HECHO")
            except json.JSONDecodeError:
                writer.writerow([tile_name, 'ERROR', 'Fallo al parsear JSON de la IA', 'N/A'])
                print(" ERROR JSON")
        else:
            writer.writerow([tile_name, 'ERROR', 'Fallo de conexión API', 'N/A'])
            print(" ERROR API")
            
        # Pausa para respetar cuotas de la API (rate limits)
        time.sleep(2)

print(f"\n[v] Auditoría completada. El veredicto de la IA está guardado en:")
print(output_csv_path)
