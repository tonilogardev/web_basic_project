import re

with open("/tmp/draft_5_6.md", "r", encoding="utf-8") as f:
    text = f.read()

# Extract chapter 6
c6_start = text.find("# 6. Metodología aplicada")
cap6 = text[c6_start:]

# Inject into 009.md
with open("/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_009.md", "r", encoding="utf-8") as f:
    doc9 = f.read()

c6_start_9 = doc9.find("# 6. Metodología aplicada")
c7_start_9 = doc9.find("# 7. Desarrollo viable y sostenible")

# replace the empty headers in 009 with the populated cap6
doc9 = doc9[:c6_start_9] + cap6 + "\n\n" + doc9[c7_start_9:]

with open("/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_009.md", "w", encoding="utf-8") as f:
    f.write(doc9)

print("Chapter 6 injected successfully!")
