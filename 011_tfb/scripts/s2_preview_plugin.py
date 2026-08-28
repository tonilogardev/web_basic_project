# === Copernicus preview (COGs) — INTERSECTS + paginación + Clean rectangle + Cloud ≤ (%) + Union extent ===
# UI: misión (solo Sentinel-2 habilitado), fechas, “Select coordinates”, “Clean coordinate rectangle”, “Show images”
# Filtro: incluir escenas con cloud_cover ≤ UMBRAL y SIEMPRE incluir escenas sin dato de nubes
# Capas = id STAC + sufijo _XX%_clouds; grupos por fecha = <S2A|S2B>_<YYYYMMDD>_<proc>_L2A
# Metadatos en capa: stac_id, cloud_cover

from qgis.PyQt.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QPushButton, QPlainTextEdit,
    QMessageBox, QLabel, QDateEdit, QListWidget, QComboBox, QSpinBox
)
from qgis.PyQt.QtCore import QDate
from qgis.core import (
    QgsProject, QgsCoordinateTransform, QgsCoordinateReferenceSystem,
    QgsRectangle, QgsGeometry, QgsWkbTypes, QgsRasterLayer
)
from qgis.gui import QgsMapTool, QgsRubberBand, QgsVertexMarker, QgsHighlight
from osgeo import gdal

import json, os, tempfile, re, urllib.parse

# HTTP helper (requests si existe; si no, urllib)
try:
    import requests
    _HAS_REQUESTS = True
except Exception:
    from urllib.request import Request, urlopen
    from urllib.error import URLError, HTTPError
    _HAS_REQUESTS = False

canvas = iface.mapCanvas()

# GDAL remoto
gdal.SetConfigOption('CPL_VSIL_CURL_ALLOWED_EXTENSIONS', '.tif,.tiff,.vrt,.png,.jpg,.jpeg')
gdal.SetConfigOption('GDAL_DISABLE_READDIR_ON_OPEN', 'YES')

# ---- Limpieza de overlays (no borra capas) ----
def _kill(obj):
    try: obj.hide()
    except Exception: pass
    try:
        if isinstance(obj, QgsRubberBand):
            obj.reset(QgsWkbTypes.PolygonGeometry)
            obj.reset(QgsWkbTypes.LineGeometry)
    except Exception: pass
    try: obj.deleteLater()
    except Exception: pass

def clear_overlays(canvas):
    for cls in (QgsRubberBand, QgsVertexMarker, QgsHighlight):
        for obj in canvas.findChildren(cls):
            _kill(obj)
    sc = canvas.scene()
    for it in list(sc.items()):
        if type(it).__name__ in ('QgsRubberBand', 'QgsVertexMarker', 'QgsHighlight'):
            _kill(it)
    canvas.refresh()

# Cerrar diálogo previo si existe
try:
    iface._coord_selector_dlg.close()
    iface._coord_selector_dlg.deleteLater()
except Exception:
    pass
clear_overlays(canvas)

# STAC endpoint
STAC_URL = "https://earth-search.aws.element84.com/v1/search"

def _sanitize_bbox(b):
    x0, y0, x1, y1 = map(float, b)
    eps = 1e-6
    if x0 == x1: x0 -= eps; x1 += eps
    if y0 == y1: y0 -= eps; y1 += eps
    x0 = max(-180.0, min(180.0, x0)); x1 = max(-180.0, min(180.0, x1))
    y0 = max(-90.0,  min(90.0,  y0)); y1 = max(-90.0,  min(90.0,  y1))
    xmin, xmax = (x0, x1) if x0 <= x1 else (x1, x0)
    ymin, ymax = (y0, y1) if y0 <= y1 else (y1, y0)
    return [xmin, ymin, xmax, ymax]

def _safe_name(s): return re.sub(r"[^A-Za-z0-9_.-]+", "_", s)[:80]
def _to_vsicurl(u: str) -> str: return "/vsicurl/" + u if u and not u.startswith("/vsicurl/") else u

def _asset_https(asset: dict) -> str:
    """URL https lista para GDAL desde asset STAC."""
    if not asset: return None
    href = asset.get('href','')
    if href.startswith('http'): return href
    alts = asset.get('alternates') or asset.get('alternate') or {}
    if isinstance(alts, dict):
        for v in alts.values():
            h = (v or {}).get('href','')
            if h.startswith('http'):
                return h
    if href.startswith('s3://'):
        bucket_key = href[5:]
        bucket, key = bucket_key.split('/',1) if '/' in bucket_key else (bucket_key,'')
        return f"https://{bucket}.s3.us-west-2.amazonaws.com/{key}"
    return None

# ---- Herramienta de rectángulo ----
class SingleRectTool(QgsMapTool):
    def __init__(self, canvas, owner):
        super().__init__(canvas)
        self.canvas = canvas; self.owner = owner; self.start = None
    def canvasPressEvent(self, e):
        self.start = e.mapPoint()
        self.owner.clear_rect()
        self.owner.rb.setVisible(True)
        self.owner.rect_exists = False
        self.owner.update_show_images_state()
    def canvasMoveEvent(self, e):
        if not self.start: return
        rect = QgsRectangle(self.start, e.mapPoint())
        self.owner.rb.setToGeometry(QgsGeometry.fromRect(rect), None)
    def canvasReleaseEvent(self, e):
        if not self.start: return
        rect = QgsRectangle(self.start, e.mapPoint())
        self.owner.rb.setToGeometry(QgsGeometry.fromRect(rect), None)
        self.start = None
        self.owner.on_extent_captured(rect)

# ---- Diálogo principal ----
class CoordSelectorDialog(QDialog):
    def __init__(self, canvas):
        super().__init__(canvas)
        self.setWindowTitle("Copernicus preview (COGs)")
        self.canvas = canvas

        # Estado
        self.rect_exists = False
        self.start_set = False
        self.end_set = False
        self.last_features = []
        self.sel_xmin = self.sel_ymin = self.sel_xmax = self.sel_ymax = None
        self._created_groups = []
        self.stac_collection = "sentinel-2-l2a"  # por defecto S2 L2A

        layout = QVBoxLayout(self)

        # --- Selector de misión ---
        row_mission = QHBoxLayout()
        self.lbl_mission = QLabel("Mission:")
        self.cmb_mission = QComboBox()
        self.cmb_mission.addItem("Sentinel-2 (L2A)", "sentinel-2-l2a")       # habilitado
        self.cmb_mission.addItem("Sentinel-1 (SAR) — soon", "sentinel-1")    # deshabilitados
        self.cmb_mission.addItem("Sentinel-3 (OLCI/SLSTR) — soon", "sentinel-3")
        model = self.cmb_mission.model()
        model.item(1).setEnabled(False)
        model.item(2).setEnabled(False)
        self.cmb_mission.setCurrentIndex(0)
        def _on_mission_changed(_):
            self.stac_collection = self.cmb_mission.currentData() or "sentinel-2-l2a"
        self.cmb_mission.currentIndexChanged.connect(_on_mission_changed)
        row_mission.addWidget(self.lbl_mission); row_mission.addWidget(self.cmb_mission)

        # --- Fechas ---
        min_date = QDate(2015, 12, 1)
        max_date = QDate.currentDate()

        row_start = QHBoxLayout(); row_end = QHBoxLayout()
        self.lbl_start = QLabel("Start date:"); self.start_edit = QDateEdit()
        self.start_edit.setCalendarPopup(True); self.start_edit.setDisplayFormat("yyyy-MM-dd")
        self.start_edit.setMinimumDate(min_date); self.start_edit.setMaximumDate(max_date)
        self.start_edit.setSpecialValueText("Select…"); self.start_edit.setDate(min_date)

        self.lbl_end = QLabel("End date:"); self.end_edit = QDateEdit()
        self.end_edit.setCalendarPopup(True); self.end_edit.setDisplayFormat("yyyy-MM-dd")
        self.end_edit.setMinimumDate(min_date); self.end_edit.setMaximumDate(max_date)
        self.end_edit.setSpecialValueText("Select…"); self.end_edit.setDate(min_date)

        def _on_start_changed(_):
            if not self.start_set: self.start_set = True; self.start_edit.setSpecialValueText("")
            self.end_edit.setMinimumDate(self.start_edit.date())
            if self.end_edit.date() < self.start_edit.date():
                self.end_edit.setDate(self.start_edit.date())
            self.update_show_images_state()
        def _on_end_changed(_):
            if not self.end_set: self.end_set = True; self.end_edit.setSpecialValueText("")
            self.update_show_images_state()
        self.start_edit.dateChanged.connect(_on_start_changed)
        self.end_edit.dateChanged.connect(_on_end_changed)

        row_start.addWidget(self.lbl_start); row_start.addWidget(self.start_edit)
        row_end.addWidget(self.lbl_end); row_end.addWidget(self.end_edit)

        # --- Filtro de nubes: un solo valor (≤ %) ---
        row_cloud = QHBoxLayout()
        self.lbl_cloud = QLabel("Clouds ≤ (%) :")
        self.max_cloud = QSpinBox(); self.max_cloud.setRange(0, 100); self.max_cloud.setValue(100)
        row_cloud.addWidget(self.lbl_cloud); row_cloud.addWidget(self.max_cloud)

        # --- Botones ---
        buttons_row = QHBoxLayout()
        self.btn_select = QPushButton("Select coordinates")
        self.btn_clean  = QPushButton("Clean coordinate rectangle")
        self.btn_show   = QPushButton("Show images"); self.btn_show.setEnabled(False)
        buttons_row.addWidget(self.btn_select)
        buttons_row.addWidget(self.btn_clean)
        buttons_row.addWidget(self.btn_show)

        # --- Resultados / log ---
        self.results = QListWidget()
        self.out = QPlainTextEdit(); self.out.setReadOnly(True)

        # Montaje UI
        layout.addLayout(row_mission)
        layout.addLayout(row_start); layout.addLayout(row_end)
        layout.addLayout(row_cloud)
        layout.addLayout(buttons_row); layout.addWidget(self.results); layout.addWidget(self.out)

        # Herramientas canvas
        self.rb = QgsRubberBand(self.canvas, QgsWkbTypes.PolygonGeometry); self.rb.setVisible(False)
        self.tool = SingleRectTool(self.canvas, self); self.prev_tool = None
        self.btn_select.clicked.connect(self.activate_tool)
        self.btn_clean.clicked.connect(self.on_clean_rectangle)
        self.btn_show.clicked.connect(self.on_show_images)

        self.update_show_images_state()

    # ---- Estado botón ----
    def dates_valid(self):
        return (self.start_set and self.end_set and self.start_edit.date() <= self.end_edit.date())
    def update_show_images_state(self):
        self.btn_show.setEnabled(self.rect_exists and self.dates_valid())

    # ---- AOI ----
    def activate_tool(self):
        self.prev_tool = self.canvas.mapTool()
        self.canvas.setMapTool(self.tool)

    def clear_rect(self):
        try:
            self.rb.setVisible(False)
            self.rb.reset(QgsWkbTypes.PolygonGeometry)
        except Exception:
            pass

    def on_clean_rectangle(self):
        """Botón: limpia cualquier rectángulo/overlay y reinicia coordenadas AOI."""
        clear_overlays(self.canvas)
        try: _kill(self.rb)
        except Exception: pass
        self.rb = QgsRubberBand(self.canvas, QgsWkbTypes.PolygonGeometry)
        self.rb.setVisible(False)
        self.sel_xmin = self.sel_ymin = self.sel_xmax = self.sel_ymax = None
        self.rect_exists = False
        self.update_show_images_state()
        self._print_current_selection()
        self.out.appendPlainText("AOI: rectángulo limpiado.")

    def on_extent_captured(self, rect):
        src = self.canvas.mapSettings().destinationCrs(); dst = QgsCoordinateReferenceSystem("EPSG:4326")
        xform = QgsCoordinateTransform(src, dst, QgsProject.instance()); r = xform.transformBoundingBox(rect)
        self.sel_xmin, self.sel_ymin, self.sel_xmax, self.sel_ymax = map(float, (r.xMinimum(), r.yMinimum(), r.xMaximum(), r.yMaximum()))
        self.rect_exists = True
        self._print_current_selection()
        if self.prev_tool is not None: self.canvas.setMapTool(self.prev_tool)
        self.update_show_images_state()

    def _print_current_selection(self):
        s = self.start_edit.date().toString('yyyy-MM-dd') if self.start_set else '(not set)'
        e = self.end_edit.date().toString('yyyy-MM-dd') if self.end_set else '(not set)'
        def _fmt(v): return f"{v:.6f}" if isinstance(v, float) else "(not set)"
        lines = [
            "Extent (EPSG:4326)",
            f"xmin: {_fmt(self.sel_xmin)}",
            f"ymin: {_fmt(self.sel_ymin)}",
            f"xmax: {_fmt(self.sel_xmax)}",
            f"ymax: {_fmt(self.sel_ymax)}",
            "", "Date range:", f"start = {s}", f"end   = {e}",
            "", f"Mission: {self.cmb_mission.currentText()}  (collection = {self.stac_collection})",
            f"Clouds ≤: {self.max_cloud.value()} % (incluye 'sin dato')"
        ]
        self.out.setPlainText("\n".join(lines))

    def _current_bbox_from_rb(self):
        try:
            geom = self.rb.asGeometry()
            if geom and not geom.isEmpty():
                rect = geom.boundingBox()
                src = self.canvas.mapSettings().destinationCrs(); dst = QgsCoordinateReferenceSystem("EPSG:4326")
                xform = QgsCoordinateTransform(src, dst, QgsProject.instance()); r = xform.transformBoundingBox(rect)
                return [float(r.xMinimum()), float(r.yMinimum()), float(r.xMaximum()), float(r.yMaximum())]
        except Exception:
            pass
        if None not in (self.sel_xmin, self.sel_ymin, self.sel_xmax, self.sel_ymax):
            return [self.sel_xmin, self.sel_ymin, self.sel_xmax, self.sel_ymax]
        return None

    # ---- HTTP ----
    def _post_json(self, url, payload, timeout=40):
        headers = {"Content-Type":"application/json","Accept":"application/geo+json, application/json","User-Agent":"QGIS-Copernicus-Preview/1.8"}
        body = json.dumps(payload)
        if _HAS_REQUESTS:
            try:
                r = requests.post(url, data=body, headers=headers, timeout=timeout)
                if r.status_code >= 400: return None, f"HTTP {r.status_code}: {r.text[:200]}"
                return r.json(), None
            except Exception as e:
                return None, f"Error de red: {e}"
        else:
            try:
                req = Request(url, data=body.encode("utf-8"), headers=headers, method="POST")
                with urlopen(req, timeout=timeout) as resp:
                    return json.loads(resp.read().decode("utf-8")), None
            except HTTPError as e:
                try: b = e.read().decode("utf-8")
                except Exception: b = ""
                return None, f"HTTP {e.code}: {b[:200]}"
            except URLError as e:
                return None, f"Error de red: {e.reason}"
            except Exception as e:
                return None, f"Error inesperado: {e}"

    # --- paginación: extraer 'next' ---
    def _extract_next_token(self, doc):
        for link in (doc.get("links") or []):
            if link.get("rel") == "next":
                href = link.get("href", "")
                parsed = urllib.parse.urlparse(href)
                qs = urllib.parse.parse_qs(parsed.query)
                nxt = (qs.get("next") or [None])[0]
                if nxt:
                    return nxt
        return (doc.get("context") or {}).get("next")

    # ---- STAC search con sort asc + paginación 'next' + INTERSECTS ----
    def stac_search(self, bbox, start, end, max_items=1000, page_limit=100):
        xmin, ymin, xmax, ymax = _sanitize_bbox(bbox)
        dt = f"{start}T00:00:00Z/{end}T23:59:59Z"

        intersects_poly = {
            "type": "Polygon",
            "coordinates": [[[xmin, ymin],
                             [xmin, ymax],
                             [xmax, ymax],
                             [xmax, ymin],
                             [xmin, ymin]]]
        }

        base_payload = {
            "collections": [self.stac_collection],  # por ahora: sentinel-2-l2a
            "intersects": intersects_poly,
            "datetime": dt,
            "limit": page_limit,
            "sortby": [{"field": "properties.datetime", "direction": "asc"}],
            "fields": {
                "include": [
                    "id", "assets.visual", "assets.B02", "assets.B03", "assets.B04",
                    "properties.datetime", "properties.platform",
                    "properties.eo:cloud_cover", "properties.s2:cloud_cover",
                    "links"
                ],
                "exclude": ["geometry"]
            }
        }

        feats_all, token = [], None
        while True:
            payload = dict(base_payload)
            if token:
                payload["next"] = token  # paginación
            doc, err = self._post_json(STAC_URL, payload)
            if err and not doc:
                return [], [], err

            feats = (doc or {}).get("features", [])
            feats_all.extend(feats)

            token = self._extract_next_token(doc)
            if not token or len(feats_all) >= max_items:
                break

        rows = []
        for f in feats_all:
            p = f.get("properties", {})
            date_only = (p.get("datetime","").split("T")[0]) if p.get("datetime") else ""
            sid = f.get("id","")
            cc = p.get("eo:cloud_cover", p.get("s2:cloud_cover", p.get("cloud_cover", None)))
            try: cc = float(cc) if cc is not None else None
            except Exception: cc = None
            rows.append((date_only, sid, cc))
        return rows, feats_all, None

    # ---- Fuente por feature: visual → VRT(B04/B03/B02) → B04 ----
    def _build_source_for_feature(self, feat):
        assets = feat.get("assets", {}) or {}

        # 1) visual (COG georreferenciado)
        vis = assets.get("visual") or assets.get("VISUAL")
        u_vis = _asset_https(vis)
        if u_vis:
            return _to_vsicurl(u_vis), "VISUAL"

        # 2) VRT RGB con B04/B03/B02
        def _href(key):
            a = assets.get(key) or assets.get(key.lower())
            if not a: return None
            u = _asset_https(a)
            return _to_vsicurl(u) if u else None

        b04 = _href("B04"); b03 = _href("B03"); b02 = _href("B02")
        if b04 and b03 and b02:
            sid = _safe_name(feat.get("id","scene"))
            vrt = os.path.join(tempfile.gettempdir(), f"s2_l2a_{sid}.vrt")
            try:
                ds = gdal.BuildVRT(vrt, [b04, b03, b02], options=gdal.BuildVRTOptions(separate=True))
                if ds: ds = None; return vrt, "VRT"
            except Exception:
                pass

        # 3) B04 en grises
        if b04:
            return b04, "B04"

        return None, None

    # ---- Agrupación por fecha ----
    def _group_name_for_feature(self, feat):
        fid = feat.get("id","")
        props = feat.get("properties", {}) or {}
        plat = props.get("platform", "")
        plat = "S2A" if str(plat).lower().endswith("2a") or "S2A_" in fid else \
               "S2B" if str(plat).lower().endswith("2b") or "S2B_" in fid else "S2"
        m = re.search(r'_(\d{8})_', fid)
        ymd = m.group(1) if m else (props.get("datetime","").split("T")[0].replace("-",""))
        if not ymd: ymd = "00000000"
        m2 = re.search(r'_(\d{8})_(\d)_L2A', fid)
        proc = m2.group(2) if m2 else "0"
        return f"{plat}_{ymd}_{proc}_L2A"

    def _remove_previous_date_groups(self):
        root = QgsProject.instance().layerTreeRoot()
        for gname in getattr(self, "_created_groups", []):
            g = root.findGroup(gname)
            if g: root.removeChildNode(g)
        self._created_groups = []

    # ---- Acción principal: buscar, filtrar por nubes (≤ umbral o sin dato) y cargar ----
    def on_show_images(self):
        if not self.dates_valid():
            QMessageBox.warning(self, "Fechas", "Selecciona Start y End válidos."); return
        start = self.start_edit.date().toString('yyyy-MM-dd')
        end   = self.end_edit.date().toString('yyyy-MM-dd')
        bbox = self._current_bbox_from_rb()
        if not bbox:
            QMessageBox.warning(self, "AOI", "Dibuja el rectángulo de búsqueda."); return

        cmax = self.max_cloud.value()

        self.btn_show.setEnabled(False); self.results.clear()
        self.out.appendPlainText("\nBuscando imágenes (Earth Search – COGs)…")
        self.out.appendPlainText(f"mission = {self.cmb_mission.currentText()} (collection = {self.stac_collection})")
        self.out.appendPlainText(f"bbox = [{bbox[0]:.6f},{bbox[1]:.6f},{bbox[2]:.6f},{bbox[3]:.6f}]")
        self.out.appendPlainText(f"dates = [{start} → {end}] (asc + paginación + intersects)")
        self.out.appendPlainText(f"clouds ≤ {cmax} % (incluye 'sin dato')")

        rows, feats, err = self.stac_search(bbox, start, end, max_items=1000, page_limit=100)
        if err and not rows:
            self.out.appendPlainText(f"\n⚠️ {err}"); self.btn_show.setEnabled(True); return
        if not rows:
            self.out.appendPlainText("\nNo hay imágenes en el rango/área."); self.btn_show.setEnabled(True); return

        # --- Filtrado por nubes: incluir SIEMPRE escenas sin dato; si hay valor, exigir <= cmax ---
        def _cloud_val(f):
            p = f.get("properties", {}) or {}
            v = p.get("eo:cloud_cover", p.get("s2:cloud_cover", p.get("cloud_cover", None)))
            try: return float(v)
            except Exception: return None

        feats_kept = []
        missing_cc = 0
        for f in feats:
            cv = _cloud_val(f)
            if cv is None or cv <= cmax:
                feats_kept.append(f)
                if cv is None: missing_cc += 1

        if not feats_kept:
            self.out.appendPlainText("Tras filtrar por nubes, no quedan escenas."); self.btn_show.setEnabled(True); return

        if missing_cc:
            self.out.appendPlainText(f"Nota: se han incluido {missing_cc} escenas sin dato de nubes.")

        # Mostrar lista
        self.last_features = feats_kept
        for f in self.last_features:
            p = f.get("properties", {})
            d = (p.get("datetime","").split("T")[0]) if p.get("datetime") else ""
            sid = f.get("id","")
            cv = _cloud_val(f)
            self.results.addItem(f"{d}  •  {sid}  •  nubes: {('%.1f%%' % cv) if isinstance(cv,(int,float)) else '—'}")

        # Limpiar grupos anteriores creados por este diálogo
        self._remove_previous_date_groups()
        root = QgsProject.instance().layerTreeRoot()

        added = 0
        union_extent = None
        self.out.appendPlainText(f"\nCargando {len(self.last_features)} escenas…")
        group_cache = {}

        for i, feat in enumerate(self.last_features, 1):
            src, mode = self._build_source_for_feature(feat)
            if not src:
                self.out.appendPlainText(f"  [{i}] capa inválida (sin fuente adecuada)."); continue

            # Nombre de capa con % nubes (o NA)
            base_name = feat.get("id", f"S2_L2A_{i}")
            cv = _cloud_val(feat)
            cloud_tag = f"{int(round(cv))}%_clouds" if cv is not None else "NA%_clouds"
            layer_name = f"{base_name}_{cloud_tag}"

            rl = QgsRasterLayer(src, layer_name, 'gdal')
            if not rl.isValid():
                self.out.appendPlainText(f"  [{i}] capa inválida ({mode})."); continue

            # Metadatos útiles
            rl.setCustomProperty("stac_id", base_name)
            rl.setCustomProperty("cloud_cover", cv if cv is not None else "NA")

            # Grupo por fecha
            gname = self._group_name_for_feature(feat)
            grp = group_cache.get(gname)
            if not grp:
                grp = root.addGroup(gname)
                group_cache[gname] = grp
                self._created_groups.append(gname)

            QgsProject.instance().addMapLayer(rl, False)
            grp.addLayer(rl)

            # Union extent
            ext = rl.extent()
            if union_extent is None:
                union_extent = QgsRectangle(ext)
            else:
                union_extent.combineExtentWith(ext)

            added += 1
            self.out.appendPlainText(f"  [{i}] añadida: {layer_name}  → grupo: {gname}")

        if added and union_extent:
            canvas.setExtent(union_extent)
            canvas.refresh()
            self.out.appendPlainText(f"Listo. Capas añadidas: {added} (zoom a union extent)")
        else:
            self.out.appendPlainText("No se pudo añadir ninguna capa.")
        self.btn_show.setEnabled(True)

    def closeEvent(self, ev):
        clear_overlays(self.canvas); super().closeEvent(ev)

# Mostrar ventana
iface._coord_selector_dlg = CoordSelectorDialog(canvas)
iface._coord_selector_dlg.show()
iface._coord_selector_dlg.raise_()
