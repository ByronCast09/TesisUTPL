#!/usr/bin/env python3
"""
Genera un PNG transparente (sin fondo) a partir del último archivo .nc4 detectado.
También crea metadatos con los bounds geográficos y actualiza un index.json
estático bajo public/radar_pngs para que el frontend pueda usar ImageOverlay.

Requisitos:
  pip install xarray netCDF4 numpy pillow matplotlib

Uso:
  python scripts/generate_png_from_nc4.py --input test_radar_data \
      --radar LGUAXX --var reflectivity --out-root public/radar_pngs

Notas:
- Detecta el último .nc4 por fecha de modificación.
- Extrae lat/lon de variables comunes (latitude/longitude o lat/lon).
- Si el dataset no tiene lat/lon, puede usar bounds de configuración.
- Genera PNG con transparencia donde los valores son NaN o < umbral.
- Escribe un JSON con bounds y actualiza index.json siguiendo la misma
  estructura que radar_gifs.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image

try:
    import xarray as xr
except Exception as e:
    print("xarray no está instalado. Instálalo con: pip install xarray netCDF4", file=sys.stderr)
    raise

try:
    import matplotlib
    matplotlib.use("Agg")
    from matplotlib import cm, colors
except Exception as e:
    print("matplotlib no está instalado. Instálalo con: pip install matplotlib", file=sys.stderr)
    raise

DEFAULT_VAR = "reflectivity"
DEFAULT_VMIN = 0.0   # dBZ mínimo
DEFAULT_VMAX = 60.0  # dBZ máximo
DEFAULT_TRANSPARENT_BELOW = 1.0  # valores < umbral serán transparentes


def find_latest_nc(input_path: Path) -> Path:
    """Si input_path es un archivo lo devuelve; si es directorio busca .nc/.nc4 más reciente."""
    if input_path.is_file():
        return input_path

    candidates = []
    for root, _, files in os.walk(input_path):
        for f in files:
            if f.lower().endswith(('.nc4', '.nc')):
                p = Path(root) / f
                candidates.append(p)
    if not candidates:
        raise FileNotFoundError(f"No se encontraron .nc/.nc4 en {input_path}")
    latest = max(candidates, key=lambda p: p.stat().st_mtime)
    return latest


def load_dataset(nc4_path: Path) -> xr.Dataset:
    return xr.open_dataset(nc4_path)


def get_lat_lon(ds: xr.Dataset):
    """Obtiene arrays lat/lon 2D o 1D (intentará nombres comunes)."""
    lat = None
    lon = None
    for lat_name in ["latitude", "lat", "y"]:
        if lat_name in ds.variables:
            lat = ds[lat_name].values
            break
    for lon_name in ["longitude", "lon", "x"]:
        if lon_name in ds.variables:
            lon = ds[lon_name].values
            break
    if lat is None or lon is None:
        raise ValueError("El dataset no tiene variables de lat/lon reconocibles (latitude/longitude o lat/lon)")
    return lat, lon


def get_data_var(ds: xr.Dataset, var_name: str) -> np.ndarray:
    if var_name not in ds.variables:
        # intentar encontrar una variable plausible
        for cand in ["reflectivity", "dbz", "precipitation", "rain_rate"]:
            if cand in ds.variables:
                var_name = cand
                break
    if var_name not in ds.variables:
        raise ValueError(f"Variable '{var_name}' no encontrada en el dataset. Variables: {list(ds.variables)}")
    data = ds[var_name].values
    # Si el dato tiene dimensiones (time, y, x), tomar el último tiempo
    if data.ndim == 3:
        data = data[-1]
    return data.astype(np.float32)


def to_rgba_png(data: np.ndarray, vmin: float, vmax: float, transparent_below: float, cmap_name: str = "turbo") -> Image.Image:
    """Mapea la matriz de datos a RGBA usando colormap y transparencia."""
    # Normalización para colormap
    norm = colors.Normalize(vmin=vmin, vmax=vmax)
    cmap = cm.get_cmap(cmap_name)
    # Aplicar colormap (devuelve RGBA en [0,1])
    rgba = cmap(norm(np.clip(data, vmin, vmax)))
    # Alpha: transparente si NaN o < umbral
    alpha = np.where(np.isnan(data) | (data < transparent_below), 0.0, 1.0)
    rgba[..., 3] = alpha
    # Convertir a 8-bit
    rgba8 = (rgba * 255).astype(np.uint8)
    img = Image.fromarray(rgba8, mode="RGBA")
    return img


def compute_bounds(lat: np.ndarray, lon: np.ndarray):
    # Manejar lat/lon 1D o 2D
    lat_min = float(np.nanmin(lat))
    lat_max = float(np.nanmax(lat))
    lon_min = float(np.nanmin(lon))
    lon_max = float(np.nanmax(lon))
    # Formato Leaflet ImageOverlay: [[southWestLat, southWestLng], [northEastLat, northEastLng]]
    return [[lat_min, lon_min], [lat_max, lon_max]]


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def update_index(index_path: Path, radar_id: str, date_str: str, file_rel: str):
    """Actualiza index.json con estructura {radar: {date: [file,...]}}"""
    index = {}
    if index_path.exists():
        try:
            index = json.loads(index_path.read_text(encoding="utf-8"))
        except Exception:
            index = {}
    if radar_id not in index:
        index[radar_id] = {}
    if date_str not in index[radar_id]:
        index[radar_id][date_str] = []
    if file_rel not in index[radar_id][date_str]:
        index[radar_id][date_str].append(file_rel)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description="Genera PNG transparente desde último .nc4")
    ap.add_argument("--input", required=True, help="Directorio raíz donde buscar .nc4 (recursivo)")
    ap.add_argument("--radar", required=True, help="ID del radar, p.ej. LGUAXX")
    ap.add_argument("--var", default=DEFAULT_VAR, help="Nombre de variable en el .nc4 (default reflectivity)")
    ap.add_argument("--vmin", type=float, default=DEFAULT_VMIN, help="Valor mínimo para colormap")
    ap.add_argument("--vmax", type=float, default=DEFAULT_VMAX, help="Valor máximo para colormap")
    ap.add_argument("--transparent-below", type=float, default=DEFAULT_TRANSPARENT_BELOW, help="Valores < umbral serán transparentes")
    ap.add_argument("--out-root", default="public/radar_pngs", help="Raíz de salida para PNG y metadatos")
    ap.add_argument("--cmap", default="turbo", help="Colormap de matplotlib (turbo, viridis, etc.)")
    args = ap.parse_args()

    input_dir = Path(args.input)
    out_root = Path(args.out_root)
    radar_id = args.radar

    latest_nc = find_latest_nc(input_dir)
    print(f"Usando archivo NetCDF: {latest_nc}")

    ds = load_dataset(latest_nc)
    data = get_data_var(ds, args.var)
    lat, lon = get_lat_lon(ds)

    # Crear imagen RGBA
    img = to_rgba_png(data, args.vmin, args.vmax, args.transparent_below, cmap_name=args.cmap)

    # Fecha (intentar desde dataset, luego mtime)
    date_str = None
    for t_name in ["time", "datetime"]:
        if t_name in ds.variables:
            try:
                # tomar último timestamp
                tval = ds[t_name].values
                if np.ndim(tval) > 0:
                    tval = tval[-1]
                # convertir a datetime
                date_str = np.datetime_as_string(np.datetime64(tval), unit='D')
            except Exception:
                pass
    if not date_str:
        date_str = datetime.fromtimestamp(latest_nc.stat().st_mtime).strftime("%Y-%m-%d")

    # Directorio de salida por fecha
    out_dir_date = out_root / date_str
    ensure_dir(out_dir_date)

    # Nombre de archivo PNG
    png_name = f"{radar_id}_{datetime.now().strftime('%H%M%S')}.png"
    png_path = out_dir_date / png_name
    img.save(png_path)

    # Metadatos de bounds
    bounds = compute_bounds(lat, lon)
    meta = {
        "radar": radar_id,
        "nc": str(latest_nc.as_posix()),
        "png": f"/radar_pngs/{date_str}/{png_name}",  # ruta pública desde /public
        "date": date_str,
        "bounds": bounds,
        "var": args.var,
        "vmin": args.vmin,
        "vmax": args.vmax,
        "transparent_below": args.transparent_below,
        "cmap": args.cmap
    }
    meta_path = out_dir_date / f"{radar_id}_{datetime.now().strftime('%H%M%S')}.json"
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    # Actualizar index.json (similar a radar_gifs)
    index_path = out_root / "index.json"
    file_rel = f"/radar_pngs/{date_str}/{png_name}"
    update_index(index_path, radar_id, date_str, file_rel)

    print("Generación completada:")
    print(f"  PNG: {png_path}")
    print(f"  Meta: {meta_path}")
    print(f"  Index actualizado: {index_path}")
    print(f"  Bounds: {bounds}")


if __name__ == "__main__":
    main()