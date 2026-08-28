import re

with open("/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_008.md", "r", encoding="utf-8") as f:
    doc8 = f.read()

c9_start = doc8.find("# 9. Discusión y Análisis Crítico")
chapters_9_to_11 = doc8[c9_start:]

with open("/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_010.md", "a", encoding="utf-8") as f:
    f.write("\n\n" + chapters_9_to_11)

print("Chapters 9, 10 and 11 restored successfully!")
