#!/usr/bin/env python3
"""
Procesa archivos H5 comprimidos del radar LOXX usando el mismo enfoque avanzado
que generar_png_loxx.py pero adaptado para archivos comprimidos.

Este script:
- Lee archivos .h5 desde archivos .gz sin descomprimir en disco
- Usa transformación cartesiana optimizada
- Aplica corrección de clutter
- Genera PNGs con bounds correctos para Leaflet

    Ubicación de datos: F:\\LOXX\\H5
"""

import argparse
import json
import zipfile
import tarfile
import gzip
import os
import sys
import time
import subprocess
import threading
from datetime import datetime
from pathlib import Path
import io
import re

# Importar dependencias básicas primero
try:
    import h5py
    import numpy as np
    from PIL import Image
    import matplotlib
    matplotlib.use("Agg")
    from matplotlib import cm, colors
    from matplotlib.colors import ListedColormap, BoundaryNorm
    from scipy.ndimage import median_filter
    from scipy import ndimage
except ImportError as e:
    print(f"Error importando dependencias básicas: {e}")
    print("Asegúrate de tener instalado: h5py, numpy, pillow, matplotlib, scipy")
    sys.exit(1)

# Intentar importar funciones avanzadas si están disponibles
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

ADVANCED_FUNCTIONS_AVAILABLE = False
BASIC_FUNCTIONS_AVAILABLE = False

try:
    # Intentar importar funciones de loxx_dbzh_georeferenciado si existe
    try:
        from loxx_dbzh_georeferenciado import (
            extract_dbzh_data,
            apply_clutter_correction,
            create_cartesian_data_optimized_new,
            fast_interpolate_small_gaps_optimized,
            load_clutter_cache,
            generate_clutter_maps,
            save_clutter_cache,
            extract_timestamp_from_filename,
            parse_timestamp
        )
        ADVANCED_FUNCTIONS_AVAILABLE = True
        print("✓ Funciones avanzadas disponibles desde loxx_dbzh_georeferenciado.py")
    except ImportError:
        ADVANCED_FUNCTIONS_AVAILABLE = False
        print("⚠️  loxx_dbzh_georeferenciado.py no encontrado, usando funciones básicas")
    
    # Intentar importar de convert_h5_to_png si existe
    try:
        from convert_h5_to_png import (
            detect_dataset, load_data, detect_lat_lon, detect_time,
            to_rgba, compute_bounds, build_output_paths, build_metadata
        )
        BASIC_FUNCTIONS_AVAILABLE = True
        print("✓ Funciones importadas desde convert_h5_to_png.py")
    except ImportError:
        BASIC_FUNCTIONS_AVAILABLE = False
        print("⚠️  convert_h5_to_png.py no encontrado, definiendo funciones localmente")
        
except Exception as e:
    print(f"Error en importaciones: {e}")
    ADVANCED_FUNCTIONS_AVAILABLE = False
    BASIC_FUNCTIONS_AVAILABLE = False

# Si no hay funciones básicas, definir funciones localmente
if not BASIC_FUNCTIONS_AVAILABLE:
    PREFERRED_DATASET_NAMES = [
        "reflectivity", "data/reflectivity", "data/ppi", "ppi/reflectivity",
        "precipitation", "data/precipitation", "rain_rate", "moment_0", "moment_1"
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
            for path, _ in list_datasets(h5file):
                normalized = path.strip("/")
                if normalized == key or normalized.endswith(preferred):
                    return path
        
        for preferred_name in PREFERRED_DATASET_NAMES:
            for path, dataset in list_datasets(h5file):
                if path.endswith(preferred_name):
                    if dataset.ndim >= 2 and dataset.dtype.kind in {"f", "i", "u"}:
                        return path
        
        candidates = [
            (path, ds) for path, ds in list_datasets(h5file)
            if ds.ndim >= 2 and ds.dtype.kind in {"f", "i", "u"}
        ]
        if not candidates:
            raise ValueError("No se encontró dataset numérico 2D/3D en el archivo HDF5.")
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
                    if np.issubdtype(values.dtype, np.number):
                        return datetime.utcfromtimestamp(float(values[-1]))
                except Exception:
                    continue
        return None
    
    def to_rgba(data, vmin, vmax, transparent_below, cmap_name):
            """
            Convierte datos a RGBA usando la misma escala de colores que GUAXX
            Basado en advanced_ppi_converter_standalone.py
            """
            # Si se especifica 'meteorological' o 'dbzh', usar escala meteorológica estándar
            if cmap_name in ['meteorological', 'dbzh', 'radar']:
                # Escala meteorológica estándar según intensidad de precipitación
                dbzh_levels = [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80]
                
                # Definir colores en formato hexadecimal
                hex_colors = [
                    '#FFFFFF00',  # Transparente (sin datos/ruido)
                    '#00FFFFFF',  # Celeste claro (0-8 dBZ) - Precipitación muy ligera
                    '#0080FF',    # Celeste/Azul claro (8-16 dBZ) - Precipitación ligera
                    '#0000FF',    # Azul (16-24 dBZ) - Precipitación moderada baja
                    '#0080FF',    # Azul a verde (24-32 dBZ) - Precipitación moderada
                    '#00FF00',    # Verde (32-40 dBZ) - Precipitación moderada-fuerte
                    '#80FF00',    # Verde a amarillo (40-48 dBZ) - Precipitación fuerte
                    '#FFFF00',    # Amarillo (48-56 dBZ) - Precipitación muy fuerte
                    '#FF8000',    # Naranja (56-64 dBZ) - Precipitación intensa
                    '#FF0000',    # Rojo (64-72 dBZ) - Precipitación muy intensa
                    '#FF00FF'     # Magenta brillante (>72 dBZ) - Precipitación extrema/granizo
                ]
                
                # Convertir hex a RGBA (R, G, B, A) en rango 0-255
                def hex_to_rgba(hex_color):
                    """Convierte color hexadecimal #RRGGBBAA a tupla (R, G, B, A)"""
                    hex_color = hex_color.lstrip('#')
                    if len(hex_color) == 8:  # RRGGBBAA
                        r = int(hex_color[0:2], 16)
                        g = int(hex_color[2:4], 16)
                        b = int(hex_color[4:6], 16)
                        a = int(hex_color[6:8], 16)
                        return (r, g, b, a)
                    elif len(hex_color) == 6:  # RRGGBB (asume alpha=255)
                        r = int(hex_color[0:2], 16)
                        g = int(hex_color[2:4], 16)
                        b = int(hex_color[4:6], 16)
                        return (r, g, b, 255)
                    return (0, 0, 0, 0)
                
                rgba_colors = [hex_to_rgba(color) for color in hex_colors]
                
                # Normalizar colores a rango 0-1 para matplotlib
                rgba_colors_normalized = [(r/255.0, g/255.0, b/255.0, a/255.0) for r, g, b, a in rgba_colors]
                
                # Crear colormap y normalizador
                # Tenemos 11 niveles = 10 intervalos, necesitamos 10 colores
                cmap = ListedColormap(rgba_colors_normalized[:10])
                norm = BoundaryNorm(dbzh_levels, len(rgba_colors_normalized[:10]))
                
                # Preparar datos - limitar a rango válido y reemplazar valores inválidos
                clipped = np.clip(data, 0, 80)
                # Reemplazar NaN con 0 para que BoundaryNorm funcione correctamente
                clipped = np.where(np.isnan(clipped), 0, clipped)
                
                # Aplicar colormap
                rgba = cmap(norm(clipped))
                
                # Aplicar transparencia: valores menores a transparent_below y NaN
                alpha_mask = np.where(
                    np.isnan(data) | (data < transparent_below) | (data < 8),
                    0.0, 1.0
                )
                rgba[..., 3] = rgba[..., 3] * alpha_mask
                
                
            else:
                norm = colors.Normalize(vmin=vmin, vmax=vmax)
                try:
                    cmap = matplotlib.colormaps.get_cmap(cmap_name)
                except AttributeError:
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
    
    def build_output_paths(out_dir, radar_id, timestamp):
        date_str = timestamp.strftime("%Y-%m-%d")
        time_str = timestamp.strftime("%H%M%S")
        date_dir = Path(out_dir) / date_str
        date_dir.mkdir(parents=True, exist_ok=True)
        png_path = date_dir / f"{radar_id}_{timestamp.strftime('%Y%m%d_%H%M%S')}.png"
        json_path = date_dir / f"{radar_id}_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
        return png_path, json_path, date_str, time_str
    
    def calculate_precipitation_from_dbz(dbz_value):
        if dbz_value is None or np.isnan(dbz_value) or dbz_value <= 0:
            return 0.0
        Z = np.power(10, dbz_value / 10.0)
        R = np.power(Z / 200.0, 1.0 / 1.6)
        return float(R)
    
    def calculate_precipitation_stats(data_array):
        valid_data = data_array[~np.isnan(data_array) & (data_array > 0)]
        if len(valid_data) == 0:
            return {
                "min": 0.0, "max": 0.0, "mean": 0.0, "std": 0.0, "total": 0.0, "maxDbz": 0.0
            }
        precipitation_values = np.array([calculate_precipitation_from_dbz(dbz) for dbz in valid_data])
        return {
            "min": float(np.min(precipitation_values)),
            "max": float(np.max(precipitation_values)),
            "mean": float(np.mean(precipitation_values)),
            "std": float(np.std(precipitation_values)),
            "total": float(np.sum(precipitation_values)),
            "maxDbz": float(np.max(valid_data))
        }
    
    def extract_h5_additional_info(h5_buffer, h5file=None):
        additional_info = {
            "elevations": [], "scan_parameters": {}, "radar_parameters": {}, "file_info": {}
        }
        try:
            close_file = False
            if h5file is None:
                if hasattr(h5_buffer, 'seek'):
                    h5_buffer.seek(0)
                h5file = h5py.File(h5_buffer, 'r')
                close_file = True
            
            for ds_num in range(1, 6):
                try:
                    elev_path = f"dataset{ds_num}/where"
                    if elev_path in h5file:
                        elev_data = h5file[elev_path]
                        if 'elangle' in elev_data.attrs:
                            elevation = float(elev_data.attrs['elangle'])
                            additional_info["elevations"].append({
                                "dataset": ds_num, "elevation": elevation
                            })
                except (KeyError, AttributeError, TypeError):
                    continue
            
            try:
                for ds_num in range(1, 6):
                    try:
                        where_path = f"dataset{ds_num}/where"
                        if where_path in h5file:
                            where_data = h5file[where_path]
                            if 'rscale' in where_data.attrs:
                                range_scale = float(where_data.attrs['rscale'])
                                additional_info["scan_parameters"][f"dataset{ds_num}_range_scale"] = range_scale
                            if 'nbins' in where_data.attrs:
                                nbins = int(where_data.attrs['nbins'])
                                additional_info["scan_parameters"][f"dataset{ds_num}_nbins"] = nbins
                            if 'nrays' in where_data.attrs:
                                nrays = int(where_data.attrs['nrays'])
                                additional_info["scan_parameters"][f"dataset{ds_num}_nrays"] = nrays
                    except (KeyError, AttributeError, TypeError):
                        continue
            except Exception:
                pass
            
            try:
                if 'what' in h5file:
                    what_data = h5file['what']
                    if 'version' in what_data.attrs:
                        additional_info["radar_parameters"]["version"] = str(what_data.attrs['version'])
                    if 'date' in what_data.attrs:
                        additional_info["radar_parameters"]["date"] = str(what_data.attrs['date'])
                    if 'time' in what_data.attrs:
                        additional_info["radar_parameters"]["time"] = str(what_data.attrs['time'])
            except (KeyError, AttributeError, TypeError):
                pass
            
            try:
                if hasattr(h5file, 'filename'):
                    additional_info["file_info"]["filename"] = str(h5file.filename)
            except Exception:
                pass
            
            if close_file:
                h5file.close()
        except Exception:
            pass
        return additional_info
    
    def build_metadata(radar_id, dataset_path, data_array, timestamp, date_str, bounds, args, png_path, 
                      h5_additional_info=None, h5_buffer=None):
        stats = {
            "min": float(np.nanmin(data_array)),
            "max": float(np.nanmax(data_array)),
            "mean": float(np.nanmean(data_array)),
            "std": float(np.nanstd(data_array)),
            "validCount": int(np.isfinite(data_array).sum()),
            "totalCount": int(np.size(data_array))
        }
        
        precipitation_stats = calculate_precipitation_stats(data_array)
        
        metadata = {
            "radar": radar_id,
            "radarId": radar_id,
            "dataset": dataset_path,
            "shape": list(data_array.shape),
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
            "precipitation": precipitation_stats,
            "png": str(png_path.resolve()),
            "productType": "dBuZ",
            "radarName": "PPI",
            "status": "ready"
        }
        
        if h5_additional_info:
            metadata["elevations"] = h5_additional_info.get("elevations", [])
            metadata["scan_parameters"] = h5_additional_info.get("scan_parameters", {})
            metadata["radar_parameters"] = h5_additional_info.get("radar_parameters", {})
            metadata["file_info"] = h5_additional_info.get("file_info", {})
        
        metadata["maxDbz"] = stats["max"]
        metadata["minDbz"] = stats["min"]
        
        return metadata

RADAR_INFO = {
    'id': 'loxx',
    'name': 'LOXX',
    'default_lat': -3.9960,
    'default_lon': -79.2058,
    'default_height': 2144.0
}

def create_cartesian_data_optimized_new(data, metadata, min_dbzh_threshold=0.0, resolution_factor=2):
        if data is None or len(data.shape) != 2:
            return np.full((949, 949), -999, dtype=np.float32), {'width': 949, 'height': 949, 'nodata': -999, 'max_radius': 120000}
        
        if hasattr(data, 'shape') and len(data.shape) == 2:
            default_nrays, default_nbins = data.shape
        else:
            default_nrays, default_nbins = 360, 120
        
        nrays = metadata.get('nrays', default_nrays)
        nbins = metadata.get('nbins', default_nbins)
        rscale = metadata.get('rscale', 75.0)
        
        max_radius_meters = nbins * rscale
        pixel_size = rscale * resolution_factor
        
        width_px = height_px = 949
        center_px_x = width_px // 2
        center_px_y = height_px // 2
        
        y, x = np.ogrid[:height_px, :width_px]
        dx = x - center_px_x
        dy = center_px_y - y
        
        distance = np.hypot(dx, dy) * pixel_size
        angle = np.arctan2(dy, dx)
        angle = np.where(angle < 0, angle + 2 * np.pi, angle)
        
        bin_idx = (distance / rscale).astype(np.int32)
        ray_angle = (np.pi/2 - angle) % (2*np.pi)
        ray_idx = ((ray_angle / (2*np.pi) * nrays) % nrays).astype(np.int32)
        
        valid_mask = (distance <= max_radius_meters) & (bin_idx < nbins)
        cart_data = np.full((height_px, width_px), -999, dtype=np.float32)
        
        valid_points = valid_mask & (bin_idx >= 0) & (ray_idx >= 0) & (bin_idx < nbins) & (ray_idx < nrays)
        valid_y, valid_x = np.where(valid_points)
        
        try:
            valid_bin_idx = bin_idx[valid_points]
            valid_ray_idx = ray_idx[valid_points]
            
            valid_indices = (valid_ray_idx < nrays) & (valid_bin_idx < nbins)
            valid_ray_idx = valid_ray_idx[valid_indices]
            valid_bin_idx = valid_bin_idx[valid_indices]
            valid_y = valid_y[valid_indices]
            valid_x = valid_x[valid_indices]
            
            valid_values = data[valid_ray_idx, valid_bin_idx]
            
            valid_values_mask = ~np.isnan(valid_values) & (valid_values >= min_dbzh_threshold)
            cart_data[valid_y[valid_values_mask], valid_x[valid_values_mask]] = valid_values[valid_values_mask]
        except Exception:
            pass
        
        mask = cart_data == -999
        temp_data = np.copy(cart_data)
        temp_data[mask] = np.nan
        
        from scipy.ndimage import label
        filled_data = fast_interpolate_small_gaps_optimized(temp_data, max_gap_size=4)
        filled_data[np.isnan(filled_data)] = -999
        
        cart_metadata = {
            'width': width_px, 'height': height_px, 'center_x': center_px_x, 'center_y': center_px_y,
            'pixel_size': pixel_size, 'max_radius': max_radius_meters, 'nodata': -999, 'resolution_factor': resolution_factor
        }
        
        return filled_data, cart_metadata

def fast_interpolate_small_gaps_optimized(data, max_gap_size=2):
    if not np.any(np.isnan(data)):
        return data
    filled_data = data.copy()
    nan_mask = np.isnan(data)
    if not np.any(nan_mask):
        return filled_data
    from scipy.ndimage import label, binary_dilation
    labeled_array, num_features = label(nan_mask)
    if num_features == 0:
        return filled_data
    kernel_size = max_gap_size
    kernel = np.ones((kernel_size, kernel_size))
    for i in range(1, num_features + 1):
        region_coords = np.where(labeled_array == i)
        region_size = len(region_coords[0])
        if region_size <= max_gap_size * max_gap_size:
            dilated = binary_dilation(labeled_array == i, structure=kernel)
            neighbor_mask = dilated & ~(labeled_array == i)
            neighbor_values = data[neighbor_mask]
            valid_neighbors = neighbor_values[~np.isnan(neighbor_values)]
            if len(valid_neighbors) > 0:
                fill_value = np.nanmedian(valid_neighbors)
                filled_data[region_coords] = fill_value
    return filled_data

def calculate_bounds_from_metadata(center_lat, center_lon, max_radius_meters, image_shape=None):
    max_radius_deg = max_radius_meters / 111000.0
    if image_shape and len(image_shape) >= 2:
        height, width = image_shape[0], image_shape[1]
        aspect_ratio = width / height if height > 0 else 1.0
        if aspect_ratio >= 1.0:
            lat_radius = max_radius_deg
            lon_radius = max_radius_deg * aspect_ratio
        else:
            lat_radius = max_radius_deg / aspect_ratio
            lon_radius = max_radius_deg
    else:
        lat_radius = max_radius_deg
        lon_radius = max_radius_deg
    
    lat_sw = center_lat - lat_radius
    lon_sw = center_lon - lon_radius
    lat_ne = center_lat + lat_radius
    lon_ne = center_lon + lon_radius
    bounds = [[lat_sw, lon_sw], [lat_ne, lon_ne]]
    return bounds

def extract_timestamp_from_filename_simple(filename):
    pattern = r'(\d{8})_(\d{6})'
    match = re.search(pattern, filename)
    if match:
        return f"{match.group(1)}_{match.group(2)}"
    return None

def detect_compression_type(file_path):
    file_path = Path(file_path)
    ext = file_path.suffix.lower()
    if ext == '.zip': return 'zip'
    elif ext in ['.tar', '.tar.gz', '.tgz']: return 'tar'
    elif ext == '.gz': return 'gzip'
    else:
        try:
            with open(file_path, 'rb') as f:
                header = f.read(4)
                if header.startswith(b'PK'): return 'zip'
                elif header.startswith(b'\x1f\x8b'): return 'gzip'
                elif header.startswith(b'ustar'): return 'tar'
        except Exception:
            pass
    return None

def extract_h5_from_gzip(gzip_path):
    try:
        with gzip.open(gzip_path, 'rb') as gz:
            return io.BytesIO(gz.read())
    except Exception as e:
        return None

def extract_h5_from_zip(zip_path, h5_filename=None):
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            if h5_filename is None:
                h5_files = [f for f in zip_ref.namelist() if f.endswith('.h5')]
                if not h5_files: return None
                h5_filename = h5_files[0]
            h5_data = zip_ref.read(h5_filename)
            return io.BytesIO(h5_data)
    except Exception:
        return None

def extract_h5_from_tar(tar_path, h5_filename=None):
    try:
        mode = 'r:gz' if tar_path.suffix == '.gz' else 'r'
        with tarfile.open(tar_path, mode) as tar:
            if h5_filename is None:
                h5_files = [m for m in tar.getmembers() if m.name.endswith('.h5')]
                if not h5_files: return None
                h5_filename = h5_files[0].name
            member = tar.getmember(h5_filename)
            h5_data = tar.extractfile(member).read()
            return io.BytesIO(h5_data)
    except Exception:
        return None

def process_compressed_h5(compressed_path, output_dir, radar_id='LOXX', clutter_maps=None, clutter_dir=None,
                        vmin=10.0, vmax=70.0, transparent_below=8.0, cmap='meteorological', default_bounds=None):
    compressed_path = Path(compressed_path)
    output_dir = Path(output_dir)
    comp_type = detect_compression_type(compressed_path)
    if not comp_type: return None
    
    h5_buffer = None
    if comp_type == 'zip': h5_buffer = extract_h5_from_zip(compressed_path, None)
    elif comp_type == 'gzip': h5_buffer = extract_h5_from_gzip(compressed_path)
    elif comp_type == 'tar': h5_buffer = extract_h5_from_tar(compressed_path)
    
    if h5_buffer is None: return None
    
    timestamp_str = extract_timestamp_from_filename_simple(compressed_path.name)
    if not timestamp_str:
        timestamp = datetime.utcfromtimestamp(compressed_path.stat().st_mtime)
    else:
        try:
            date_str, time_str = timestamp_str.split('_')
            timestamp = datetime.strptime(f"{date_str}_{time_str}", "%Y%m%d_%H%M%S")
        except:
            timestamp = datetime.utcfromtimestamp(compressed_path.stat().st_mtime)
            
    try:
        all_dbzh_data = []
        all_metadata = []
        
        if ADVANCED_FUNCTIONS_AVAILABLE:
            for dataset_number in range(1, 6):
                data, metadata = extract_dbzh_data(h5_buffer, dataset_number, 2)
                if data is None or metadata is None or metadata.get('quantity', '') != 'DBZH': continue
                data = np.where(data > 100.0, 100.0, data)
                valid_mask = ~np.isnan(data)
                if np.any(valid_mask):
                    data_filtered = data.copy()
                    data_filtered[valid_mask] = median_filter(data[valid_mask], size=3, mode='nearest')
                    data = data_filtered
                
                if clutter_maps:
                    clutter_key = f"dataset{dataset_number}_data2"
                    if clutter_key in clutter_maps:
                        clutter_map = clutter_maps[clutter_key]
                        if data.shape == clutter_map.shape:
                            corrected_data = apply_clutter_correction(
                                data, clutter_map, method='adaptive', min_threshold=vmin, clutter_factor=1.5
                            )
                            if not np.isnan(corrected_data).all():
                                corrected_data = fast_interpolate_small_gaps_optimized(corrected_data, max_gap_size=2)
                                all_dbzh_data.append(corrected_data)
                                all_metadata.append(metadata)
                                continue
                all_dbzh_data.append(data)
                all_metadata.append(metadata)
            
            if not all_dbzh_data: return None
            stacked_data = np.stack(all_dbzh_data)
            max_dbzh = np.nanmax(stacked_data, axis=0)
            if np.isnan(max_dbzh).all(): return None
            metadata = all_metadata[0]
            cart_data, cart_metadata = create_cartesian_data_optimized_new(max_dbzh, metadata, min_dbzh_threshold=0.0, resolution_factor=2)
            valid_data = cart_data > cart_metadata['nodata']
            if not np.any(valid_data): return None
            data_array = cart_data
            center_lat = metadata.get('lat', RADAR_INFO['default_lat'])
            center_lon = metadata.get('lon', RADAR_INFO['default_lon'])
            max_radius = cart_metadata.get('max_radius', 120000)
            dataset_path = 'DBZH'
        else:
            with h5py.File(h5_buffer, 'r') as h5file:
                dataset_path = None
                data_array = None
                all_dbzh_data = []
                for ds_num in range(1, 6):
                    try:
                        test_path = f"dataset{ds_num}/data2/data"
                        if test_path in h5file:
                            test_data = h5file[test_path][...]
                            if test_data.ndim >= 2 and np.prod(test_data.shape) > 1000:
                                data_2d = np.array(test_data, dtype=np.float32)
                                if data_2d.ndim == 3: data_2d = data_2d[-1]
                                
                                # APLICAR CALIBRACIÓN: dBZ = (valor × gain) + offset
                                what_path = f"dataset{ds_num}/data2/what"
                                gain = 0.5  # Default
                                offset = -32.0  # Default
                                nodata = 255.0  # Default
                                
                                if what_path in h5file:
                                    what = h5file[what_path]
                                    if 'gain' in what.attrs:
                                        gain = float(what.attrs['gain'])
                                    if 'offset' in what.attrs:
                                        offset = float(what.attrs['offset'])
                                    if 'nodata' in what.attrs:
                                        nodata = float(what.attrs['nodata'])
                                
                                # Marcar nodata como NaN ANTES de calibrar
                                data_2d[data_2d == nodata] = np.nan
                                
                                # Aplicar calibración
                                data_2d = (data_2d * gain) + offset
                                
                                valid_count = np.sum(~np.isnan(data_2d))
                                if valid_count > 100:
                                    all_dbzh_data.append(data_2d)
                    except Exception: continue
                
                if len(all_dbzh_data) > 0:
                    stacked = np.stack(all_dbzh_data)
                    data_array = np.nanmax(stacked, axis=0)
                    dataset_path = "dataset1-N/data2/data (combinado)"
                else:
                    dataset_path = detect_dataset(h5file)
                    data_array = load_data(h5file, dataset_path)
                
                scan_metadata = { 'nrays': data_array.shape[0], 'nbins': data_array.shape[1], 'rscale': 75.0 }
                cart_data, cart_metadata = create_cartesian_data_optimized_new(data_array, scan_metadata, min_dbzh_threshold=0.0, resolution_factor=2)
                if cart_data is not None:
                    data_array = cart_data
                    max_radius = cart_metadata.get('max_radius', 120000)
                else:
                    max_radius = 120000
                
                time_value = detect_time(h5file)
                if time_value: timestamp = time_value
            center_lat, center_lon = RADAR_INFO['default_lat'], RADAR_INFO['default_lon']
            
        png_path, json_path, date_str, _ = build_output_paths(output_dir, radar_id, timestamp)
        h5_additional_info = extract_h5_additional_info(h5_buffer)
        
        image = to_rgba(data_array, vmin=vmin, vmax=vmax, transparent_below=transparent_below, cmap_name=cmap)
        img_width, img_height = image.size
        bounds_leaflet = calculate_bounds_from_metadata(center_lat, center_lon, max_radius, (img_height, img_width))
        
        image.save(png_path, format="PNG")
        
        metadata_dict = build_metadata(radar_id, dataset_path, data_array, timestamp, date_str, bounds_leaflet,
                                     argparse.Namespace(input=str(compressed_path), vmin=vmin, vmax=vmax, transparent_below=transparent_below, cmap=cmap),
                                     png_path, h5_additional_info=h5_additional_info, h5_buffer=h5_buffer)
        
        if 'bounds' in metadata_dict and isinstance(metadata_dict['bounds'], dict):
            metadata_dict['bounds'] = [metadata_dict['bounds'].get('southWest', []), metadata_dict['bounds'].get('northEast', [])]
        
        metadata_dict['radar_info'] = {'id': RADAR_INFO['id'], 'name': RADAR_INFO['name'], 'lat': center_lat, 'lon': center_lon, 'height': RADAR_INFO['default_height']}
        metadata_dict['image_dimensions'] = {'width': img_width, 'height': img_height, 'aspect_ratio': img_width/img_height if img_height > 0 else 1.0}
        
        json_path.write_text(json.dumps(metadata_dict, ensure_ascii=False, indent=2), encoding="utf-8")
        
        return {'png': str(png_path), 'json': str(json_path), 'metadata': metadata_dict}
        
    except Exception as e:
        print(f"Error procesando: {e}")
        return None

def process_directory(input_dir, output_dir, radar_id='LOXX', clutter_dir=None, clutter_cache_file=None,
                    vmin=10.0, vmax=70.0, transparent_below=8.0, cmap='meteorological', default_bounds=None, recursive=True):
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    compressed_extensions = ['.zip', '.gz', '.tar', '.tgz', '.tar.gz']
    compressed_files = []
    if recursive:
        for ext in compressed_extensions: compressed_files.extend(input_dir.rglob(f'*{ext}'))
    else:
        for ext in compressed_extensions: compressed_files.extend(input_dir.glob(f'*{ext}'))
    
    results = []
    for compressed_file in compressed_files:
        result = process_compressed_h5(compressed_file, output_dir, radar_id, None, clutter_dir, vmin, vmax, transparent_below, cmap, default_bounds)
        if result: results.append(result)
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Procesa archivos H5 comprimidos del radar LOXX')
    parser.add_argument('--input-dir', default='F:\\LOXX\\H5')
    parser.add_argument('--input-file')
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--radar-id', default='LOXX')
    parser.add_argument('--clutter-dir')
    parser.add_argument('--clutter-cache')
    parser.add_argument('--vmin', type=float, default=10.0)
    parser.add_argument('--vmax', type=float, default=70.0)
    parser.add_argument('--transparent-below', type=float, default=8.0)
    parser.add_argument('--cmap', default='meteorological')
    parser.add_argument('--default-bounds')
    parser.add_argument('--recursive', action='store_true')
    parser.add_argument('--watch', action='store_true')
    parser.add_argument('--debounce-time', type=float, default=5.0)
    parser.add_argument('--skip-existing', action='store_true')
    
    args = parser.parse_args()
    
    if args.input_file:
        process_compressed_h5(args.input_file, args.output_dir, args.radar_id, None, args.clutter_dir, args.vmin, args.vmax, args.transparent_below, args.cmap, None)
    elif args.input_dir:
        process_directory(args.input_dir, args.output_dir, args.radar_id, None, None, args.vmin, args.vmax, args.transparent_below, args.cmap, None, args.recursive)
