from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uuid
import os
import time
import asyncio
from fastapi import BackgroundTasks
from processor import process_water_quality

# Create output directory for TIFs
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "public")
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = FastAPI(title="Water Quality API")

# Allow requests from our Svelte frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/public", StaticFiles(directory=OUTPUT_DIR), name="public")

class AnalyzeRequest(BaseModel):
    stac_item_id: str
    bbox: list[float]  # [minLng, minLat, maxLng, maxLat]

def cleanup_old_files():
    """Borra archivos TIF en OUTPUT_DIR que tengan más de 1 hora de antigüedad."""
    now = time.time()
    for filename in os.listdir(OUTPUT_DIR):
        if filename.endswith(".tif"):
            filepath = os.path.join(OUTPUT_DIR, filename)
            # Si el archivo tiene más de 3600 segundos (1 hora)
            if os.stat(filepath).st_mtime < now - 3600:
                try:
                    os.remove(filepath)
                except Exception as e:
                    print(f"Error borrando archivo antiguo {filepath}: {e}")

@app.get("/")
def read_root():
    return {"status": "Water Quality API is running"}

@app.post("/api/analyze")
async def analyze_water(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    try:
        # Programar la limpieza en segundo plano para no frenar esta petición
        background_tasks.add_task(cleanup_old_files)
        
        # Run the heavy numpy processor in a background thread to not block FastAPI
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            process_water_quality,
            request.stac_item_id,
            request.bbox,
            OUTPUT_DIR
        )

        # We use the internal docker DNS name so Titiler (in the same network) can fetch it
        classification_url = f"http://water-quality-api:8000/public/{result['classification_tif']}"
        rgb_url = f"http://water-quality-api:8000/public/{result['rgb_tif']}"
        
        return {
            "status": "success", 
            "classification_url": classification_url,
            "rgb_url": rgb_url,
            "job_id": result['classification_tif']
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
