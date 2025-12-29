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
            # Si se especifica 'meteorological' o 'dbzh', usar escala igual a GUAXX
            if cmap_name in ['meteorological', 'dbzh', 'radar']:
                # Escala de colores idéntica a GUAXX (advanced_ppi_converter_standalone.py)
                # Definir niveles y colores RGBA directamente (R, G, B, A) en rango 0-255
                # Los niveles definen los límites de cada rango de color
                dbzh_levels = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 100]
                
                # Colores RGBA en formato (R, G, B, A) con valores 0-255
                # Exactamente iguales a los de GUAXX
                # IMPORTANTE: BoundaryNorm necesita n_colors = n_boundaries - 1
                rgba_colors = [
                    (0, 0, 0, 0),        # Transparente (0-5 dBZ)
                    (0, 255, 0, 100),    # Verde muy ligero (5-10 dBZ)
                    (50, 255, 0, 120),   # Verde (10-15 dBZ)
                    (100, 255, 0, 140),  # Verde amarillento (15-20 dBZ)
                    (150, 255, 0, 160),  # Amarillo verdoso (20-25 dBZ)
                    (255, 255, 0, 180),  # Amarillo (25-30 dBZ)
                    (255, 200, 0, 200),  # Amarillo naranja (30-35 dBZ)
                    (255, 150, 0, 220),  # Naranja (35-40 dBZ)
                    (255, 100, 0, 240),  # Naranja rojizo (40-45 dBZ)
                    (255, 50, 0, 255),   # Rojo (45-50 dBZ)
                    (255, 0, 100, 255),  # Rojo magenta (50-55 dBZ)
                    (255, 0, 200, 255),  # Magenta (55-60 dBZ)
                    (200, 0, 255, 255)   # Magenta púrpura (>60 dBZ)
                ]
                
                # Normalizar colores a rango 0-1 para matplotlib
                rgba_colors_normalized = [(r/255.0, g/255.0, b/255.0, a/255.0) for r, g, b, a in rgba_colors]
                
                # Crear colormap
                # BoundaryNorm: con n_boundaries límites, necesitamos n_boundaries - 1 colores
                # Tenemos 13 límites (0, 5, 10, ..., 60, 100) = 12 intervalos
                # Por lo tanto necesitamos 12 colores, pero tenemos 13
                # Solución: usar todos los límites pero solo los primeros 12 colores para los intervalos
                # El último color se aplicará manualmente para valores >60
                cmap = ListedColormap(rgba_colors_normalized[:12])  # Usar solo 12 colores para los 12 intervalos
                # Usar todos los límites excepto el último (100) para BoundaryNorm
                norm = BoundaryNorm(dbzh_levels[:-1], 12)  # 12 límites = 11 intervalos, pero usamos 12 colores
                
                # Preparar datos - limitar a rango válido y reemplazar valores inválidos
                # Clippear a 60 para que use los colores normales, luego agregar el color especial para >60
                clipped = np.clip(data, 0, 60)
                # Reemplazar NaN con 0 para que BoundaryNorm funcione correctamente
                clipped = np.where(np.isnan(clipped), 0, clipped)
                
                # Aplicar colormap
                rgba = cmap(norm(clipped))
                
                # Para valores >60 dBZ, usar el último color (magenta púrpura)
                high_values = (data > 60) & ~np.isnan(data)
                if np.any(high_values):
                    rgba[high_values] = [200/255.0, 0, 255/255.0, 255/255.0]  # Magenta púrpura
                
                # Aplicar transparencia adicional: valores menores a transparent_below y NaN
                # Usar los datos originales (sin clip) para la máscara de transparencia
                alpha_mask = np.where(
                    np.isnan(data) | (data < transparent_below) | (data < 5),
                    0.0, 1.0
                )
                rgba[..., 3] = rgba[..., 3] * alpha_mask
                
            else:
                # Usar colormap estándar de matplotlib (turbo, viridis, etc.)
                norm = colors.Normalize(vmin=vmin, vmax=vmax)
                # Usar la nueva API de matplotlib para evitar deprecation warning
                try:
                    # Matplotlib 3.7+
                    cmap = matplotlib.colormaps.get_cmap(cmap_name)
                except AttributeError:
                    # Fallback para versiones anteriores
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
        """
        Calcula precipitación estimada (mm/h) desde reflectividad en dBZ
        usando la fórmula Marshall-Palmer: Z = 200 * R^1.6
        
        Args:
            dbz_value: Valor de reflectividad en dBZ
        
        Returns:
            Precipitación en mm/h
        """
        if dbz_value is None or np.isnan(dbz_value) or dbz_value <= 0:
            return 0.0
        
        # Convertir dBZ a Z (reflectividad lineal en mm^6/m^3)
        Z = np.power(10, dbz_value / 10.0)
        
        # Fórmula Marshall-Palmer: Z = 200 * R^1.6
        # Despejar R: R = (Z/200)^(1/1.6)
        R = np.power(Z / 200.0, 1.0 / 1.6)
        
        return float(R)
    
    def calculate_precipitation_stats(data_array):
        """
        Calcula estadísticas de precipitación desde datos de reflectividad (dBZ)
        
        Args:
            data_array: Array con valores de reflectividad en dBZ
        
        Returns:
            Diccionario con estadísticas de precipitación
        """
        # Filtrar valores válidos
        valid_data = data_array[~np.isnan(data_array) & (data_array > 0)]
        
        if len(valid_data) == 0:
            return {
                "min": 0.0,
                "max": 0.0,
                "mean": 0.0,
                "std": 0.0,
                "total": 0.0,
                "maxDbz": 0.0
            }
        
        # Calcular precipitación para cada valor válido
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
        """
        Extrae información adicional del archivo H5
        
        Args:
            h5_buffer: Buffer del archivo H5 (BytesIO o path)
            h5file: Archivo H5 abierto (opcional)
        
        Returns:
            Diccionario con información adicional
        """
        additional_info = {
            "elevations": [],
            "scan_parameters": {},
            "radar_parameters": {},
            "file_info": {}
        }
        
        try:
            # Si no se proporciona h5file, abrirlo
            close_file = False
            if h5file is None:
                # Resetear buffer si es posible
                if hasattr(h5_buffer, 'seek'):
                    h5_buffer.seek(0)
                h5file = h5py.File(h5_buffer, 'r')
                close_file = True
            
            # Extraer información de elevaciones
            for ds_num in range(1, 6):
                try:
                    elev_path = f"dataset{ds_num}/where"
                    if elev_path in h5file:
                        elev_data = h5file[elev_path]
                        if 'elangle' in elev_data.attrs:
                            elevation = float(elev_data.attrs['elangle'])
                            additional_info["elevations"].append({
                                "dataset": ds_num,
                                "elevation": elevation
                            })
                except (KeyError, AttributeError, TypeError):
                    continue
            
            # Extraer parámetros de escaneo
            try:
                # Buscar información de rango, resolución, etc.
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
            except Exception as e:
                pass  # Silenciar errores menores
            
            # Extraer información del radar
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
            
            # Información del archivo
            try:
                if hasattr(h5file, 'filename'):
                    additional_info["file_info"]["filename"] = str(h5file.filename)
            except Exception:
                pass
            
            if close_file:
                h5file.close()
                
        except Exception as e:
            # Error silencioso, retornar info vacía
            pass
        
        return additional_info
    
    def build_metadata(radar_id, dataset_path, data_array, timestamp, date_str, bounds, args, png_path, 
                      h5_additional_info=None, h5_buffer=None):
        """
        Construye metadata completo incluyendo precipitación y información adicional del H5
        """
        # Calcular estadísticas básicas
        stats = {
            "min": float(np.nanmin(data_array)),
            "max": float(np.nanmax(data_array)),
            "mean": float(np.nanmean(data_array)),
            "std": float(np.nanstd(data_array)),
            "validCount": int(np.isfinite(data_array).sum()),
            "totalCount": int(np.size(data_array))
        }
        
        # Calcular estadísticas de precipitación
        precipitation_stats = calculate_precipitation_stats(data_array)
        
        # Construir metadata base
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
        
        # Agregar información adicional del H5 si está disponible
        if h5_additional_info:
            metadata["elevations"] = h5_additional_info.get("elevations", [])
            metadata["scan_parameters"] = h5_additional_info.get("scan_parameters", {})
            metadata["radar_parameters"] = h5_additional_info.get("radar_parameters", {})
            metadata["file_info"] = h5_additional_info.get("file_info", {})
        
        # Agregar información de reflectividad en dBZ (maxDbz, minDbz)
        metadata["maxDbz"] = stats["max"]
        metadata["minDbz"] = stats["min"]
        
        return metadata

# Información del radar LOXX
RADAR_INFO = {
    'id': 'loxx',
    'name': 'LOXX',
    'default_lat': -3.9960,
    'default_lon': -79.2058,
    'default_height': 2144.0
}

def create_cartesian_data_optimized_new(data, metadata, min_dbzh_threshold=10.0, resolution_factor=2):
        """
        Convierte datos polares de DBZH a coordenadas cartesianas
        Basado en el proyecto de referencia para LOXX
        
        Args:
            data: Datos en coordenadas polares (dBZ) - shape (nrays, nbins)
            metadata: Metadata del radar con nrays, nbins, rscale
            min_dbzh_threshold: Umbral mínimo en dBZ (default: 10.0)
            resolution_factor: Factor de resolución
        
        Returns:
            tuple: (cart_data, cart_metadata)
        """
        if data is None or len(data.shape) != 2:
            print(f"Error: Invalid data shape: {None if data is None else data.shape}")
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
        
        # Tamaño fijo de 949x949 píxeles (como en el proyecto de referencia)
        width_px = height_px = 949
        center_px_x = width_px // 2
        center_px_y = height_px // 2
        
        # Crear grilla de coordenadas
        y, x = np.ogrid[:height_px, :width_px]
        
        # Calcular distancia y ángulo desde el centro
        dx = x - center_px_x
        dy = center_px_y - y
        
        distance = np.hypot(dx, dy) * pixel_size
        angle = np.arctan2(dy, dx)
        angle = np.where(angle < 0, angle + 2 * np.pi, angle)
        
        # Convertir a índices de bin y rayo
        bin_idx = (distance / rscale).astype(np.int32)
        # Ajustar ángulo: el radar empieza en el norte (π/2)
        ray_angle = (np.pi/2 - angle) % (2*np.pi)
        ray_idx = ((ray_angle / (2*np.pi) * nrays) % nrays).astype(np.int32)
        
        # Crear máscara de validación
        valid_mask = (distance <= max_radius_meters) & (bin_idx < nbins)
        
        # Inicializar datos cartesianos
        cart_data = np.full((height_px, width_px), -999, dtype=np.float32)
        
        # Obtener puntos válidos
        valid_points = valid_mask & (bin_idx >= 0) & (ray_idx >= 0) & (bin_idx < nbins) & (ray_idx < nrays)
        valid_y, valid_x = np.where(valid_points)
        
        try:
            valid_bin_idx = bin_idx[valid_points]
            valid_ray_idx = ray_idx[valid_points]
            
            # Validar índices
            valid_indices = (valid_ray_idx < nrays) & (valid_bin_idx < nbins)
            valid_ray_idx = valid_ray_idx[valid_indices]
            valid_bin_idx = valid_bin_idx[valid_indices]
            valid_y = valid_y[valid_indices]
            valid_x = valid_x[valid_indices]
            
            # Obtener valores de los datos polares
            valid_values = data[valid_ray_idx, valid_bin_idx]
            
            # Filtrar por umbral mínimo
            valid_values_mask = ~np.isnan(valid_values) & (valid_values >= min_dbzh_threshold)
            cart_data[valid_y[valid_values_mask], valid_x[valid_values_mask]] = valid_values[valid_values_mask]
        except Exception as e:
            print(f"Error durante la transformación de datos: {e}")
        
        # Interpolar huecos pequeños
        mask = cart_data == -999
        temp_data = np.copy(cart_data)
        temp_data[mask] = np.nan
        
        # Usar interpolación rápida
        from scipy.ndimage import label
        filled_data = fast_interpolate_small_gaps_optimized(temp_data, max_gap_size=4)
        filled_data[np.isnan(filled_data)] = -999
        
        cart_metadata = {
            'width': width_px,
            'height': height_px,
            'center_x': center_px_x,
            'center_y': center_px_y,
            'pixel_size': pixel_size,
            'max_radius': max_radius_meters,
            'nodata': -999,
            'resolution_factor': resolution_factor
        }
        
        return filled_data, cart_metadata

def fast_interpolate_small_gaps_optimized(data, max_gap_size=2):
    """Interpola huecos pequeños en los datos"""
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
    """
    Calcula los bounds en formato Leaflet desde las coordenadas del radar
    Formato: [[lat_min, lon_min], [lat_max, lon_max]]
    
    Los bounds se ajustan al aspect ratio de la imagen para evitar compresión/distorsión.
    El radio máximo se mantiene, pero el rectángulo de bounds refleja las dimensiones de la imagen.
    
    Args:
        center_lat: Latitud del centro del radar
        center_lon: Longitud del centro del radar
        max_radius_meters: Radio máximo en metros (cobertura del radar)
        image_shape: Tupla (height, width) de la imagen para calcular aspect ratio
    """
    # Conversión: 1 grado ≈ 111 km
    max_radius_deg = max_radius_meters / 111000.0
    
    # Si tenemos las dimensiones de la imagen, ajustar bounds al aspect ratio
    if image_shape and len(image_shape) >= 2:
        height, width = image_shape[0], image_shape[1]
        aspect_ratio = width / height if height > 0 else 1.0
        
        print(f"  Dimensiones imagen: {width}x{height} (aspect ratio: {aspect_ratio:.3f})")
        
        # Calcular radios ajustados para que los bounds coincidan con el aspect ratio
        # El radio máximo se mantiene como la diagonal del rectángulo
        # Para un rectángulo con aspect_ratio = w/h:
        # - Si aspect_ratio > 1 (más ancha): más rango en longitud
        # - Si aspect_ratio < 1 (más alta): más rango en latitud
        
        if aspect_ratio >= 1.0:
            # Imagen más ancha o cuadrada: mantener radio vertical, expandir horizontal
            lat_radius = max_radius_deg
            lon_radius = max_radius_deg * aspect_ratio
        else:
            # Imagen más alta: expandir radio vertical, mantener horizontal
            lat_radius = max_radius_deg / aspect_ratio
            lon_radius = max_radius_deg
        
        print(f"  Radios ajustados: lat={lat_radius:.6f}°, lon={lon_radius:.6f}°")
    else:
        # Sin dimensiones: usar bounds cuadrados por defecto
        lat_radius = max_radius_deg
        lon_radius = max_radius_deg
        print(f"  Sin dimensiones de imagen, usando bounds cuadrados")
    
    # Calcular esquinas del rectángulo
    lat_sw = center_lat - lat_radius
    lon_sw = center_lon - lon_radius
    lat_ne = center_lat + lat_radius
    lon_ne = center_lon + lon_radius
    
    # Formato para Leaflet: [[south, west], [north, east]]
    bounds = [[lat_sw, lon_sw], [lat_ne, lon_ne]]
    
    print(f"Bounds calculados para Leaflet:")
    print(f"  Centro: [{center_lat:.6f}, {center_lon:.6f}]")
    print(f"  Radio base: {max_radius_deg:.6f}° (≈{max_radius_meters/1000:.1f}km)")
    print(f"  SW: [{lat_sw:.6f}, {lon_sw:.6f}]")
    print(f"  NE: [{lat_ne:.6f}, {lon_ne:.6f}]")
    print(f"  Dimensiones bounds: lat={lat_ne-lat_sw:.6f}°, lon={lon_ne-lon_sw:.6f}°")
    
    return bounds

def extract_timestamp_from_filename_simple(filename):
    """Extrae timestamp del nombre de archivo"""
    # Formato: 1003_20251206_193000.h5.gz
    pattern = r'(\d{8})_(\d{6})'
    match = re.search(pattern, filename)
    if match:
        return f"{match.group(1)}_{match.group(2)}"
    return None

def detect_compression_type(file_path):
    """Detecta el tipo de compresión del archivo"""
    file_path = Path(file_path)
    ext = file_path.suffix.lower()
    
    if ext == '.zip':
        return 'zip'
    elif ext in ['.tar', '.tar.gz', '.tgz']:
        return 'tar'
    elif ext == '.gz':
        return 'gzip'
    else:
        # Intentar detectar por contenido
        try:
            with open(file_path, 'rb') as f:
                header = f.read(4)
                if header.startswith(b'PK'):
                    return 'zip'
                elif header.startswith(b'\x1f\x8b'):
                    return 'gzip'
                elif header.startswith(b'ustar'):
                    return 'tar'
        except Exception:
            pass
    
    return None

def extract_h5_from_gzip(gzip_path):
    """Extrae un archivo .h5 desde un GZIP en memoria"""
    try:
        with gzip.open(gzip_path, 'rb') as gz:
            return io.BytesIO(gz.read())
    except Exception as e:
        print(f"Error extrayendo de {gzip_path}: {e}")
        return None

def extract_h5_from_zip(zip_path, h5_filename=None):
    """Extrae un archivo .h5 desde un ZIP en memoria"""
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            if h5_filename is None:
                # Buscar cualquier archivo .h5 en el ZIP
                h5_files = [f for f in zip_ref.namelist() if f.endswith('.h5')]
                if not h5_files:
                    return None
                h5_filename = h5_files[0]
            
            # Leer el archivo .h5 en memoria
            h5_data = zip_ref.read(h5_filename)
            return io.BytesIO(h5_data)
    except Exception as e:
        print(f"Error extrayendo {h5_filename} de {zip_path}: {e}")
        return None

def extract_h5_from_tar(tar_path, h5_filename=None):
    """Extrae un archivo .h5 desde un TAR en memoria"""
    try:
        mode = 'r:gz' if tar_path.suffix == '.gz' else 'r'
        with tarfile.open(tar_path, mode) as tar:
            if h5_filename is None:
                # Buscar cualquier archivo .h5
                h5_files = [m for m in tar.getmembers() if m.name.endswith('.h5')]
                if not h5_files:
                    return None
                h5_filename = h5_files[0].name
            
            member = tar.getmember(h5_filename)
            h5_data = tar.extractfile(member).read()
            return io.BytesIO(h5_data)
    except Exception as e:
        print(f"Error extrayendo de {tar_path}: {e}")
        return None

def process_compressed_h5(compressed_path, output_dir, radar_id='LOXX', 
                        clutter_maps=None, clutter_dir=None,
                        vmin=10.0, vmax=70.0, transparent_below=8.0, 
                        cmap='meteorological', default_bounds=None):
    """
    Procesa un archivo comprimido usando el enfoque avanzado similar a generar_png_loxx.py
    """
    compressed_path = Path(compressed_path)
    output_dir = Path(output_dir)
    
    if not compressed_path.exists():
        print(f"Archivo no encontrado: {compressed_path}")
        return None
    
    # Detectar tipo de compresión
    comp_type = detect_compression_type(compressed_path)
    if not comp_type:
        print(f"No se pudo detectar el tipo de compresión de {compressed_path}")
        return None
    
    print(f"Procesando {compressed_path.name} (tipo: {comp_type})")
    
    # Extraer .h5 en memoria
    h5_buffer = None
    if comp_type == 'zip':
        h5_buffer = extract_h5_from_zip(compressed_path, None)
    elif comp_type == 'gzip':
        h5_buffer = extract_h5_from_gzip(compressed_path)
    elif comp_type == 'tar':
        h5_buffer = extract_h5_from_tar(compressed_path)
    
    if h5_buffer is None:
        print(f"No se encontró archivo .h5 en {compressed_path}")
        return None
    
    # Extraer timestamp del nombre del archivo
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
        
        # Si tenemos funciones avanzadas, usar el enfoque avanzado
        if ADVANCED_FUNCTIONS_AVAILABLE:
            print("  Usando procesamiento avanzado con DBZH...")
            
            # Procesar múltiples datasets (elevaciones) - DBZH está en data2
            for dataset_number in range(1, 6):
                data, metadata = extract_dbzh_data(h5_buffer, dataset_number, 2)
                
                if data is None or metadata is None or metadata.get('quantity', '') != 'DBZH':
                    continue
                
                # Aplicar filtro de mediana
                if data is not None:
                    data = np.where(data > 100.0, 100.0, data)
                    valid_mask = ~np.isnan(data)
                    if np.any(valid_mask):
                        data_filtered = data.copy()
                        data_filtered[valid_mask] = median_filter(data[valid_mask], size=3, mode='nearest')
                        data = data_filtered
                
                # Aplicar corrección de clutter si hay mapas disponibles
                if clutter_maps:
                    clutter_key = f"dataset{dataset_number}_data2"
                    if clutter_key in clutter_maps:
                        clutter_map = clutter_maps[clutter_key]
                        if data.shape == clutter_map.shape:
                            corrected_data = apply_clutter_correction(
                                data, clutter_map, method='adaptive',
                                min_threshold=vmin,
                                clutter_factor=1.5
                            )
                            if not np.isnan(corrected_data).all():
                                corrected_data = fast_interpolate_small_gaps_optimized(
                                    corrected_data, max_gap_size=2
                                )
                                all_dbzh_data.append(corrected_data)
                                all_metadata.append(metadata)
                                print(f"    Dataset{dataset_number}/data2 procesado con corrección de clutter")
                                continue
                
                # Si no hay clutter, usar datos sin corrección
                all_dbzh_data.append(data)
                all_metadata.append(metadata)
                print(f"    Dataset{dataset_number}/data2 procesado sin corrección de clutter")
            
            if not all_dbzh_data:
                print(f"    No se pudieron extraer datos DBZH")
                return None
            
            # Combinar elevaciones (tomar máximo)
            stacked_data = np.stack(all_dbzh_data)
            max_dbzh = np.nanmax(stacked_data, axis=0)
            
            if np.isnan(max_dbzh).all():
                print(f"    Todos los valores son NaN")
                return None
            
            metadata = all_metadata[0]
            
            # Transformación cartesiana
            print(f"    Aplicando transformación cartesiana...")
            cart_data, cart_metadata = create_cartesian_data_optimized_new(
                max_dbzh, metadata, vmin, resolution_factor=2
            )
            
            # Verificar datos válidos
            valid_data = cart_data > cart_metadata['nodata']
            if not np.any(valid_data):
                print("    No hay datos válidos después del procesamiento")
                return None
            
            # Usar datos cartesianos para generar imagen
            data_array = cart_data
            center_lat = metadata.get('lat', RADAR_INFO['default_lat'])
            center_lon = metadata.get('lon', RADAR_INFO['default_lon'])
            max_radius = cart_metadata.get('max_radius', 120000)
            
        else:
            # Enfoque básico si no hay funciones avanzadas
            print("  Usando procesamiento básico...")
            with h5py.File(h5_buffer, 'r') as h5file:
                # Intentar buscar datos DBZH específicamente
                dataset_path = None
                data_array = None
                
                # Buscar específicamente data2 (DBZH) primero, luego data1 como fallback
                # Priorizar data2 porque ahí está DBZH (reflectividad)
                all_dbzh_data = []
                all_metadata = []
                
                # Buscar DBZH en data2 de múltiples elevaciones
                for ds_num in range(1, 6):
                    try:
                        # Priorizar data2 (DBZH)
                        test_path = f"dataset{ds_num}/data2/data"
                        if test_path in h5file:
                            test_data = h5file[test_path][...]
                            if test_data.ndim >= 2 and np.prod(test_data.shape) > 1000:
                                data_2d = np.array(test_data, dtype=np.float32)
                                if data_2d.ndim == 3:
                                    data_2d = data_2d[-1]
                                
                                # Verificar que tenga datos válidos distribuidos
                                valid_data = ~np.isnan(data_2d)
                                valid_count = np.sum(valid_data)
                                total_count = np.prod(data_2d.shape)
                                
                                if valid_count > 100:  # Al menos 100 píxeles válidos
                                    all_dbzh_data.append(data_2d)
                                    print(f"    Encontrado dataset{ds_num}/data2 (shape: {data_2d.shape}, válidos: {valid_count}/{total_count})")
                    except (KeyError, AttributeError) as e:
                        continue
                
                # Si encontramos múltiples elevaciones, combinar (tomar máximo)
                if len(all_dbzh_data) > 0:
                    if len(all_dbzh_data) > 1:
                        print(f"    Combinando {len(all_dbzh_data)} elevaciones (tomando máximo)...")
                        stacked = np.stack(all_dbzh_data)
                        data_array = np.nanmax(stacked, axis=0)
                        dataset_path = f"dataset1-{len(all_dbzh_data)}/data2/data (combinado)"
                    else:
                        data_array = all_dbzh_data[0]
                        dataset_path = "dataset1/data2/data"
                    
                    print(f"    Usando DBZH combinado (shape: {data_array.shape})")
                else:
                    # Fallback: buscar data1 si no hay data2
                    print("    No se encontró data2, buscando data1...")
                    for ds_num in range(1, 6):
                        try:
                            test_path = f"dataset{ds_num}/data1/data"
                            if test_path in h5file:
                                test_data = h5file[test_path][...]
                                if test_data.ndim >= 2 and np.prod(test_data.shape) > 1000:
                                    dataset_path = test_path
                                    data_array = np.array(test_data, dtype=np.float32)
                                    if data_array.ndim == 3:
                                        data_array = data_array[-1]
                                    print(f"    Encontrado dataset: {dataset_path} (shape: {data_array.shape})")
                                    break
                        except (KeyError, AttributeError):
                            continue
                    
                    # Si aún no se encontró, usar detección automática
                    if dataset_path is None:
                        dataset_path = detect_dataset(h5file)
                        data_array = load_data(h5file, dataset_path)
                        print(f"    Usando dataset detectado: {dataset_path} (shape: {data_array.shape})")
                
                # Verificar dimensiones
                if data_array is None or data_array.ndim < 2:
                    print(f"    Error: Dataset tiene {data_array.ndim if data_array is not None else 0} dimensiones, se necesitan al menos 2")
                    return None
                
                # Verificar distribución de datos
                valid_mask = ~np.isnan(data_array)
                valid_count = np.sum(valid_mask)
                total_count = np.prod(data_array.shape)
                valid_percentage = (valid_count / total_count) * 100
                
                print(f"    Datos válidos: {valid_count}/{total_count} ({valid_percentage:.1f}%)")
                
                # Verificar que no sea una línea (una dimensión muy pequeña)
                if min(data_array.shape) < 10:
                    print(f"    Advertencia: Una dimensión es muy pequeña ({data_array.shape}), puede generar una línea")
                    print(f"    Considera usar loxx_dbzh_georeferenciado.py para mejor procesamiento")
                
                # Verificar distribución espacial de datos válidos
                if valid_count > 0:
                    # Verificar que los datos no estén concentrados en una sola línea
                    rows_with_data = np.sum(np.any(valid_mask, axis=1) if data_array.ndim == 2 else False)
                    cols_with_data = np.sum(np.any(valid_mask, axis=0) if data_array.ndim == 2 else False)
                    
                    print(f"    Filas con datos: {rows_with_data}/{data_array.shape[0]}")
                    print(f"    Columnas con datos: {cols_with_data}/{data_array.shape[1]}")
                    
                    # Los datos polares siempre necesitan transformación cartesiana
                    # Extraer metadata de parámetros de escaneo
                    scan_metadata = {
                        'nrays': data_array.shape[0] if data_array.ndim == 2 else 360,
                        'nbins': data_array.shape[1] if data_array.ndim == 2 else 120,
                        'rscale': 75.0  # Valor por defecto, se puede extraer del H5
                    }
                    
                    # Intentar obtener parámetros reales del H5
                    try:
                        where_path = f"dataset1/where"
                        if where_path in h5file:
                            where_data = h5file[where_path]
                            if 'nrays' in where_data.attrs:
                                scan_metadata['nrays'] = int(where_data.attrs['nrays'])
                            if 'nbins' in where_data.attrs:
                                scan_metadata['nbins'] = int(where_data.attrs['nbins'])
                            if 'rscale' in where_data.attrs:
                                scan_metadata['rscale'] = float(where_data.attrs['rscale'])
                    except Exception:
                        pass
                    
                    print(f"    Aplicando transformación cartesiana polar (nrays={scan_metadata['nrays']}, nbins={scan_metadata['nbins']}, rscale={scan_metadata['rscale']})...")
                    cart_data, cart_metadata = create_cartesian_data_optimized_new(
                        data_array,
                        scan_metadata,
                        min_dbzh_threshold=vmin,
                        resolution_factor=2
                    )
                    if cart_data is not None:
                        data_array = cart_data
                        max_radius = cart_metadata.get('max_radius', 120000)
                        print(f"    ✓ Transformación cartesiana aplicada (nuevo shape: {data_array.shape})")
                    else:
                        print(f"    ⚠️  No se pudo aplicar transformación, usando datos originales")
                        max_radius = 120000
                else:
                    max_radius = 120000
                
                lat_array, lon_array = detect_lat_lon(h5file)
                time_value = detect_time(h5file)
            
            if time_value:
                timestamp = time_value
            
            center_lat = RADAR_INFO['default_lat']
            center_lon = RADAR_INFO['default_lon']
        
            # Construir rutas de salida
            png_path, json_path, date_str, _ = build_output_paths(output_dir, radar_id, timestamp)
            
            # Extraer información adicional del archivo H5
            print(f"    Extrayendo información adicional del archivo H5...")
            h5_additional_info = None
            try:
                # Resetear buffer si es posible (BytesIO tiene seek)
                if hasattr(h5_buffer, 'seek'):
                    h5_buffer.seek(0)
                
                # Extraer información adicional
                h5_additional_info = extract_h5_additional_info(h5_buffer)
                
                if h5_additional_info and (h5_additional_info.get("elevations") or h5_additional_info.get("scan_parameters")):
                    print(f"    ✓ Información adicional extraída: {len(h5_additional_info.get('elevations', []))} elevaciones")
                else:
                    print(f"    ⚠️  No se encontró información adicional en el H5")
            except Exception as e:
                print(f"    Advertencia: No se pudo extraer información adicional del H5: {e}")
                h5_additional_info = None
            
            # NOTA: Siempre reprocesa (sobrescribe) archivos existentes para asegurar
            # que los cambios en el procesamiento se apliquen a todas las imágenes.
            # Esto permite reprocesar todas las imágenes cuando se actualiza el código.
            
            # Convertir a PNG
            print(f"    Generando imagen PNG...")
            print(f"    Dimensiones de datos: {data_array.shape}")
            
            # Diagnosticar rango de datos antes de aplicar colormap
            valid_data = data_array[~np.isnan(data_array)]
            if len(valid_data) > 0:
                print(f"    Rango de datos dBZ: min={np.min(valid_data):.2f}, max={np.max(valid_data):.2f}, mean={np.mean(valid_data):.2f}")
                print(f"    Valores >60 dBZ: {np.sum(valid_data > 60)} de {len(valid_data)} ({100*np.sum(valid_data > 60)/len(valid_data):.1f}%)")
                print(f"    Valores 50-60 dBZ: {np.sum((valid_data >= 50) & (valid_data <= 60))} ({100*np.sum((valid_data >= 50) & (valid_data <= 60))/len(valid_data):.1f}%)")
                print(f"    Valores 0-50 dBZ: {np.sum((valid_data >= 0) & (valid_data < 50))} ({100*np.sum((valid_data >= 0) & (valid_data < 50))/len(valid_data):.1f}%)")
            
            image = to_rgba(
                data_array,
                vmin=vmin,
                vmax=vmax,
                transparent_below=transparent_below,
                cmap_name=cmap
            )
            
            # Obtener dimensiones reales de la imagen generada
            img_width, img_height = image.size
            print(f"    Dimensiones de imagen PNG: {img_width}x{img_height}")
            
            # Calcular bounds para Leaflet usando las dimensiones reales de la imagen
            bounds_leaflet = calculate_bounds_from_metadata(center_lat, center_lon, max_radius, (img_height, img_width))
            
            image.save(png_path, format="PNG")
            
            # Generar metadata con bounds en formato Leaflet, incluyendo precipitación e información adicional
            metadata_dict = build_metadata(
                radar_id,
                dataset_path if not ADVANCED_FUNCTIONS_AVAILABLE else 'DBZH',
                data_array,
                timestamp,
                date_str,
                bounds_leaflet,  # Usar bounds en formato Leaflet
                argparse.Namespace(
                    input=str(compressed_path),
                    vmin=vmin,
                    vmax=vmax,
                    transparent_below=transparent_below,
                    cmap=cmap
                ),
                png_path,
                h5_additional_info=h5_additional_info,
                h5_buffer=h5_buffer
            )
        
        # Asegurar que bounds estén en el formato correcto
        if 'bounds' in metadata_dict:
            # Si bounds está en formato {southWest, northEast}, convertir a formato Leaflet
            if isinstance(metadata_dict['bounds'], dict):
                sw = metadata_dict['bounds'].get('southWest', [])
                ne = metadata_dict['bounds'].get('northEast', [])
                if sw and ne:
                    metadata_dict['bounds'] = [sw, ne]
        
        # Agregar información adicional del radar
        metadata_dict['radar_info'] = {
            'id': RADAR_INFO['id'],
            'name': RADAR_INFO['name'],
            'lat': center_lat,
            'lon': center_lon,
            'height': metadata.get('height', RADAR_INFO['default_height']) if ADVANCED_FUNCTIONS_AVAILABLE else RADAR_INFO['default_height']
        }
        
        # Agregar dimensiones de la imagen para referencia
        metadata_dict['image_dimensions'] = {
            'width': img_width,
            'height': img_height,
            'aspect_ratio': img_width / img_height if img_height > 0 else 1.0
        }
        
        # Guardar metadata
        json_path.write_text(json.dumps(metadata_dict, ensure_ascii=False, indent=2), encoding="utf-8")
        
        print(f"✓ Convertido: {compressed_path.name} -> {png_path.name}")
        print(f"  Bounds: {bounds_leaflet}")
        return {
            'png': str(png_path),
            'json': str(json_path),
            'metadata': metadata_dict
        }
        
    except Exception as e:
        print(f"Error procesando H5 desde {compressed_path}: {e}")
        import traceback
        traceback.print_exc()
        return None

def process_directory(input_dir, output_dir, radar_id='LOXX',
                    clutter_dir=None, clutter_cache_file=None,
                    vmin=10.0, vmax=70.0, transparent_below=8.0, 
                    cmap='meteorological', default_bounds=None, recursive=True):
    """
    Procesa todos los archivos comprimidos en un directorio usando enfoque avanzado
    """
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Cargar mapas de clutter si están disponibles
    clutter_maps = None
    if clutter_dir and ADVANCED_FUNCTIONS_AVAILABLE:
        if clutter_cache_file and os.path.exists(clutter_cache_file):
            clutter_maps, _ = load_clutter_cache(clutter_cache_file)
        if clutter_maps is None and clutter_dir:
            print("Generando mapas de clutter...")
            clutter_maps, _ = generate_clutter_maps(clutter_dir, data_number=2)
            if clutter_maps and clutter_cache_file:
                save_clutter_cache(clutter_maps, {}, clutter_cache_file)
    
    # Extensiones de archivos comprimidos
    compressed_extensions = ['.zip', '.gz', '.tar', '.tgz', '.tar.gz']
    
    # Buscar archivos comprimidos
    if recursive:
        compressed_files = []
        for ext in compressed_extensions:
            compressed_files.extend(input_dir.rglob(f'*{ext}'))
    else:
        compressed_files = []
        for ext in compressed_extensions:
            compressed_files.extend(input_dir.glob(f'*{ext}'))
    
    if not compressed_files:
        print(f"No se encontraron archivos comprimidos en {input_dir}")
        return []
    
    print(f"Encontrados {len(compressed_files)} archivos comprimidos")
    
    results = []
    for compressed_file in compressed_files:
        result = process_compressed_h5(
            compressed_file,
            output_dir,
            radar_id,
            clutter_maps,
            clutter_dir,
            vmin, vmax, transparent_below, cmap, default_bounds
        )
        if result:
            results.append(result)
    
    return results


def start_watch_mode(input_dir, output_dir, radar_id, clutter_dir, clutter_cache,
                     vmin, vmax, transparent_below, cmap, default_bounds, debounce_time, process_existing=True):
    """
    Inicia el modo de monitoreo automático usando watchdog
    
    Args:
        process_existing: Si es True, procesa todos los archivos existentes antes de iniciar el monitoreo
    """
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler, FileSystemEvent
    except ImportError:
        print("ERROR: watchdog no está instalado. Instálalo con: pip install watchdog")
        sys.exit(1)
    
    # Procesar archivos existentes primero
    if process_existing:
        print("=" * 60)
        print("PROCESANDO ARCHIVOS EXISTENTES")
        print("=" * 60)
        print(f"Buscando archivos H5 comprimidos en: {input_dir}")
        
        input_path = Path(input_dir)
        if not input_path.exists():
            print(f"ERROR: El directorio {input_dir} no existe")
            sys.exit(1)
        
        # Buscar archivos comprimidos
        compressed_extensions = ['.h5.gz', '.h5.zip', '.gz']
        existing_files = []
        
        for ext in compressed_extensions:
            if ext == '.gz':
                # Buscar archivos .gz que contengan .h5 en el nombre
                existing_files.extend(input_path.rglob('*.gz'))
            else:
                existing_files.extend(input_path.rglob(f'*{ext}'))
        
        # Filtrar solo archivos H5 comprimidos
        h5_files = []
        for file_path in existing_files:
            name = file_path.name.lower()
            if (name.endswith('.h5.gz') or 
                name.endswith('.h5.zip') or
                (name.endswith('.gz') and '.h5' in name)):
                h5_files.append(file_path)
        
        if h5_files:
            print(f"Encontrados {len(h5_files)} archivos H5 comprimidos para procesar")
            print("Procesando archivos existentes...")
            print("")
            
            # Procesar archivos existentes
            results = process_directory(
                input_dir,
                output_dir,
                radar_id,
                clutter_dir,
                clutter_cache,
                vmin, vmax, transparent_below, cmap, default_bounds,
                recursive=True  # Buscar recursivamente
            )
            
            print("")
            print("=" * 60)
            print(f"✓ Procesados {len(results)} archivos existentes")
            print("=" * 60)
            print("")
        else:
            print("No se encontraron archivos H5 comprimidos existentes")
            print("")
    
    # Ahora iniciar el monitoreo para nuevos archivos
    
    class H5Handler(FileSystemEventHandler):
        """Maneja eventos de archivos H5 comprimidos nuevos"""
        
        def __init__(self, config):
            self.config = config
            self.processing = set()
            self.debounce_time = config.get('debounce_time', 5.0)
            self.debounce_timers = {}
            
        def on_created(self, event: FileSystemEvent):
            """Se llama cuando se crea un nuevo archivo"""
            if event.is_directory:
                return
            
            file_path = Path(event.src_path)
            if not self._is_h5_compressed(file_path):
                return
            
            self._schedule_processing(file_path)
        
        def on_modified(self, event: FileSystemEvent):
            """Se llama cuando se modifica un archivo"""
            if event.is_directory:
                return
            
            file_path = Path(event.src_path)
            if not self._is_h5_compressed(file_path):
                return
            
            if file_path not in self.processing:
                self._schedule_processing(file_path)
        
        def _is_h5_compressed(self, file_path: Path):
            """Verifica si el archivo es un H5 comprimido"""
            if file_path.suffix.lower() not in ['.gz', '.zip']:
                return False
            
            return (file_path.name.endswith('.h5.gz') or 
                    file_path.name.endswith('.h5.zip') or
                    (file_path.suffix.lower() == '.gz' and '.h5' in file_path.stem))
        
        def _schedule_processing(self, file_path: Path):
            """Programa el procesamiento de un archivo con debounce"""
            normalized = file_path.resolve()
            
            # Cancelar timer anterior si existe
            if normalized in self.debounce_timers:
                self.debounce_timers[normalized].cancel()
            
            # Programar nuevo procesamiento
            timer = threading.Timer(self.debounce_time, self._process_file, args=(normalized,))
            timer.start()
            self.debounce_timers[normalized] = timer
        
        def _process_file(self, file_path: Path):
            """Procesa un archivo H5 comprimido"""
            normalized = file_path.resolve()
            
            if normalized in self.processing:
                print(f"[watch] {file_path.name} ya está siendo procesado, omitiendo...")
                return
            
            # Verificar que el archivo existe y no está siendo escrito
            if not normalized.exists():
                print(f"[watch] Archivo no encontrado: {file_path.name}")
                return
            
            # Verificar que el archivo no esté siendo escrito
            try:
                stats = normalized.stat()
                file_age = time.time() - stats.st_mtime
                if file_age < 2.0:
                    print(f"[watch] Archivo muy reciente, esperando estabilidad: {file_path.name}")
                    # Reprogramar para más tarde
                    timer = threading.Timer(3.0, self._process_file, args=(normalized,))
                    timer.start()
                    self.debounce_timers[normalized] = timer
                    return
            except Exception as e:
                print(f"[watch] Error verificando archivo {file_path.name}: {e}")
                return
            
            self.processing.add(normalized)
            
            try:
                print(f"[watch] Procesando nuevo archivo H5: {file_path.name}")
                
                # Llamar directamente a process_compressed_h5
                result = process_compressed_h5(
                    str(normalized),
                    self.config['output_dir'],
                    self.config['radar_id'],
                    None,  # clutter_maps
                    self.config.get('clutter_dir'),
                    self.config['vmin'],
                    self.config['vmax'],
                    self.config['transparent_below'],
                    self.config['cmap'],
                    self.config.get('default_bounds')
                )
                
                if result:
                    print(f"[watch] ✓ Procesado exitosamente: {file_path.name} -> {Path(result['png']).name}")
                else:
                    print(f"[watch] ✗ Error procesando {file_path.name}")
            
            except Exception as e:
                print(f"[watch] ✗ Error procesando {file_path.name}: {e}")
                import traceback
                traceback.print_exc()
            finally:
                self.processing.discard(normalized)
                if normalized in self.debounce_timers:
                    del self.debounce_timers[normalized]
    
    # Crear directorio de salida si no existe
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Configurar handler
    handler = H5Handler({
        'output_dir': output_dir,
        'radar_id': radar_id,
        'clutter_dir': clutter_dir,
        'vmin': vmin,
        'vmax': vmax,
        'transparent_below': transparent_below,
        'cmap': cmap,
        'default_bounds': default_bounds,
        'debounce_time': debounce_time,
    })
    
    # Iniciar observador
    observer = Observer()
    observer.schedule(handler, str(input_dir), recursive=True)
    observer.start()
    
    print("=" * 60)
    print("MODO MONITOREO ACTIVO")
    print("=" * 60)
    print(f"Directorio H5: {input_dir}")
    print(f"Directorio PNG: {output_dir}")
    print(f"Radar ID: {radar_id}")
    print(f"Tiempo de espera: {debounce_time} segundos")
    print("=" * 60)
    print("Esperando nuevos archivos H5 comprimidos...")
    print("Presiona Ctrl+C para detener")
    print("=" * 60)
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[watch] Deteniendo monitoreo...")
        observer.stop()
        observer.join()
        print("[watch] Monitoreo detenido")


if __name__ == "__main__":
    args = None
    
    # Si se ejecuta sin argumentos y no hay --watch, mostrar ayuda
    if len(sys.argv) == 1:
        print("Uso:")
        print("  Modo monitoreo (recomendado):")
        print("    python process_loxx_h5_compressed.py --watch --input-dir F:\\LOXX\\H5 --output-dir F:\\LOXX\\PNG_OUTPUT")
        print("")
        print("  Procesar un archivo:")
        print("    python process_loxx_h5_compressed.py --input-file archivo.h5.gz --output-dir F:\\LOXX\\PNG_OUTPUT")
        print("")
        print("  Procesar directorio completo:")
        print("    python process_loxx_h5_compressed.py --input-dir F:\\LOXX\\H5 --output-dir F:\\LOXX\\PNG_OUTPUT --recursive")
        print("")
        print("Usa --help para ver todas las opciones")
        sys.exit(0)
    
    # Parsear argumentos
    parser = argparse.ArgumentParser(
        description='Procesa archivos H5 comprimidos del radar LOXX (versión avanzada)'
    )
    parser.add_argument(
        '--input-dir',
        default='F:\\LOXX\\H5',
        help='Directorio con archivos comprimidos (default: F:\\LOXX\\H5)'
    )
    parser.add_argument(
        '--input-file',
        help='Archivo comprimido específico a procesar'
    )
    parser.add_argument(
        '--output-dir',
        required=True,
        help='Directorio de salida para PNGs'
    )
    parser.add_argument(
        '--radar-id',
        default='LOXX',
        help='ID del radar (default: LOXX)'
    )
    parser.add_argument(
        '--clutter-dir',
        help='Directorio con archivos de referencia para clutter (opcional)'
    )
    parser.add_argument(
        '--clutter-cache',
        help='Archivo de cache para mapas de clutter (opcional)'
    )
    parser.add_argument(
        '--vmin',
        type=float,
        default=10.0,
        help='Valor mínimo para colormap (default: 10.0)'
    )
    parser.add_argument(
        '--vmax',
        type=float,
        default=70.0,
        help='Valor máximo para colormap (default: 70.0)'
    )
    parser.add_argument(
        '--transparent-below',
        type=float,
        default=8.0,
        help='Valores menores serán transparentes (default: 8.0)'
    )
    parser.add_argument(
        '--cmap',
        default='meteorological',
        help='Colormap: "meteorological" (escala DBZH), "turbo", "viridis", etc. (default: meteorological)'
    )
    parser.add_argument(
        '--default-bounds',
        help='Bounds por defecto latMin,latMax,lonMin,lonMax'
    )
    parser.add_argument(
        '--recursive',
        action='store_true',
        help='Buscar archivos recursivamente en subdirectorios'
    )
    parser.add_argument(
        '--watch',
        action='store_true',
        help='Modo monitoreo: escucha nuevos archivos H5 y los procesa automáticamente'
    )
    parser.add_argument(
        '--debounce-time',
        type=float,
        default=5.0,
        help='Tiempo de espera antes de procesar archivo nuevo (segundos, default: 5.0)'
    )
    parser.add_argument(
        '--skip-existing',
        action='store_true',
        help='En modo --watch, saltar el procesamiento de archivos existentes (solo monitorear nuevos)'
    )
    
    args = parser.parse_args()
    
    # Parsear bounds si se proporcionan
    default_bounds = None
    if args.default_bounds:
        parts = [float(x) for x in args.default_bounds.split(',')]
        if len(parts) == 4:
            default_bounds = {
                'latMin': parts[0],
                'latMax': parts[1],
                'lonMin': parts[2],
                'lonMax': parts[3]
            }
    
    # Si está en modo watch, iniciar monitoreo
    if args.watch:
        start_watch_mode(
            args.input_dir,
            args.output_dir,
            args.radar_id,
            args.clutter_dir,
            args.clutter_cache,
            args.vmin,
            args.vmax,
            args.transparent_below,
            args.cmap,
            default_bounds,
            args.debounce_time,
            process_existing=not args.skip_existing  # Procesar existentes a menos que se use --skip-existing
        )
    elif args.input_file:
        # Procesar un archivo específico
        result = process_compressed_h5(
            args.input_file,
            args.output_dir,
            args.radar_id,
            None,  # clutter_maps
            args.clutter_dir,
            args.vmin, args.vmax, args.transparent_below, args.cmap, default_bounds
        )
        if result:
            print(f"✓ Procesado exitosamente: {result['png']}")
        else:
            print("✗ Error procesando archivo")
            sys.exit(1)
    else:
        # Procesar directorio completo
        results = process_directory(
            args.input_dir,
            args.output_dir,
            args.radar_id,
            args.clutter_dir,
            args.clutter_cache,
            args.vmin, args.vmax, args.transparent_below, args.cmap, default_bounds,
            args.recursive
        )
        print(f"\n✓ Procesados {len(results)} archivos exitosamente")