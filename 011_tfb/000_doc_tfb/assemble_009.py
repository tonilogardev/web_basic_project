import re

file_7 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_007.md"
file_8 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_008.md"
file_9 = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_009.md"

with open(file_7, "r", encoding="utf-8") as f:
    content_7 = f.read()

# Extract chapter 5, but remove 5.2.5
c5_start = content_7.find("# 5. Marco teórico y conceptos clave")
c6_start = content_7.find("# 6. Metodología aplicada")
chunk_5 = content_7[c5_start:c6_start]

# Remove 5.2.5 from chunk 5
sec_525_start = chunk_5.find("### 5.2.5. Líneas de Evolución Algorítmica (Trabajo Futuro)")
sec_53_start = chunk_5.find("## 5.3. Estrategia de Datos y Decisiones Arquitectónicas")
if sec_525_start != -1 and sec_53_start != -1:
    chunk_5 = chunk_5[:sec_525_start] + chunk_5[sec_53_start:]

# Extract chapter 6
c7_start = content_7.find("# 7. Desarrollo viable y sostenible")
chunk_6 = content_7[c6_start:c7_start]

# Extract chapter 8
c8_start = content_7.find("# 8. Proceso y resultados")
c9_start = content_7.find("# 9. Discusión y Análisis Crítico")
chunk_8 = content_7[c8_start:c9_start]

# Now assemble using 008 as base
with open(file_8, "r", encoding="utf-8") as f:
    content_8 = f.read()

# Replace chapter 5 in 008
c5_start_8 = content_8.find("# 5. Marco teórico y conceptos clave")
c6_start_8 = content_8.find("# 6. Metodología aplicada")
content_8 = content_8[:c5_start_8] + chunk_5 + content_8[c6_start_8:]

# After above replacement, the index for c6 has changed. Find it again.
c6_start_8 = content_8.find("# 6. Metodología aplicada")
c7_start_8 = content_8.find("# 7. Desarrollo viable y sostenible")
content_8 = content_8[:c6_start_8] + chunk_6 + content_8[c7_start_8:]

# Find c8 and replace
c8_start_8 = content_8.find("# 8. Proceso y resultados")
c9_start_8 = content_8.find("# 9. Discusión y limitaciones")
content_8 = content_8[:c8_start_8] + chunk_8 + content_8[c9_start_8:]

with open(file_9, "w", encoding="utf-8") as f:
    f.write(content_8)

print("Assembly complete!")
