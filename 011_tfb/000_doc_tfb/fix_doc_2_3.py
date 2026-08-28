import re

file_path = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_007.md"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace Chapter 2 and 3
start_marker = "# 2. Justificación\n"
end_marker = "# 4. Objetivos generales y específicos"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers for chapters 2-3 not found!")
    exit(1)

new_ch23 = """# 2. Justificación

La correcta monitorización de las coberturas terrestres mediante satélites es un pilar fundamental para la toma de decisiones estratégicas, desde la gestión de recursos hídricos frente a sequías (vital para organismos como la Agencia Catalana del Agua) hasta el monitoreo de la masa forestal. Sin embargo, los mapas espaciales defectuosos, ocluidos por nubes no detectadas o falsos positivos, generan decisiones tardías y perjudiciales. Este Trabajo Final de Bàtxelor se justifica por la necesidad imperativa de dotar al sector geomático de una arquitectura predictiva superior que supere las limitaciones matemáticas de los algoritmos clásicos, democratizando el acceso a máscaras espaciales de alta fidelidad.

# 3. Contextualización del problema (El límite de Sen2Cor)

Para comprender el alcance del reto técnico, es necesario analizar dónde colapsa la precisión del estándar europeo Sen2Cor. Al depender de árboles de decisión estáticos y umbrales radiométricos rígidos, la algoritmia clásica muestra deficiencias críticas en ecosistemas geográficamente heterogéneos como Cataluña, dando lugar a tres anomalías de clasificación principales que este proyecto pretende erradicar:

1. **Ambigüedad espectral de la Nieve:** Sen2Cor confunde frecuentemente la firma espectral altamente reflectiva de la nieve de alta montaña (Pirineos) con los frentes de nubes gruesas.
2. **Falsos positivos por Sombras Topográficas:** El algoritmo europeo carece de percepción orográfica profunda, por lo que a menudo clasifica la sombra oscura natural que proyecta un relieve escarpado como si fuera la sombra proyectada por una nube, llenando los valles de falsas nubes.
3. **Anomalías hídricas (El Delta del Ebro):** Las grandes masas de agua profunda son diagnosticadas erróneamente como sombras, mientras que los terrenos con alta saturación hídrica (arrozales inundados) generan destellos especulares (*Sun Glint*) que ciegan al algoritmo, induciéndole a predecir densos bancos de nubes inexistentes.

"""

content = content[:start_idx] + new_ch23 + content[end_idx:]

# 2. Add References to Chapter 11
ref_marker = "Wieland, M., Li, Y., & Martinis, S. (2019). Multi-sensor cloud and cloud shadow segmentation with a convolutional neural network. *Remote Sensing of Environment, 230*, 111203. https://doi.org/10.1016/j.rse.2019.05.022\n\n"

ref_idx = content.find(ref_marker)
if ref_idx != -1:
    new_refs = """Zhu, Z., & Woodcock, C. E. (2012). Object-based cloud and cloud shadow detection in Landsat imagery. *Remote Sensing of Environment, 118*, 83-94. https://doi.org/10.1016/j.rse.2011.10.028

Zupanc, A. (2017). Improving Cloud Detection with Machine Learning. *Sentinel Hub Blog*. Recuperado de https://medium.com/sentinel-hub/improving-cloud-detection-with-machine-learning-c09dc5d7cf13

"""
    content = content[:ref_idx + len(ref_marker)] + new_refs + content[ref_idx + len(ref_marker):]
else:
    print("Reference marker not found!")


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Replaced successfully!")
