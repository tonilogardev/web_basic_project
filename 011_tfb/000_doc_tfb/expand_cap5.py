import re

with open("/tmp/draft_5_6.md", "r", encoding="utf-8") as f:
    text = f.read()

# Extract chapter 5 up to chapter 6
c5_start = text.find("# 5. Marco teórico y conceptos clave")
c6_start = text.find("# 6. Metodología aplicada")
cap5 = text[c5_start:c6_start]

# Remove 5.2.5
sec_525_start = cap5.find("### 5.2.5. Líneas de Evolución Algorítmica (Trabajo Futuro)")
sec_53_start = cap5.find("## 5.3. Estrategia de Datos y Decisiones Arquitectónicas")
cap5 = cap5[:sec_525_start] + cap5[sec_53_start:]

# Inject into 009.md
with open("/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_009.md", "r", encoding="utf-8") as f:
    doc9 = f.read()

c5_start_9 = doc9.find("# 5. Marco teórico y conceptos clave")
c6_start_9 = doc9.find("# 6. Metodología aplicada")

# replace the empty headers in 009 with the populated cap5
doc9 = doc9[:c5_start_9] + cap5 + doc9[c6_start_9:]

with open("/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_009.md", "w", encoding="utf-8") as f:
    f.write(doc9)

print("Chapter 5 injected successfully!")
