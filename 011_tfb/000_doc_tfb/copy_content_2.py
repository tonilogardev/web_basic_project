import re

file_7 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_007.md"
file_8 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_008.md"

with open(file_7, "r", encoding="utf-8") as f:
    content_7 = f.read()

# Extract from 7 to 8
start_7 = content_7.find("# 7. Desarrollo viable y sostenible")
end_8 = content_7.find("# 8. Proceso y resultados")
chunk_7 = content_7[start_7:end_8]

# Extract from 9 to EOF
start_9 = content_7.find("# 9. Discusión y limitaciones")
chunk_9_to_11 = content_7[start_9:]

with open(file_8, "r", encoding="utf-8") as f:
    content_8 = f.read()

# Replace in 008 for section 7
start_idx_8 = content_8.find("# 7. Desarrollo viable y sostenible")
end_idx_8 = content_8.find("# 8. Proceso y resultados")
if start_idx_8 != -1 and end_idx_8 != -1:
    content_8 = content_8[:start_idx_8] + chunk_7 + content_8[end_idx_8:]
else:
    print("Could not find section 7 markers in 008")

# Replace in 008 for section 9 to EOF
start_9_8 = content_8.find("# 9. Discusión y limitaciones")
if start_9_8 != -1:
    content_8 = content_8[:start_9_8] + chunk_9_to_11
else:
    print("Could not find section 9 marker in 008")

with open(file_8, "w", encoding="utf-8") as f:
    f.write(content_8)

print("Content copied successfully!")
