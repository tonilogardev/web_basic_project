# Lista Maestra de Gránulos Sentinel-2 para Descarga

Esta lista define los 40 gránulos exactos que el script de automatización deberá buscar y descargar desde Copernicus Data Space Ecosystem (CDSE). Está diseñada para maximizar la representatividad de "casos difíciles" (Hard Negatives).

## 1. Conjunto de Entrenamiento (Train/Val) - 30 Gránulos

| ID | Caso | Gránulo (Tile) | Época / Meses | Características requeridas (Condiciones) |
|---|---|---|---|---|
| TR_A01 | A: Nieve Pura | T31TCH / T31TDH | Ene - Mar | Valles totalmente nevados, 100% soleado (0% nubes). |
| TR_A02 | A: Nieve Pura | T31TCH / T31TDH | Ene - Mar | Valles totalmente nevados, 100% soleado (0% nubes). |
| TR_A03 | A: Nieve Pura | T31TCH / T31TDH | Ene - Mar | Valles totalmente nevados, 100% soleado (0% nubes). |
| TR_A04 | A: Nieve/Nube | T31TCH / T31TDH | Ene - Mar | Nieve en el suelo + nubes bajas cruzando valles o cimas tapadas. |
| TR_A05 | A: Nieve/Nube | T31TCH / T31TDH | Ene - Mar | Nieve en el suelo + nubes bajas cruzando valles o cimas tapadas. |
| TR_A06 | A: Nieve/Nube | T31TCH / T31TDH | Ene - Mar | Nieve en el suelo + nubes bajas cruzando valles o cimas tapadas. |
| TR_A07 | A: Nieve/Nube | T31TCH / T31TDH | Ene - Mar | Nieve en el suelo + nubes bajas cruzando valles o cimas tapadas. |
| TR_A08 | A: Nieve/Nube | T31TCH / T31TDH | Ene - Mar | Nieve en el suelo + nubes bajas cruzando valles o cimas tapadas. |
| TR_B01 | B: Niebla Invalle | T31TCG / T31TDG | Dic - Ene | Niebla espesa ("Boira") en la llanura de Lleida, montañas despejadas. |
| TR_B02 | B: Niebla Invalle | T31TCG / T31TDG | Dic - Ene | Niebla espesa ("Boira") en la llanura de Lleida, montañas despejadas. |
| TR_B03 | B: Niebla Invalle | T31TCG / T31TDG | Dic - Ene | Niebla espesa ("Boira") en la llanura de Lleida, montañas despejadas. |
| TR_B04 | B: Niebla Invalle | T31TCG / T31TDG | Dic - Ene | Niebla espesa ("Boira") en la llanura de Lleida, montañas despejadas. |
| TR_B05 | B: Cirros Verano | T31TCG / T31TDG | Jun - Jul | Cirros finos estriados y/o nubes convectivas (algodón), 0% nieve. |
| TR_B06 | B: Cirros Verano | T31TCG / T31TDG | Jun - Jul | Cirros finos estriados y/o nubes convectivas (algodón), 0% nieve. |
| TR_B07 | B: Cirros Verano | T31TCG / T31TDG | Jun - Jul | Cirros finos estriados y/o nubes convectivas (algodón), 0% nieve. |
| TR_B08 | B: Cirros Verano | T31TCG / T31TDG | Jun - Jul | Cirros finos estriados y/o nubes convectivas (algodón), 0% nieve. |
| TR_C01 | C: Urbano Brillante | T31TDF | Indiferente | 100% despejado sobre ciudad (naves industriales brillantes). |
| TR_C02 | C: Urbano Brillante | T31TDF | Indiferente | 100% despejado sobre ciudad (naves industriales brillantes). |
| TR_C03 | C: Nube sobre Mar | T31TDF | Indiferente | Parcialmente nublado sobre mar oscuro y ciudad. |
| TR_C04 | C: Nube sobre Mar | T31TDF | Indiferente | Parcialmente nublado sobre mar oscuro y ciudad. |
| TR_C05 | C: Nube sobre Mar | T31TDF | Indiferente | Parcialmente nublado sobre mar oscuro y ciudad. |
| TR_C06 | C: Nube sobre Mar | T31TDF | Indiferente | Parcialmente nublado sobre mar oscuro y ciudad. |
| TR_C07 | C: Bruma Costera | T31TDF | Indiferente | Neblina marina o contaminación sobre la costa. |
| TR_C08 | C: Bruma Costera | T31TDF | Indiferente | Neblina marina o contaminación sobre la costa. |
| TR_D01 | D: Delta Inundado | T31TCE / T31TCF | May - Jun | Arrozales inundados (espejos de agua) + parcial nublado. |
| TR_D02 | D: Delta Inundado | T31TCE / T31TCF | May - Jun | Arrozales inundados (espejos de agua) + parcial nublado. |
| TR_D03 | D: Delta Inundado | T31TCE / T31TCF | May - Jun | Arrozales inundados (espejos de agua) + parcial nublado. |
| TR_D04 | D: Llanura Pálida | T31TCE / T31TCF | Agosto | Llanura seca pálida con algunas nubes medias cruzando. |
| TR_D05 | D: Llanura Pálida | T31TCE / T31TCF | Agosto | Llanura seca pálida con algunas nubes medias cruzando. |
| TR_D06 | D: Llanura Pálida | T31TCE / T31TCF | Agosto | Llanura seca pálida con algunas nubes medias cruzando. |

## 2. Conjunto de Test Oculto (Blind Test) - 10 Gránulos

*Atención: Este conjunto se mantendrá aislado durante el entrenamiento.*

| ID | Estación | Gránulo (Tile) | Mes | Características requeridas (Condiciones) |
|---|---|---|---|---|
| TE_01 | Invierno | T31TCH / T31TDH | Febrero | Nieve densa + nubes parciales cruzando las montañas. |
| TE_02 | Invierno | T31TCH / T31TDH | Febrero | Nieve densa + nubes parciales cruzando las montañas. |
| TE_03 | Invierno | T31TCG | Enero | Niebla espesa en la llanura interior. |
| TE_04 | Invierno | T31TCG | Enero | Niebla espesa en la llanura interior. |
| TE_05 | Invierno | T31TDF | Diciembre | Sol bajo (sombras largas) en edificios y costa. |
| TE_06 | Verano/Transición| T31TDG | Abr - May | Nieve derritiéndose en cimas + nubes de primavera. |
| TE_07 | Verano/Transición| T31TDG | Abr - May | Nieve derritiéndose en cimas + nubes de primavera. |
| TE_08 | Verano | T31TDF | Agosto | Nubes de tormenta estival sobre mar y ciudad. |
| TE_09 | Verano | T31TDF | Agosto | Nubes de tormenta estival sobre mar y ciudad. |
| TE_10 | Verano | T31TCE | Julio | Delta del Ebro parcialmente despejado (arrozales verdes). |
