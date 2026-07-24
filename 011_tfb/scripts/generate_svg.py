import os

esa = [
    (0, "0: NO DATA", "#000000"),
    (1, "1: SATURATED / DEFECT", "#ff0000"),
    (2, "2: DARK AREA PIXELS", "#2f2f2f"),
    (3, "3: CLOUD SHADOWS", "#643200"),
    (4, "4: VEGETATION", "#00ff00"),
    (5, "5: BARE SOILS", "#ffff00"),
    (6, "6: WATER", "#0000ff"),
    (7, "7: UNCLASSIFIED", "#808080"),
    (8, "8: CLOUD (MEDIUM PROB)", "#c0c0c0"),
    (9, "9: CLOUD (HIGH PROB)", "#ffffff"),
    (10, "10: THIN CIRRUS", "#64c8ff"),
    (11, "11: SNOW / ICE", "#ff96ff")
]

ours = [
    (0, "0: NO DATA (Negro)", "#000000"),
    (1, "1: NUBE (Blanco)", "#ffffff"),
    (2, "2: SOMBRA (Gris)", "#808080"),
    (3, "3: NIEVE (Cian)", "#00ffff"),
    (4, "4: VEG/SUELO (Verde)", "#00ff00"),
    (5, "5: AGUA (Azul)", "#0000ff")
]

mapping = {
    0: 0, 1: 0, 7: 0,  # to NO DATA
    8: 1, 9: 1, 10: 1, # to NUBE
    2: 2, 3: 2,        # to SOMBRA
    11: 3,             # to NIEVE
    4: 4, 5: 4,        # to VEG/SUELO
    6: 5               # to AGUA
}

svg = ['<svg width="900" height="700" xmlns="http://www.w3.org/2000/svg">']
svg.append('<rect width="100%" height="100%" fill="#1e1e1e" rx="15"/>')
svg.append('<style>')
svg.append('.title { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: bold; fill: #ffffff; }')
svg.append('.label { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 15px; fill: #e2e8f0; }')
svg.append('.box { stroke: #475569; stroke-width: 2; }')
svg.append('.arrow { stroke: #64748b; stroke-width: 1.5; fill: none; stroke-dasharray: 4,4; }')
svg.append('</style>')

svg.append('<text x="50" y="50" class="title">Máscara ESA Sentinel-2 (12 Clases)</text>')
svg.append('<text x="550" y="50" class="title">Nuestra Ground Truth (6 Clases)</text>')

# Draw ESA
esa_y = {}
for i, (idx, label, color) in enumerate(esa):
    y = 100 + i * 45
    esa_y[idx] = y + 15
    svg.append(f'<rect x="50" y="{y}" width="30" height="30" fill="{color}" class="box" rx="5"/>')
    svg.append(f'<text x="95" y="{y+20}" class="label">{label}</text>')

# Draw Ours
our_y = {}
for i, (idx, label, color) in enumerate(ours):
    y = 150 + i * 75
    our_y[idx] = y + 15
    svg.append(f'<rect x="550" y="{y}" width="30" height="30" fill="{color}" class="box" rx="5"/>')
    svg.append(f'<text x="595" y="{y+20}" class="label" font-weight="bold">{label}</text>')

# Draw mapping arrows
for esa_idx, our_idx in mapping.items():
    y1 = esa_y[esa_idx]
    y2 = our_y[our_idx]
    
    # Path with bezier curve
    path = f'<path d="M 330,{y1} C 440,{y1} 440,{y2} 530,{y2}" class="arrow" />'
    svg.append(path)

svg.append('</svg>')

with open('/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/leyenda_comparativa.svg', 'w') as f:
    f.write('\\n'.join(svg))
print("SVG Generated.")
