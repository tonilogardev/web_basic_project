import os
import json
import torch
import re
from PIL import Image
from dotenv import load_dotenv
from transformers import AutoProcessor, PaliGemmaForConditionalGeneration

# Configuración básica
BASE_DIR = 'download/training/2025-01-01_T31TDG'
IN_DIR = os.path.join(BASE_DIR, '002_paligemma_tiles')
META_FILE = os.path.join(IN_DIR, 'tiles_metadata.json')
OUT_JSON = os.path.join(IN_DIR, 'audit_results_paligemma.json')
MODEL_ID = "google/paligemma-3b-mix-224"

# Cargar variables de entorno (HF_TOKEN)
load_dotenv(os.path.join("scripts", ".env"))

def extract_bboxes(text):
    """
    Extrae tokens <locXXXX> y los convierte a coordenadas normalizadas [0, 1].
    PaliGemma devuelve: <locYMIN><locXMIN><locYMAX><locXMAX> texto
    Donde XXXX va de 0000 a 1023.
    """
    # Regex para capturar 4 locs consecutivos
    pattern = r'<loc(\d{4})><loc(\d{4})><loc(\d{4})><loc(\d{4})>\s*(.*)'
    matches = re.finditer(pattern, text)
    
    bboxes = []
    for match in matches:
        ymin = int(match.group(1)) / 1024.0
        xmin = int(match.group(2)) / 1024.0
        ymax = int(match.group(3)) / 1024.0
        xmax = int(match.group(4)) / 1024.0
        label = match.group(5).strip()
        bboxes.append({
            "ymin": ymin, "xmin": xmin, "ymax": ymax, "xmax": xmax, "label": label
        })
    return bboxes

def main():
    if not os.path.exists(META_FILE):
        print(f"Error: No se encuentra {META_FILE}. Ejecuta el paso 1 primero.")
        exit(1)
        
    with open(META_FILE, 'r') as f:
        metadata = json.load(f)

    print(f"[*] Inicializando procesador y descargando/cargando modelo: {MODEL_ID}")
    print("[*] Esto puede tardar unos minutos la primera vez (descarga de ~6GB)...")
    
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    print(f"[*] Dispositivo de inferencia: {device}")
    
    hf_token = os.getenv("HF_TOKEN")
    
    # Cargamos el modelo en bfloat16 para ahorrar memoria (requiere Ampere o superior, pero funciona en Pascal con algo de emulación o fp16)
    # Para mayor compatibilidad en P5000 (Pascal), usamos float16
    processor = AutoProcessor.from_pretrained(MODEL_ID, token=hf_token)
    model = PaliGemmaForConditionalGeneration.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16,
        device_map=device,
        token=hf_token
    ).eval()
    
    # Límite para procesar el gránulo entero
    MAX_TILES = 9999
    print(f"\n[*] Iniciando Auditoría VLM en todas las baldosas con PaliGemma Local.")
    
    # Prompt específico de PaliGemma para detección
    prompt = "detect cloud"
    
    audit_results = {}
    
    for i, (tile_name, tile_meta) in enumerate(metadata.items()):
        if i >= MAX_TILES:
            break
            
        img_path = os.path.join(IN_DIR, tile_name)
        print(f"[{i+1}/{MAX_TILES}] Procesando {tile_name}...", end='', flush=True)
        
        try:
            image = Image.open(img_path).convert("RGB")
            
            # El procesador prepara la imagen y el texto
            inputs = processor(text=prompt, images=image, return_tensors="pt").to(device, torch.float16)
            
            # Inferencia
            with torch.inference_mode():
                outputs = model.generate(**inputs, max_new_tokens=100)
                
            # Decodificamos solo los tokens nuevos generados (ignoramos el prompt)
            generated_ids = outputs[0][inputs['input_ids'].shape[1]:]
            result_text = processor.decode(generated_ids, skip_special_tokens=False)
            
            # Extraemos las coordenadas
            bboxes = extract_bboxes(result_text)
            
            # Traducimos de normalizado [0,1] a píxeles locales [0, 512]
            local_edits = []
            if bboxes:
                for b in bboxes:
                    local_edits.append({
                        "ymin": int(b["ymin"] * 512),
                        "xmin": int(b["xmin"] * 512),
                        "ymax": int(b["ymax"] * 512),
                        "xmax": int(b["xmax"] * 512),
                        "label": b["label"],
                        "new_class": 1 # Forzamos a Nube según la leyenda
                    })
                print(f" ¡{len(local_edits)} cajas detectadas!")
            else:
                print(" OK (sin nubes)")
                
            audit_results[tile_name] = {
                "errores": local_edits
            }
            
        except Exception as e:
            print(f" Error: {e}")
            audit_results[tile_name] = {"errores": []}
            
    with open(OUT_JSON, 'w') as f:
        json.dump(audit_results, f, indent=2)
        
    print(f"\n[v] Auditoría local completada. Resultados en {OUT_JSON}")

if __name__ == "__main__":
    main()
