#!/usr/bin/env python3
"""
Crea un GIF animado a partir de una lista de archivos PNG.
Recibe un manifiesto JSON con la lista de imágenes y parámetros adicionales.
"""

import argparse
import json
import sys
from pathlib import Path

from PIL import Image


def load_manifest(manifest_path: Path):
    try:
        with manifest_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        images = [Path(p) for p in data.get("images", [])]
        duration = int(data.get("duration", 300))
        loop = int(data.get("loop", 0))
        return images, duration, loop
    except Exception as exc:
        print(json.dumps({"error": f"No se pudo leer el manifiesto: {exc}"}))
        sys.exit(2)


def main():
    parser = argparse.ArgumentParser(description="Genera GIF desde PNGs")
    parser.add_argument("--manifest", required=True, help="Ruta al archivo JSON con manifest")
    parser.add_argument("--output", required=True, help="Ruta del GIF resultante")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    output_path = Path(args.output)

    images, duration, loop = load_manifest(manifest_path)

    if len(images) < 2:
        print(json.dumps({"error": "Se requieren al menos 2 imágenes para crear el GIF"}))
        sys.exit(3)

    pil_frames = []
    try:
        for image_path in images:
            frame = Image.open(image_path).convert("RGBA")
            pil_frames.append(frame)
    except Exception as exc:
        print(json.dumps({"error": f"Error leyendo imágenes: {exc}"}))
        sys.exit(4)

    try:
        first, *rest = pil_frames
        first.save(
            output_path,
            format="GIF",
            save_all=True,
            append_images=rest,
            duration=duration,
            loop=loop,
            disposal=2,
            optimize=False,
        )
    except Exception as exc:
        print(json.dumps({"error": f"No se pudo crear el GIF: {exc}"}))
        sys.exit(5)

    print(json.dumps({"output": str(output_path)}))


if __name__ == "__main__":
    main()


