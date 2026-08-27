import json
import os

log_path = "/home/a.lopez.g/.gemini/antigravity-ide/brain/2c32e46c-d06e-4f38-ab3c-6642f59a321a/.system_generated/logs/transcript.jsonl"
out_path = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/historial_chat_recuperado.md"

try:
    with open(log_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    with open(out_path, 'w', encoding='utf-8') as out:
        out.write("# Historial del Chat Recuperado\n\n")
        out.write("> **Nota:** Este es el historial recuperado de nuestra sesión anterior donde hablábamos del TFB.\n\n---\n\n")
        for line in lines:
            try:
                data = json.loads(line)
                if data.get("type") == "USER_INPUT":
                    content = data.get("content", "").replace("<USER_REQUEST>", "").replace("</USER_REQUEST>", "").strip()
                    # Clean up the metadata part
                    if "<ADDITIONAL_METADATA>" in content:
                        content = content.split("<ADDITIONAL_METADATA>")[0].strip()
                    out.write(f"### 👤 Tú:\n\n{content}\n\n---\n\n")
                elif data.get("type") == "PLANNER_RESPONSE":
                    content = data.get("content", "").strip()
                    out.write(f"### 🤖 Asistente:\n\n{content}\n\n---\n\n")
            except Exception as e:
                pass
    print(f"Éxito: Archivo guardado en {out_path}")
except Exception as e:
    print(f"Error: {e}")
