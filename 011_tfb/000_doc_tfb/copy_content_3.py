import re

file_7 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_007.md"
file_8 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_008.md"

with open(file_7, "r", encoding="utf-8") as f:
    content_7 = f.read()

start_9_7 = content_7.find("# 9. Discusión y Análisis Crítico")
chunk_9_to_11 = content_7[start_9_7:]

with open(file_8, "r", encoding="utf-8") as f:
    content_8 = f.read()

start_9_8 = content_8.find("# 9. Discusión y limitaciones")

if start_9_8 != -1:
    content_8 = content_8[:start_9_8] + chunk_9_to_11
    with open(file_8, "w", encoding="utf-8") as f:
        f.write(content_8)
    print("Content copied successfully!")
else:
    print("Failed to find marker in 008")

