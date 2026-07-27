import csv

csv_path = '000_tiles_2025-01-01_T31TDG_SCL_GIMP/000_tiles_2025-01-01_T31TDG_SCL_GIMP.csv'
data = [
    ['tile_name', 'has_errors'],
    ['tile_0.png', 'No'],
    ['tile_1.png', 'Sí (Nubes gigantes clasificadas como suelo)'],
    ['tile_2.png', 'Sí (Bordes de nube erróneos y sombras imposibles)'],
    ['tile_3.png', 'No'],
    ['tile_4.png', 'Sí (Nubes clasificadas como suelo y sombras desalineadas)']
]

with open(csv_path, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(data)

print("CSV actualizado por el agente.")
