import re

file_7 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_007.md"
file_8 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_008.md"

with open(file_7, "r", encoding="utf-8") as f:
    content_7 = f.read()

start_marker = "## Glosario de Términos"
end_marker = "# 5. Marco teórico y conceptos clave"

start_idx = content_7.find(start_marker)
end_idx = content_7.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found in 007")
    exit(1)

extracted_chunk = content_7[start_idx:end_idx]

with open(file_8, "r", encoding="utf-8") as f:
    content_8 = f.read()

start_idx_8 = content_8.find(start_marker)
end_idx_8 = content_8.find(end_marker)

if start_idx_8 == -1 or end_idx_8 == -1:
    print("Markers not found in 008")
    exit(1)

new_content_8 = content_8[:start_idx_8] + extracted_chunk + content_8[end_idx_8:]

with open(file_8, "w", encoding="utf-8") as f:
    f.write(new_content_8)

print("Content copied successfully!")
