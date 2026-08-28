import re

file_7 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_007.md"
file_8 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_008.md"
file_10 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_010.md"

with open(file_7, "r", encoding="utf-8") as f:
    content_7 = f.read()

# Extract Portada, Resumen, Abstract (everything before ## Índice interactivo)
index_marker = "## Índice interactivo"
end_header_idx = content_7.find(index_marker)
if end_header_idx != -1:
    header = content_7[:end_header_idx]
else:
    header = ""

with open(file_8, "r", encoding="utf-8") as f:
    content_8 = f.read()

# Assemble 010
new_content = header + content_8

with open(file_10, "w", encoding="utf-8") as f:
    f.write(new_content)

print("010.md created successfully!")
