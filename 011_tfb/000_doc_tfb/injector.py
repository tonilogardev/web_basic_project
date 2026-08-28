import os

target = "000_entrega_03_antonio_lopez_006.md"
backup = "000_entrega_03_antonio_lopez_006_backup.md"

def read_file(path):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read() + "\n\n"
    return ""

with open(backup, "r", encoding="utf-8") as f:
    lines = f.readlines()

out = []
for line in lines:
    out.append(line)
    stripped = line.strip()
    
    if stripped == "# 2. Justificación":
        out.append("\n" + read_file("006_DEM_not_DEM.md"))
        
    elif stripped == "## 5.2. Inteligencia Artificial: La Arquitectura U-Net":
        out.append("\n" + read_file("001_machine_learning_model.md"))
        out.append(read_file("009_unet_architecture.md"))
        
    elif stripped == "## 6.2. Materiales (Conjunto de datos)":
        out.append("\n" + read_file("002_data_set_sentinel_2.md"))
        
    elif stripped == "# 6. Metodología aplicada":
        out.append("\n" + read_file("004_model_business_logic.md"))
        out.append(read_file("011_entrega_2_metodologia_final.md"))
        
    elif stripped == "## 8.1. Fase 0: Selección de Escenas (Exploración Visual)":
        out.append("\n" + read_file("003_type_granule.md"))
        
    elif stripped == "## 8.2. Fase 1: Ingesta de Datos (Ingeniería ETL)":
        out.append("\n" + read_file("005_execute_download_sentinel.md"))
        
    elif stripped == "## 8.3. Fase 2: Auditoría Visual y Verdad Terreno":
        out.append("\n" + read_file("012_edit_gimp.md"))
        out.append(read_file("008_pixel_legend.md"))
        
    elif stripped == "## 8.4. Fase 3: Ingeniería de Datos, Tiling y Void Filtering":
        out.append("\n" + read_file("007_create_dataset.md"))
        
    elif stripped == "## 8.5. Fase 4: Modelado y Entrenamiento U-Net":
        out.append("\n" + read_file("010_training_pipeline.md"))
        
    elif stripped == "## 8.6. Fase 5: Inferencia Masiva y Evaluación Ciega":
        out.append("\n" + read_file("014_evaluation_results.md"))
        out.append(read_file("013_test_with_SCL_edited.md"))
        
    elif stripped == "## 8.7. Fase 6: Empaquetado y Despliegue Estático (Web GIS)":
        out.append("\n" + read_file("015_serverless_inference.md"))

with open(target, "w", encoding="utf-8") as f:
    f.writelines(out)

print("Inyección teórica completada.")
