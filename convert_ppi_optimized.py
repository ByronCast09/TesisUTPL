#!/usr/bin/env python3
"""
Conversor OPTIMIZADO de archivos PPI (Rainview) a PNG.
- Solo procesa archivos nuevos
- Solo procesa fechas recientes
- Límite de archivos por ejecución
- Caché de archivos procesados
"""

import argparse
import json
import re
import zlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Optional, Set
import hashlib

import numpy as np
from PIL import Image
import xml.etree.ElementTree as ET

try:
    import requests
except ImportError:
    requests = None

try:
    import psycopg  # type: ignore
except ImportError:
    psycopg = None

WHITESPACE = set(b" \t\r\n")
DEFAULT_PRODUCT_TYPE = "ppi_png"

# ⚡ CONSTANTES DE OPTIMIZACIÓN (ajustadas para no perder datos)
MAX_DATES_TO_PROCESS = 7     # Procesar última semana completa
MAX_FILES_PER_RUN = None     # Límite alto (antes era 100 - causaba pérdida de datos)
CACHE_FILE_NAME = ".processed_cache.json"  # Archivo de caché


def qt_decompress(blob_bytes: bytes) -> bytes:
    """Descomprime BLOB Qt/zlib"""
    if not blob_bytes:
        raise ValueError("BLOB vacío")
    offset = 0
    while offset < len(blob_bytes) and blob_bytes[offset] in WHITESPACE:
        offset += 1
    blob_bytes = blob_bytes[offset:]
    if len(blob_bytes) < 4:
        raise ValueError("BLOB muy pequeño")
    payload = blob_bytes[4:]
    for wbits in (15, -15):
        try:
            obj = zlib.decompressobj(wbits)
            data = obj.decompress(payload)
            data += obj.flush()
            return data
        except zlib.error:
            continue
    raise ValueError("No se pudo descomprimir el BLOB")


class OptimizedPPIConverter:
    """Conversor PPI optimizado con caché y límites"""
    
    def __init__(
        self,
        data_path,
        output_path,
        radar_id="LGUAXX",
        ingest_url: Optional[str] = None,
        ingest_token: Optional[str] = None,
        ingest_timeout: int = 30,
        write_metadata_files: bool = True,
        db_url: Optional[str] = None,
        db_host: Optional[str] = None,
        db_port: Optional[int] = None,
        db_user: Optional[str] = None,
        db_password: Optional[str] = None,
        db_name: Optional[str] = None,
        db_sslmode: Optional[str] = None,
        public_url_base: Optional[str] = None,
        max_dates: int = MAX_DATES_TO_PROCESS,
        max_files: int = MAX_FILES_PER_RUN,
    ):
        self.data_path = Path(data_path)
        self.output_path = Path(output_path)
        self.radar_id = radar_id
        self.output_path.mkdir(parents=True, exist_ok=True)
        self.ingest_url = ingest_url
        self.ingest_token = ingest_token
        self.ingest_timeout = ingest_timeout
        self.write_metadata_files = write_metadata_files
        self.public_url_base = public_url_base.rstrip("/") if public_url_base else None
        
        # ⚡ OPTIMIZACIONES
        self.max_dates = max_dates
        self.max_files = max_files
        self.cache_file = self.output_path / CACHE_FILE_NAME
        self.processed_cache: Set[str] = self._load_cache()
        self.files_processed_this_run = 0

        self.db_config = {
            "url": db_url,
            "host": db_host,
            "port": db_port or 5432,
            "user": db_user,
            "password": db_password,
            "dbname": db_name,
            "sslmode": db_sslmode,
        }
        self.db_conn = None
        self.db_enabled = bool(
            self.db_config["url"]
            or (
                self.db_config["host"]
                and self.db_config["user"]
                and self.db_config["dbname"]
            )
        )

        if self.ingest_url and requests is None:
            raise RuntimeError(
                "La librería 'requests' es necesaria para enviar datos a la API de ingestión."
            )
        if self.db_enabled and psycopg is None:
            raise RuntimeError(
                "La librería 'psycopg' es necesaria para registrar datos en Postgres."
            )

    # ⚡ NUEVOS MÉTODOS DE CACHÉ
    def _load_cache(self) -> Set[str]:
        """Carga caché de archivos ya procesados"""
        if not self.cache_file.exists():
            return set()
        try:
            with open(self.cache_file, 'r') as f:
                data = json.load(f)
                return set(data.get('processed', []))
        except Exception as e:
            print(f"⚠ Error cargando caché: {e}")
            return set()
    
    def _save_cache(self):
        """Guarda caché de archivos procesados"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump({
                    'processed': list(self.processed_cache),
                    'last_updated': datetime.utcnow().isoformat()
                }, f)
        except Exception as e:
            print(f"⚠ Error guardando caché: {e}")
    
    def _get_file_hash(self, ppi_path: Path) -> str:
        """Genera hash único para un archivo PPI"""
        return f"{ppi_path.name}_{ppi_path.stat().st_size}_{int(ppi_path.stat().st_mtime)}"
    
    def _is_already_processed(self, ppi_path: Path, png_path: Path) -> bool:
        """Verifica si un archivo ya fue procesado"""
        # 1. Verificar si el PNG ya existe y es más reciente que el PPI
        if png_path.exists():
            png_mtime = png_path.stat().st_mtime
            ppi_mtime = ppi_path.stat().st_mtime
            if png_mtime >= ppi_mtime:
                return True
        
        # 2. Verificar caché en memoria
        file_hash = self._get_file_hash(ppi_path)
        return file_hash in self.processed_cache

    def _mark_as_processed(self, ppi_path: Path):
        """Marca un archivo como procesado en la caché"""
        file_hash = self._get_file_hash(ppi_path)
        self.processed_cache.add(file_hash)

    # ------------------------------------------------------------------
    def get_db_connection(self):
        """Obtiene o reutiliza conexión a PostgreSQL"""
        if not self.db_enabled:
            return None
        if self.db_conn is not None:
            try:
                if not self.db_conn.closed:
                    return self.db_conn
            except AttributeError:
                pass
            self.db_conn = None

        try:
            if self.db_config["url"]:
                conn = psycopg.connect(self.db_config["url"])
            else:
                params = {
                    "host": self.db_config["host"],
                    "port": self.db_config["port"],
                    "user": self.db_config["user"],
                    "password": self.db_config["password"],
                    "dbname": self.db_config["dbname"],
                }
                if self.db_config["sslmode"]:
                    params["sslmode"] = self.db_config["sslmode"]
                conn = psycopg.connect(**params)
            conn.autocommit = True
            self.db_conn = conn
            print("↪ Conexión a Postgres establecida.")
            return self.db_conn
        except Exception as exc:
            print(f"⚠ No se pudo conectar a Postgres ({exc}). Se deshabilita el registro en DB.")
            self.db_enabled = False
            self.db_conn = None
            return None

    def close(self):
        """Cierra conexión y guarda caché"""
        if self.db_conn is not None:
            try:
                self.db_conn.close()
            except Exception:
                pass
            self.db_conn = None
        self._save_cache()

    def build_public_url(self, png_path: Path) -> Optional[str]:
        """Construye URL pública para un PNG"""
        if not self.public_url_base:
            return None
        try:
            relative = png_path.relative_to(self.output_path)
            relative_posix = relative.as_posix()
        except ValueError:
            relative_posix = png_path.name
        return f"{self.public_url_base}/{relative_posix}"
        
    def parse_blob_sections(self, raw: bytes, start: int):
        """Parsea secciones BLOB del archivo PPI"""
        blobs = {}
        pos = start
        while True:
            begin = raw.find(b"<BLOB", pos)
            if begin == -1:
                break
            end = raw.find(b">", begin)
            header = raw[begin:end+1].decode("ascii", errors="ignore")
            blob_id = int(re.search(r'blobid="(\d+)"', header).group(1))
            size = int(re.search(r'size="(\d+)"', header).group(1))
            compression = re.search(r'compression="([^"]+)"', header).group(1)
            data_start = end + 1
            data = raw[data_start:data_start+size]
            blobs[blob_id] = (compression, data)
            pos = raw.find(b"</BLOB>", data_start+size)
            if pos == -1:
                break
            pos += len(b"</BLOB>")
        return blobs

    def load_ppi(self, path: Path):
        """Carga y parsea archivo PPI"""
        raw = path.read_bytes()
        xml_end = raw.find(b"</product>")
        if xml_end == -1:
            raise ValueError("Archivo sin bloque </product>")
        xml_end += len(b"</product>")
        xml_text = raw[:xml_end].decode("utf-8", errors="ignore")
        root = ET.fromstring(xml_text)

        radarpicture = root.find(".//radarpicture")
        if radarpicture is None:
            raise ValueError(f"{path.name}: nodo <radarpicture> no encontrado")
        datamap = radarpicture.find("datamap")
        if datamap is None:
            raise ValueError(f"{path.name}: nodo <datamap> no encontrado")

        rows = int(datamap.attrib["rows"])
        cols = int(datamap.attrib["columns"])
        depth = int(datamap.attrib.get("depth", "8"))

        min_attr = radarpicture.attrib.get("min")
        max_attr = radarpicture.attrib.get("max")
        try:
            min_dbz = float(min_attr) if min_attr is not None else None
        except (TypeError, ValueError):
            min_dbz = None
        try:
            max_dbz = float(max_attr) if max_attr is not None else None
        except (TypeError, ValueError):
            max_dbz = None

        if min_dbz is None:
            try:
                min_dbz = float(datamap.attrib.get("min"))
            except (TypeError, ValueError, AttributeError):
                min_dbz = 0.0
        if max_dbz is None:
            try:
                max_dbz = float(datamap.attrib.get("max"))
            except (TypeError, ValueError, AttributeError):
                max_dbz = 75.0
        if max_dbz is None or np.isnan(max_dbz):
            max_dbz = 75.0
        if min_dbz is None or np.isnan(min_dbz):
            min_dbz = 0.0
        if max_dbz <= min_dbz:
            max_dbz = min_dbz + max(1.0, (2 ** depth - 1) / 10.0)

        blobs = self.parse_blob_sections(raw, xml_end)
        if 0 not in blobs:
            raise ValueError(f"{path.name}: no hay blobid=0")
        comp0, data_blob = blobs[0]
        raw_grid = qt_decompress(data_blob) if comp0 == "qt" else data_blob
        dtype = np.uint8 if depth <= 8 else np.uint16
        grid = np.frombuffer(raw_grid, dtype=dtype)
        expected_size = rows * cols
        if grid.size < expected_size:
            raise ValueError(f"{path.name}: datos insuficientes ({grid.size} < {expected_size})")
        if grid.size > expected_size:
            grid = grid[:expected_size]
        grid = grid.reshape(rows, cols)

        mask = None
        mask_comp = None
        if 1 in blobs:
            mask_comp, mask_blob = blobs[1]
            raw_mask = qt_decompress(mask_blob) if mask_comp == "qt" else mask_blob
            mask_bits = np.unpackbits(np.frombuffer(raw_mask, dtype=np.uint8))
            if mask_bits.size < expected_size:
                padded = np.zeros(expected_size, dtype=np.uint8)
                padded[:mask_bits.size] = mask_bits
                mask_bits = padded
            mask = mask_bits[:expected_size].reshape(rows, cols)

        span = max_dbz - min_dbz
        if span <= 0:
            span = 1.0
        data = min_dbz + span * (grid.astype(np.float32) / max(1, (2 ** depth - 1)))
        if mask is not None:
            data[mask != 0] = np.nan

        data_node = root.find(".//data")
        if data_node is None:
            raise ValueError(f"{path.name}: nodo <data> no encontrado")
        date_attr = data_node.attrib.get("date")
        time_attr = data_node.attrib.get("time")
        if not date_attr or not time_attr:
            raise ValueError(f"{path.name}: atributos date/time faltantes en <data>")
        timestamp = f"{date_attr}T{time_attr}"

        proj = radarpicture.find("projection")
        if proj is None:
            raise ValueError(f"{path.name}: nodo <projection> no encontrado")
        try:
            bounds = [
                [float(proj.attrib["lat_lr"]), float(proj.attrib["lon_lr"])],
                [float(proj.attrib["lat_ul"]), float(proj.attrib["lon_ul"])],
            ]
        except KeyError as exc:
            raise ValueError(f"{path.name}: faltan atributos en <projection>: {exc}") from exc

        product_type = root.attrib.get("datatype") or radarpicture.attrib.get("type") or DEFAULT_PRODUCT_TYPE
        radar_name = root.attrib.get("owner") or root.attrib.get("name") or self.radar_id

        meta = {
            "rows": rows,
            "cols": cols,
            "depth": depth,
            "min_dbz": float(min_dbz),
            "max_dbz": float(max_dbz),
            "timestamp": timestamp,
            "bounds": bounds,
            "product_type": product_type,
            "product_name": radarpicture.attrib.get("name") or root.attrib.get("name"),
            "version": root.attrib.get("version"),
            "owner": root.attrib.get("owner"),
            "radar_name": radar_name,
            "projection": {
                "lat_lr": float(proj.attrib.get("lat_lr", 0)),
                "lon_lr": float(proj.attrib.get("lon_lr", 0)),
                "lat_ul": float(proj.attrib.get("lat_ul", 0)),
                "lon_ul": float(proj.attrib.get("lon_ul", 0)),
                "lat_ll": float(proj.attrib.get("lat_ll", proj.attrib.get("lat_lr", 0))),
                "lon_ll": float(proj.attrib.get("lon_ll", proj.attrib.get("lon_lr", 0))),
                "lat_ur": float(proj.attrib.get("lat_ur", proj.attrib.get("lat_ul", 0))),
                "lon_ur": float(proj.attrib.get("lon_ur", proj.attrib.get("lon_ul", 0))),
            },
            "source": {
                "ppi_path": str(path),
                "blob0_compression": comp0,
                "blob0_size": len(data_blob),
                "blob1_compression": mask_comp,
                "blob1_size": len(blobs[1][1]) if 1 in blobs else None,
                "rows": rows,
                "cols": cols,
                "depth": depth,
                "min_raw": min_attr,
                "max_raw": max_attr,
                "datatype": root.attrib.get("datatype"),
                "product_type": product_type,
                "version": root.attrib.get("version"),
            },
        }

        return data, meta

    def data_to_png(self, data, vmin, vmax):
        """Convierte datos reflectividad a PNG RGBA con colores meteorológicos"""
        rgba = np.zeros((*data.shape, 4), dtype=np.uint8)
        mask_valid = ~np.isnan(data)
        values = np.array(data, copy=True)

        def scale(v, vmin_local, vmax_local):
            span = vmax_local - vmin_local
            if span <= 0:
                return np.zeros_like(v, dtype=np.float32)
            return np.clip((v - vmin_local) / span, 0.0, 1.0)

        # Escala de colores meteorológicos ajustada para valores negativos
        # Rango 1: -32 a 8 dBZ (celeste muy claro - incluye ruido y precipitación muy ligera)
        mask1 = (values >= -32) & (values < 8) & mask_valid
        if mask1.any():
            t = scale(values[mask1], -32, 8)
            rgba[mask1, 0] = 180
            rgba[mask1, 1] = 230
            rgba[mask1, 2] = 255
            rgba[mask1, 3] = (t * 255).astype(np.uint8)

        mask2 = (values >= 8) & (values < 16) & mask_valid
        if mask2.any():
            t = scale(values[mask2], 8, 16)
            rgba[mask2, 0] = np.clip(100 + (1 - t) * 80, 0, 255).astype(np.uint8)
            rgba[mask2, 1] = np.clip(180 + (1 - t) * 50, 0, 255).astype(np.uint8)
            rgba[mask2, 2] = 255
            rgba[mask2, 3] = 255

        mask3 = (values >= 16) & (values < 24) & mask_valid
        if mask3.any():
            t = scale(values[mask3], 16, 24)
            rgba[mask3, 0] = np.clip(30 + t * 70, 0, 255).astype(np.uint8)
            rgba[mask3, 1] = np.clip(100 + t * 80, 0, 255).astype(np.uint8)
            rgba[mask3, 2] = 255
            rgba[mask3, 3] = 255

        mask4 = (values >= 24) & (values < 32) & mask_valid
        if mask4.any():
            t = scale(values[mask4], 24, 32)
            rgba[mask4, 0] = np.clip(t * 50, 0, 255).astype(np.uint8)
            rgba[mask4, 1] = np.clip(180 + t * 75, 0, 255).astype(np.uint8)
            rgba[mask4, 2] = np.clip(255 - t * 255, 0, 255).astype(np.uint8)
            rgba[mask4, 3] = 255

        mask5 = (values >= 32) & (values < 40) & mask_valid
        if mask5.any():
            t = scale(values[mask5], 32, 40)
            rgba[mask5, 0] = np.clip(t * 100, 0, 255).astype(np.uint8)
            rgba[mask5, 1] = 255
            rgba[mask5, 2] = 0
            rgba[mask5, 3] = 255

        mask6 = (values >= 40) & (values < 48) & mask_valid
        if mask6.any():
            t = scale(values[mask6], 40, 48)
            rgba[mask6, 0] = np.clip(100 + t * 155, 0, 255).astype(np.uint8)
            rgba[mask6, 1] = 255
            rgba[mask6, 2] = 0
            rgba[mask6, 3] = 255

        mask7 = (values >= 48) & (values < 56) & mask_valid
        if mask7.any():
            t = scale(values[mask7], 48, 56)
            rgba[mask7, 0] = 255
            rgba[mask7, 1] = np.clip(255 - t * 90, 0, 255).astype(np.uint8)
            rgba[mask7, 2] = 0
            rgba[mask7, 3] = 255

        mask8 = (values >= 56) & (values < 64) & mask_valid
        if mask8.any():
            t = scale(values[mask8], 56, 64)
            rgba[mask8, 0] = 255
            rgba[mask8, 1] = np.clip(165 - t * 165, 0, 255).astype(np.uint8)
            rgba[mask8, 2] = 0
            rgba[mask8, 3] = 255

        mask9 = (values >= 64) & (values <= 72) & mask_valid
        if mask9.any():
            t = scale(values[mask9], 64, 72)
            rgba[mask9, 0] = 255
            rgba[mask9, 1] = 0
            rgba[mask9, 2] = np.clip(t * 255, 0, 255).astype(np.uint8)
            rgba[mask9, 3] = 255

        mask10 = (values > 72) & mask_valid
        if mask10.any():
            rgba[mask10, 0] = 255
            rgba[mask10, 1] = 0
            rgba[mask10, 2] = 255
            rgba[mask10, 3] = 255

        # Hacer transparente el magenta de fondo
        mask_magenta = (rgba[:,:,0] == 255) & (rgba[:,:,1] == 0) & (rgba[:,:,2] == 255)
        mask_magenta_background = mask_magenta & ~mask_valid
        rgba[mask_magenta_background, 3] = 0

        return Image.fromarray(rgba, mode="RGBA")

    def process_date_folder(self, date_dir: Path):
        """Procesa carpeta de fecha con optimizaciones"""
        out_dir = self.output_path / date_dir.name
        out_dir.mkdir(parents=True, exist_ok=True)
        converted = []
        file_names = []
        
        # ⚡ Ordenar y limitar archivos
        ppi_files = sorted(date_dir.glob("*.ppi"), reverse=True)  # Más recientes primero
        
        processed_in_folder = 0
        for ppi_path in ppi_files:
            # ⚡ Verificar límite global (solo si está definido)
            if self.max_files and self.files_processed_this_run >= self.max_files:
                print(f"⏸ Límite de {self.max_files} archivos alcanzado, deteniendo...")
                break
            
            png_name = f"{self.radar_id}_{ppi_path.stem}.png"
            png_path = out_dir / png_name
            
            # ⚡ SKIP si ya está procesado
            if self._is_already_processed(ppi_path, png_path):
                continue
            
            try:
                data, meta = self.load_ppi(ppi_path)
                
                # 🔍 DEBUG: Imprimir estadísticas de datos
                valid_mask = ~np.isnan(data)
                valid_count = np.sum(valid_mask)
                if valid_count > 0:
                    valid_data = data[valid_mask]
                    print(f"   📊 Stats: min={np.min(valid_data):.1f} max={np.max(valid_data):.1f} dBZ, {valid_count}/{data.size} píxeles válidos ({100*valid_count/data.size:.1f}%)")
                else:
                    print(f"   ⚠️  No hay datos válidos en {ppi_path.name}")
                
                img = self.data_to_png(data, meta["min_dbz"], meta["max_dbz"])
                img.save(png_path, "PNG")

                generated_at = datetime.utcnow().isoformat()
                product_type = meta.get("product_type") or DEFAULT_PRODUCT_TYPE
                public_url = self.build_public_url(png_path)
                try:
                    file_size = png_path.stat().st_size
                except OSError:
                    file_size = None

                metadata_payload: Dict[str, Any] = {
                    "radarId": self.radar_id,
                    "radarName": meta.get("radar_name"),
                    "productType": product_type,
                    "productName": meta.get("product_name"),
                    "timestamp": meta["timestamp"],
                    "sourceTimestamp": meta["timestamp"],
                    "bounds": meta["bounds"],
                    "rows": meta["rows"],
                    "cols": meta["cols"],
                    "depth": meta["depth"],
                    "minDbz": meta["min_dbz"],
                    "maxDbz": meta["max_dbz"],
                    "projection": meta.get("projection"),
                    "generatedAt": generated_at,
                    "file": png_name,
                    "storagePath": str(png_path),
                    "publicUrl": public_url,
                    "fileSize": file_size,
                    "status": "ready",
                }

                source_payload: Dict[str, Any] = {
                    **meta.get("source", {}),
                    "date_directory": date_dir.name,
                    "radar_id": self.radar_id,
                }

                entry = {
                    "file": png_name,
                    "timestamp": meta["timestamp"],
                    "bounds": meta["bounds"],
                    "min": meta["min_dbz"],
                    "max": meta["max_dbz"],
                    "rows": meta["rows"],
                    "cols": meta["cols"],
                    "depth": meta["depth"],
                    "productType": product_type,
                    "radarName": meta.get("radar_name"),
                    "projection": meta.get("projection"),
                    "publicUrl": public_url,
                }

                converted.append(entry)
                file_names.append(png_name)

                if self.write_metadata_files:
                    metadata_json = {
                        **entry,
                        "radarId": self.radar_id,
                        "generatedAt": generated_at,
                        "metadata": metadata_payload,
                        "source": source_payload,
                    }
                    (out_dir / f"{png_path.stem}.json").write_text(
                        json.dumps(metadata_json, indent=2, ensure_ascii=False),
                        encoding="utf-8",
                    )

                self.send_to_ingest(png_path, metadata_payload, source_payload)
                self.record_in_db(png_path, metadata_payload, source_payload)
                
                # ⚡ Marcar como procesado
                self._mark_as_processed(ppi_path)
                self.files_processed_this_run += 1
                processed_in_folder += 1
                
                print(f"✓ {ppi_path.name}")
            except Exception as exc:
                print(f"✗ {ppi_path.name}: {exc}")
        
        if processed_in_folder > 0:
            print(f"  → {processed_in_folder} archivos nuevos en {date_dir.name}")
        
        return converted, file_names

    def send_to_ingest(self, png_path: Path, metadata: Dict[str, Any], source: Dict[str, Any]):
        """Envía PNG a API de ingestión (opcional)"""
        if not self.ingest_url:
            return
        if requests is None:
            return

        timestamp = metadata.get("sourceTimestamp") or metadata.get("timestamp")
        data = {
            "radarId": metadata.get("radarId") or self.radar_id,
            "productType": metadata.get("productType") or DEFAULT_PRODUCT_TYPE,
            "timestamp": timestamp,
            "metadata": json.dumps(metadata, ensure_ascii=False),
            "rawSource": json.dumps(source or {}, ensure_ascii=False),
            "filename": png_path.name,
            "fileSize": str(png_path.stat().st_size),
        }

        headers = {}
        if self.ingest_token:
            headers["Authorization"] = f"Bearer {self.ingest_token}"

        try:
            with png_path.open("rb") as fh:
                files = {"file": (png_path.name, fh, "image/png")}
                response = requests.post(
                    self.ingest_url,
                    data=data,
                    files=files,
                    headers=headers,
                    timeout=self.ingest_timeout,
                )
            if response.status_code >= 400:
                print(f"⚠ Falló ingest ({response.status_code}) para {png_path.name}")
        except Exception as exc:
            print(f"⚠ Error enviando {png_path.name} a ingestión: {exc}")

    def record_in_db(self, png_path: Path, metadata: Dict[str, Any], source: Dict[str, Any]):
        """Registra PNG en PostgreSQL"""
        if not self.db_enabled:
            return

        conn = self.get_db_connection()
        if conn is None:
            return

        radar_id = metadata.get("radarId") or self.radar_id
        product_type = metadata.get("productType") or DEFAULT_PRODUCT_TYPE
        storage_path = str(png_path)
        public_url = metadata.get("publicUrl") or self.build_public_url(png_path)
        source_timestamp_str = metadata.get("sourceTimestamp") or metadata.get("timestamp")
        source_timestamp = None
        if source_timestamp_str:
            try:
                # CORRECCIÓN: Parsear como UTC, no como hora local del sistema
                # El timestamp del archivo PPI está en formato ISO (2026-01-04T00:10:00)
                # y representa la hora LOCAL del radar (Ecuador UTC-5)
                # Debemos guardarlo como UTC en la base de datos
                from datetime import timezone
                
                # Parsear el timestamp
                dt = datetime.fromisoformat(source_timestamp_str)
                
                # Si no tiene timezone, asumirlo como hora local Ecuador (UTC-5)
                if dt.tzinfo is None:
                    # Crear timezone para Ecuador (UTC-5)
                    ecuador_tz = timezone(timedelta(hours=-5))
                    dt = dt.replace(tzinfo=ecuador_tz)
                
                # Convertir a UTC para guardar en la base de datos
                source_timestamp = dt.astimezone(timezone.utc)
            except ValueError as e:
                print(f"⚠ Error parseando timestamp '{source_timestamp_str}': {e}")
                source_timestamp = None

        try:
            file_size = png_path.stat().st_size
        except OSError:
            file_size = metadata.get("fileSize")

        checksum = metadata.get("checksum")
        status = metadata.get("status") or "ready"

        metadata_json = json.dumps(metadata, ensure_ascii=False)
        source_json = json.dumps(source or {}, ensure_ascii=False)

        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO radar_products (
                        radar_id,
                        product_type,
                        filename,
                        storage_path,
                        public_url,
                        source_timestamp,
                        processed_at,
                        file_size,
                        checksum,
                        metadata,
                        raw_source,
                        status
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s::jsonb, %s::jsonb, %s)
                    ON CONFLICT (radar_id, product_type, source_timestamp, filename)
                    DO UPDATE SET
                        storage_path = EXCLUDED.storage_path,
                        public_url = COALESCE(EXCLUDED.public_url, radar_products.public_url),
                        file_size = COALESCE(EXCLUDED.file_size, radar_products.file_size),
                        checksum = COALESCE(EXCLUDED.checksum, radar_products.checksum),
                        metadata = COALESCE(EXCLUDED.metadata, radar_products.metadata),
                        raw_source = COALESCE(EXCLUDED.raw_source, radar_products.raw_source),
                        status = COALESCE(EXCLUDED.status, radar_products.status),
                        processed_at = NOW();
                    """,
                    (
                        radar_id,
                        product_type,
                        png_path.name,
                        storage_path,
                        public_url,
                        source_timestamp,
                        file_size,
                        checksum,
                        metadata_json,
                        source_json,
                        status,
                    ),
                )
        except Exception as exc:
            print(f"⚠ Error registrando {png_path.name} en Postgres: {exc}")

    def run_conversion(self):
        """Ejecuta conversión OPTIMIZADA"""
        try:
            max_files_str = str(self.max_files) if self.max_files else "sin límite"
            print(f"⚡ Iniciando conversión optimizada (max {self.max_dates} fechas, {max_files_str} archivos)")
            
            # ⚡ Solo procesar las fechas más recientes
            all_date_dirs = sorted(
                filter(Path.is_dir, self.data_path.iterdir()),
                reverse=True  # Más recientes primero
            )
            date_dirs_to_process = all_date_dirs[:self.max_dates]
            
            if len(all_date_dirs) > self.max_dates:
                print(f"  → Procesando {len(date_dirs_to_process)} fechas más recientes de {len(all_date_dirs)} total")
            
            index_dates = {}
            detailed = {}
            total_new_files = 0
            
            for date_dir in date_dirs_to_process:
                if self.max_files and self.files_processed_this_run >= self.max_files:
                    print(f"⏸ Límite de archivos alcanzado, deteniendo...")
                    break
                    
                entries, names = self.process_date_folder(date_dir)
                if entries:
                    index_dates[date_dir.name] = names
                    detailed.setdefault(date_dir.name, entries)
                    total_new_files += len(entries)

            # Actualizar índice
            if index_dates or self.files_processed_this_run > 0:
                # Cargar índice existente para mantener fechas antiguas
                existing_index = {}
                index_file = self.output_path / "index.json"
                if index_file.exists():
                    try:
                        existing_index = json.loads(index_file.read_text())
                        if 'dates' in existing_index:
                            # Combinar con nuevas fechas
                            for date, files in index_dates.items():
                                # Cargar archivos existentes de esta fecha
                                if date in existing_index['dates']:
                                    existing_files = set(existing_index['dates'][date])
                                    new_files = set(files)
                                    # Combinar
                                    combined = sorted(existing_files | new_files)
                                    existing_index['dates'][date] = combined
                                else:
                                    existing_index['dates'][date] = files
                    except Exception as e:
                        print(f"⚠ Error cargando índice existente: {e}")
                else:
                    existing_index = {'dates': index_dates}
                
                # Actualizar timestamp
                existing_index.update({
                    "radar_id": self.radar_id,
                    "last_updated": datetime.utcnow().isoformat(),
                })
                
                index_file.write_text(
                    json.dumps(existing_index, indent=2, ensure_ascii=False),
                    encoding="utf-8",
                )
                
                print(f"\n✅ Conversión completada:")
                print(f"   → {total_new_files} archivos nuevos procesados")
                print(f"   → {len(self.processed_cache)} archivos en caché")
                print(f"   → Índice actualizado en {index_file}")
            else:
                print("\n✓ No hay archivos nuevos para procesar")
                
        finally:
            self.close()


def main():
    parser = argparse.ArgumentParser(description="Conversor OPTIMIZADO de PPI a PNG")
    parser.add_argument("--data-path", required=True, help="Raíz con carpetas YYYY-MM-DD")
    parser.add_argument("--output-path", required=True, help="Directorio de salida")
    parser.add_argument("--radar-id", default="LGUAXX")
    parser.add_argument("--max-dates", type=int, default=MAX_DATES_TO_PROCESS, help="Máximo de fechas a procesar (más recientes)")
    parser.add_argument("--max-files", type=int, default=MAX_FILES_PER_RUN, help="Máximo de archivos a procesar por ejecución")
    parser.add_argument("--monitor", action="store_true", help="Modo monitor: ejecutar continuamente cada 5 minutos")
    parser.add_argument("--monitor-interval", type=int, default=300, help="Intervalo en segundos para modo monitor (default: 300)")
    parser.add_argument("--ingest-url", help="Endpoint POST para registrar PNG en el backend")
    parser.add_argument("--ingest-token", help="Token Bearer para la API de ingestión (opcional)")
    parser.add_argument("--ingest-timeout", type=int, default=30, help="Timeout en segundos para la API de ingestión")
    parser.add_argument("--no-metadata-files", action="store_true", help="No generar archivos JSON junto a los PNG")
    parser.add_argument("--db-url", help="Cadena de conexión completa a Postgres")
    parser.add_argument("--db-host", help="Host de Postgres (si no se usa db-url)")
    parser.add_argument("--db-port", type=int, help="Puerto de Postgres (5432 por defecto)")
    parser.add_argument("--db-user", help="Usuario de Postgres (si no se usa db-url)")
    parser.add_argument("--db-password", help="Contraseña de Postgres")
    parser.add_argument("--db-name", help="Base de datos de Postgres")
    parser.add_argument("--db-sslmode", help="Modo SSL para Postgres (disable, require, etc.)")
    parser.add_argument("--public-url-base", help="URL base pública para construir enlaces a los PNG")
    args = parser.parse_args()
    
    def run_once():
        """Ejecuta una conversión"""
        converter = OptimizedPPIConverter(
            args.data_path,
            args.output_path,
            args.radar_id,
            ingest_url=args.ingest_url,
            ingest_token=args.ingest_token,
            ingest_timeout=args.ingest_timeout,
            write_metadata_files=not args.no_metadata_files,
            db_url=args.db_url,
            db_host=args.db_host,
            db_port=args.db_port,
            db_user=args.db_user,
            db_password=args.db_password,
            db_name=args.db_name,
            db_sslmode=args.db_sslmode,
            public_url_base=args.public_url_base,
            max_dates=args.max_dates,
            max_files=args.max_files,
        )
        converter.run_conversion()
    
    # Modo monitor: loop infinito
    if args.monitor:
        import time
        
        print("🚀 MODO MONITOR ACTIVADO")
        print(f"📁 Data path: {args.data_path}")
        print(f"💾 Output path: {args.output_path}")
        print(f"🔄 Intervalo: {args.monitor_interval}s ({args.monitor_interval//60} minutos)")
        print(f"🎯 Radar ID: {args.radar_id}")
        print(f"📊 Max fechas: {args.max_dates}, Max archivos: {args.max_files}")
        print(f"\nPresiona Ctrl+C para detener\n")
        
        cycle = 1
        
        try:
            while True:
                print(f"\n{'#'*60}")
                print(f"# CICLO {cycle} - {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
                print(f"{'#'*60}")
                
                try:
                    run_once()
                except Exception as e:
                    print(f"❌ Error en ciclo {cycle}: {e}")
                
                # Calcular próxima ejecución
                next_run = datetime.utcnow().timestamp() + args.monitor_interval
                next_run_str = datetime.fromtimestamp(next_run).strftime("%H:%M:%S")
                
                print(f"\n⏰ Próxima ejecución en {args.monitor_interval}s (a las {next_run_str})")
                print(f"   Esperando...")
                
                cycle += 1
                time.sleep(args.monitor_interval)
                
        except KeyboardInterrupt:
            print(f"\n\n🛑 Monitor detenido por el usuario")
            print(f"Total de ciclos ejecutados: {cycle - 1}")
    
    # Modo normal: una sola ejecución
    else:
        run_once()


if __name__ == "__main__":
    main()
