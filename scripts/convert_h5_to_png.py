#!/usr/bin/env python3
"""
Convierte archivos HDF5 (.h5) de radares meteorológicos a imágenes PNG con
transparencia y genera metadatos JSON listos para ser servidos en web.

Requisitos:
  pip install h5py numpy pillow matplotlib
"""

import argparse
import json
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image

try:
    import h5py
except ImportError as exc:
    raise SystemExit("Falta dependencia h5py. Instálala con: pip install h5py") from exc

try:
    import matplotlib
    matplotlib.use("Agg")
    from matplotlib import cm, colors
except ImportError as exc:
    raise SystemExit("Falta dependencia matplotlib. Instala: pip install matplotlib") from exc


PREFERRED_DATASET_NAMES = [
    "reflectivity",
    "data/reflectivity",
    "data/ppi",
    "ppi/reflectivity",
    "precipitation",
    "data/precipitation",
    "rain_rate",
    "moment_0",
    "moment_1"
]

LAT_NAMES = ["latitude", "lat", "Latitude", "Lat", "y", "Y"]
LON_NAMES = ["longitude", "lon", "Longitude", "Lon", "x", "X"]
TIME_DATASET_NAMES = ["time", "Time", "timestamp", "datetime", "DateTime", "date_time"]


def list_datasets(group, prefix=""):
    for name, item in group.items():
        path = f"{prefix}/{name}" if prefix else name
        if isinstance(item, h5py.Dataset):
            yield path, item
        elif isinstance(item, h5py.Group):
            yield from list_datasets(item, path)


def detect_dataset(h5file, preferred=None):
    if preferred:
        key = preferred.strip("/")
        try:
            h5file[key]
            return key
        except KeyError:
            pass
        # Intentar match sin importar nivel
        for path, _ in list_datasets(h5file):
            normalized = path.strip("/")
            if normalized == key or normalized.endswith(preferred):
                return path

    # Buscar candidatos preferidos
    for preferred_name in PREFERRED_DATASET_NAMES:
        for path, dataset in list_datasets(h5file):
            if path.endswith(preferred_name):
                if dataset.ndim >= 2 and dataset.dtype.kind in {"f", "i", "u"}:
                    return path

    # Fallback: primer dataset numérico con 2+ dimensiones
    candidates = [
        (path, ds) for path, ds in list_datasets(h5file)
        if ds.ndim >= 2 and ds.dtype.kind in {"f", "i", "u"}
    ]
    if not candidates:
        raise ValueError("No se encontró dataset numérico 2D/3D en el archivo HDF5.")

    # Ordenar por número de dimensiones (prefiere 3 luego 2) y tamaño
    candidates.sort(key=lambda item: (-item[1].ndim, -np.prod(item[1].shape)))
    return candidates[0][0]


def load_data(h5file, dataset_path):
    data = h5file[dataset_path][...]
    if data.ndim >= 3:
        data = data[-1]
    return np.array(data, dtype=np.float32)


def detect_lat_lon(h5file):
    lat = None
    lon = None
    for path, dataset in list_datasets(h5file):
        name = path.split("/")[-1]
        if name in LAT_NAMES and dataset.ndim in (1, 2):
            lat = dataset[...]
        if name in LON_NAMES and dataset.ndim in (1, 2):
            lon = dataset[...]
    return lat, lon


def detect_time(h5file):
    for path, dataset in list_datasets(h5file):
        name = path.split("/")[-1]
        if name in TIME_DATASET_NAMES:
            values = dataset[...]
            try:
                if np.issubdtype(values.dtype, np.datetime64):
                    ts = np.datetime_as_string(values[-1], unit="s")
                    return datetime.fromisoformat(ts)
                # segundos desde epoch
                if np.issubdtype(values.dtype, np.number):
                    return datetime.utcfromtimestamp(float(values[-1]))
            except Exception:
                continue
    # No se pudo detectar
    return None


def to_rgba(data, vmin, vmax, transparent_below, cmap_name):
    norm = colors.Normalize(vmin=vmin, vmax=vmax)
    cmap = cm.get_cmap(cmap_name)
    clipped = np.clip(data, vmin, vmax)
    rgba = cmap(norm(clipped))
    alpha_mask = np.where(np.isnan(data) | (data < transparent_below), 0.0, 1.0)
    rgba[..., 3] = alpha_mask
    rgba8 = (rgba * 255).astype(np.uint8)
    return Image.fromarray(rgba8, mode="RGBA")


def compute_bounds(lat_array, lon_array, default_bounds=None):
    if lat_array is not None and lon_array is not None:
        lat_min = float(np.nanmin(lat_array))
        lat_max = float(np.nanmax(lat_array))
        lon_min = float(np.nanmin(lon_array))
        lon_max = float(np.nanmax(lon_array))
        return {
            "southWest": [lat_min, lon_min],
            "northEast": [lat_max, lon_max]
        }
    if default_bounds:
        return {
            "southWest": [default_bounds["latMin"], default_bounds["lonMin"]],
            "northEast": [default_bounds["latMax"], default_bounds["lonMax"]]
        }
    return None


def parse_bounds(bounds_str):
    if not bounds_str:
        return None
    parts = [float(x) for x in bounds_str.split(",")]
    if len(parts) != 4:
        raise ValueError("Los límites por defecto deben tener 4 valores: latMin,latMax,lonMin,lonMax")
    return {
        "latMin": parts[0],
        "latMax": parts[1],
        "lonMin": parts[2],
        "lonMax": parts[3]
    }


def build_output_paths(out_dir, radar_id, timestamp):
    date_str = timestamp.strftime("%Y-%m-%d")
    time_str = timestamp.strftime("%H%M%S")
    date_dir = Path(out_dir) / date_str
    date_dir.mkdir(parents=True, exist_ok=True)

    png_path = date_dir / f"{radar_id}_{timestamp.strftime('%Y%m%d_%H%M%S')}.png"
    json_path = date_dir / f"{radar_id}_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
    return png_path, json_path, date_str, time_str


def build_metadata(radar_id, dataset_path, data_array, timestamp, date_str, bounds, args, png_path):
    stats = {
        "min": float(np.nanmin(data_array)),
        "max": float(np.nanmax(data_array)),
        "mean": float(np.nanmean(data_array)),
        "std": float(np.nanstd(data_array)),
        "validCount": int(np.isfinite(data_array).sum()),
        "totalCount": int(np.size(data_array))
    }

    metadata = {
        "radar": radar_id,
        "dataset": dataset_path,
        "shape": data_array.shape,
        "timestamp": datetime.utcnow().isoformat(),
        "sourceTimestamp": timestamp.isoformat(),
        "date": date_str,
        "sourceFile": str(Path(args.input).resolve()),
        "vmin": args.vmin,
        "vmax": args.vmax,
        "transparentBelow": args.transparent_below,
        "cmap": args.cmap,
        "bounds": bounds,
        "stats": stats,
        "png": str(png_path.resolve())
    }
    return metadata


def parse_arguments():
    parser = argparse.ArgumentParser(description="Convierte archivos HDF5 de radar a PNG con transparencia")
    parser.add_argument("--input", required=True, help="Archivo .h5 de entrada")
    parser.add_argument("--radar", required=True, help="ID del radar (p.ej. LGUAXX)")
    parser.add_argument("--dataset", help="Ruta del dataset dentro del HDF5 (opcional)")
    parser.add_argument("--out-dir", required=True, help="Directorio de salida base")
    parser.add_argument("--transparent-below", type=float, default=1.0, help="Valores menores serán transparentes")
    parser.add_argument("--vmin", type=float, default=0.0, help="Valor mínimo para colormap")
    parser.add_argument("--vmax", type=float, default=60.0, help="Valor máximo para colormap")
    parser.add_argument("--cmap", default="turbo", help="Colormap de matplotlib")
    parser.add_argument("--default-bounds", help="Bounds por defecto latMin,latMax,lonMin,lonMax")
    parser.add_argument("--source-timestamp", help="Timestamp ISO8601 del archivo fuente (opcional)")
    return parser.parse_args()


def main():
    args = parse_arguments()
    input_path = Path(args.input)
    if not input_path.exists():
        raise SystemExit(f"Archivo no encontrado: {input_path}")

    default_bounds = parse_bounds(args.default_bounds) if args.default_bounds else None

    with h5py.File(input_path, "r") as h5file:
        dataset_path = detect_dataset(h5file, preferred=args.dataset)
        data_array = load_data(h5file, dataset_path)
        lat_array, lon_array = detect_lat_lon(h5file)
        bounds = compute_bounds(lat_array, lon_array, default_bounds)
        time_value = detect_time(h5file)

    # Fallback timestamp
    if args.source_timestamp:
        try:
            timestamp = datetime.fromisoformat(args.source_timestamp.replace("Z", "+00:00"))
        except ValueError:
            timestamp = datetime.utcfromtimestamp(input_path.stat().st_mtime)
    else:
        timestamp = time_value or datetime.utcfromtimestamp(input_path.stat().st_mtime)

    png_path, json_path, date_str, _ = build_output_paths(args.out_dir, args.radar, timestamp)

    image = to_rgba(
        data_array,
        vmin=args.vmin,
        vmax=args.vmax,
        transparent_below=args.transparent_below,
        cmap_name=args.cmap
    )
    image.save(png_path, format="PNG")

    metadata = build_metadata(
        args.radar,
        dataset_path,
        data_array,
        timestamp,
        date_str,
        bounds,
        args,
        png_path
    )

    json_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"PNG:{png_path}")
    print(f"JSON:{json_path}")
    print(f"META:{json.dumps(metadata, ensure_ascii=False)}")


if __name__ == "__main__":
    main()

