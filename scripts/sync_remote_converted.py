"""
Descarga PNG/JSON procesados desde el servidor remoto y los replica en la PC local.
"""

import argparse
import json
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin

import requests
from tqdm import tqdm


class HrefParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links: List[str] = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.links.append(href)


def fetch_directory_links(url: str) -> List[str]:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    parser = HrefParser()
    parser.feed(response.text)
    return parser.links


def looks_like_date_dir(name: str) -> bool:
    if not name or len(name) < 10:
        return False
    if name.endswith("/"):
        name = name[:-1]
    parts = name.split("-")
    if len(parts) != 3:
        return False
    return all(part.isdigit() for part in parts)


def scan_directory_listing(base_url: str) -> Dict[str, List[Dict[str, Any]]]:
    try:
        links = fetch_directory_links(base_url)
    except Exception as exc:
        print(f"No se pudo listar {base_url}: {exc}")
        return {}

    index: Dict[str, List[Dict[str, Any]]] = {}
    for link in links:
        if not link or not looks_like_date_dir(link):
            continue
        date_key = link.rstrip("/")
        date_url = urljoin(base_url, f"{date_key}/")
        try:
            file_links = fetch_directory_links(date_url)
        except Exception as exc:
            print(f"No se pudo listar {date_url}: {exc}")
            continue

        entries: Dict[str, Dict[str, Any]] = {}
        json_map: Dict[str, str] = {}

        for href in file_links:
            if not href:
                continue
            name = href.rstrip("/")
            if not name:
                continue
            lower_name = name.lower()
            if lower_name.endswith(".png"):
                entries[name] = {"file": name}
            elif lower_name.endswith(".json"):
                stem = Path(name).stem
                json_map[stem] = name

        for png_name, entry in entries.items():
            stem = Path(png_name).stem
            if stem in json_map:
                entry["json"] = json_map[stem]

        if entries:
            index[date_key] = list(entries.values())

    return index


def normalize_entries(items: Any) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    if isinstance(items, dict):
        for key, value in items.items():
            if isinstance(value, dict):
                entry = value.copy()
                entry.setdefault("file", entry.get("filename") or key)
                normalized.append(entry)
            elif isinstance(value, str):
                normalized.append({"file": value})
            else:
                normalized.append({"file": key})
    elif isinstance(items, (list, tuple)):
        for value in items:
            if isinstance(value, dict):
                entry = value.copy()
                if "file" not in entry:
                    entry["file"] = entry.get("filename") or entry.get("png") or entry.get("pngFile")
                normalized.append(entry)
            elif isinstance(value, str):
                normalized.append({"file": value})
    return [entry for entry in normalized if entry.get("file")]


def normalize_index(raw_index: object) -> Dict[str, List[Dict[str, Any]]]:
    """
    Normaliza la estructura del índice remoto retornando un diccionario
    {fecha: [entradas]}.
    """
    if isinstance(raw_index, dict):
        source = raw_index.get("dates")
        if isinstance(source, dict):
            return {date_key: normalize_entries(items) for date_key, items in source.items()}
        return {date_key: normalize_entries(items) for date_key, items in raw_index.items()}
    raise ValueError("Formato de index_detailed.json no soportado")


def build_remote_paths(base_url: str, date_key: str, entry: Dict) -> Tuple[str, str, str, str]:
    file_name = (
        entry.get("file")
        or entry.get("filename")
        or entry.get("png")
        or entry.get("pngFile")
    )
    if not file_name:
        raise ValueError("No se encontró nombre de archivo PNG en la entrada")

    png_rel = f"{date_key}/{file_name}"
    json_name = entry.get("json") or entry.get("jsonFile") or f"{Path(file_name).stem}.json"
    json_rel = f"{date_key}/{json_name}"

    png_url = urljoin(base_url, png_rel)
    json_url = urljoin(base_url, json_rel)
    return png_url, json_url, file_name, json_name


def should_skip(url: str, local_path: Path, overwrite: bool) -> bool:
    if overwrite or not local_path.exists():
        return False
    try:
        head = requests.head(url, timeout=20)
        head.raise_for_status()
        content_length = head.headers.get("Content-Length")
        if content_length and local_path.stat().st_size == int(content_length):
            return True
    except Exception:
        # Si HEAD falla, se descarga nuevamente.
        return False
    return False


def download_file(url: str, local_path: Path, overwrite: bool) -> bool:
    if should_skip(url, local_path, overwrite):
        return False

    local_path.parent.mkdir(parents=True, exist_ok=True)

    with requests.get(url, stream=True, timeout=60) as response:
        response.raise_for_status()
        with open(local_path, "wb") as fh:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    fh.write(chunk)
    return True


def main():
    parser = argparse.ArgumentParser(description="Sincroniza PNG/JSON procesados desde la PC remota.")
    parser.add_argument("--remote-base-url", required=True, help="URL base (termina en /) ej. http://100.88.71.120:8080/converted_images/LGUAXX/")
    parser.add_argument("--local-dir", required=True, help="Directorio local donde guardar los archivos")
    parser.add_argument("--remote-index", default="index_detailed.json", help="Nombre del índice remoto (default: index_detailed.json)")
    parser.add_argument("--download-index", action="store_true", help="Guardar una copia local del índice descargado")
    parser.add_argument("--overwrite", action="store_true", help="Forzar descarga incluso si el archivo existe con el mismo tamaño")
    parser.add_argument("--skip-json", action="store_true", help="No descargar archivos JSON (solo PNG)")
    parser.add_argument("--only-latest", action="store_true", help="Descargar solo la fecha más reciente disponible")
    parser.add_argument("--allow-directory-scan", action="store_true", help="Intentar descubrir archivos listando el directorio remoto cuando no hay índice disponible")
    args = parser.parse_args()

    base_url = args.remote_base_url if args.remote_base_url.endswith("/") else f"{args.remote_base_url}/"
    remote_index = args.remote_index

    downloaded_index_raw: Optional[Any] = None
    index_map: Optional[Dict[str, List[Dict[str, Any]]]] = None
    last_http_error: Optional[requests.HTTPError] = None

    candidates: List[str] = [remote_index]
    if remote_index == "index_detailed.json":
        candidates.append("index.json")

    for candidate in candidates:
        index_url = urljoin(base_url, candidate)
        try:
            response = requests.get(index_url, timeout=30)
            response.raise_for_status()
            downloaded_index_raw = response.json()
            index_map = normalize_index(downloaded_index_raw)
            remote_index = candidate
            break
        except requests.HTTPError as exc:
            last_http_error = exc
            if exc.response is None or exc.response.status_code != 404:
                raise
        except Exception:
            raise

    if index_map is None:
        if args.allow_directory_scan:
            index_map = scan_directory_listing(base_url)
            downloaded_index_raw = index_map
            remote_index = "__directory__"
            if index_map:
                print("No se encontró índice remoto; se utilizó el listado de directorios.")
            else:
                print("No se pudieron descubrir archivos desde el listado de directorios.")
        elif last_http_error is not None:
            raise last_http_error
        else:
            raise FileNotFoundError("No se encontró el índice remoto. Ejecuta con --allow-directory-scan para descubrir archivos.")

    if not index_map:
        print("El índice remoto está vacío. Nada que sincronizar.")
        return

    if not index_map:
        print("El índice remoto está vacío. Nada que sincronizar.")
        return

    date_keys = sorted(index_map.keys())
    if args.only_latest:
        date_keys = date_keys[-1:]

    local_root = Path(args.local_dir)
    png_downloaded = 0
    json_downloaded = 0

    for date_key in date_keys:
        items = index_map.get(date_key)
        if not isinstance(items, (list, tuple)):
            continue
        entries = [entry for entry in items if isinstance(entry, dict)]
        if not entries:
            continue

        for entry in tqdm(entries, desc=f"Descargando {date_key}"):
            try:
                png_url, json_url, file_name, json_name = build_remote_paths(base_url, date_key, entry)
            except ValueError:
                continue

            png_local = local_root / date_key / file_name
            if download_file(png_url, png_local, args.overwrite):
                png_downloaded += 1

            if not args.skip_json:
                json_local = local_root / date_key / json_name
                try:
                    if download_file(json_url, json_local, args.overwrite):
                        json_downloaded += 1
                except requests.HTTPError as exc:
                    # Algunos despliegues no exponen JSON; se ignora el 404.
                    if exc.response is None or exc.response.status_code != 404:
                        raise

    if args.download_index:
        if remote_index == "__directory__":
            index_filename = "directory_listing_index.json"
        else:
            index_filename = remote_index
        index_dest = local_root / index_filename
        index_dest.parent.mkdir(parents=True, exist_ok=True)
        to_write = downloaded_index_raw if downloaded_index_raw is not None else index_map
        index_dest.write_text(json.dumps(to_write, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"PNG nuevos: {png_downloaded}, JSON nuevos: {json_downloaded}")


if __name__ == "__main__":
    main()