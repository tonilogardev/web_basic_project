import re

with open("/tmp/draft_8.md", "r", encoding="utf-8") as f:
    text = f.read()

# Extract chapter 8
c8_start = text.find("# 8. Proceso y resultados")
c9_start = text.find("# 9. Discusión")
if c9_start == -1:
    cap8 = text[c8_start:]
else:
    cap8 = text[c8_start:c9_start]

# Inject into 009.md
with open("/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_009.md", "r", encoding="utf-8") as f:
    doc9 = f.read()

c8_start_9 = doc9.find("# 8. Proceso y resultados")
c9_start_9 = doc9.find("# 9. Discusión y limitaciones")

# replace the empty headers in 009 with the populated cap8
doc9 = doc9[:c8_start_9] + cap8 + "\n\n" + doc9[c9_start_9:]

with open("/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_009.md", "w", encoding="utf-8") as f:
    f.write(doc9)

print("Chapter 8 injected successfully!")
