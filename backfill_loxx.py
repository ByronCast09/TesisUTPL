#!/usr/bin/env python3
"""
Script de Relleno (Backfill) para Radar LOXX
Procesa archivos antiguos que el monitor en tiempo real pudo haber saltado.
Prioriza los archivos MÁS ANTIGUOS primero (cronológico).
"""

import os
import sys
import json
import subprocess
import argparse
from datetime import datetime
import time

# --- CONFIGURACIÓN ---
INPUT_DIR = r"F:\LOXX\H5"
OUTPUT_DIR = r"F:\LOXX\PNG_OUTPUT"
PROCESSOR_SCRIPT = r"C:\Users\Usuario iTC\Desktop\TesisUTPL\tesis_utpl\backend\scripts\process_loxx_h5_compressed.py"
STATE_FILE = r"C:\Users\Usuario iTC\Desktop\TesisUTPL\loxx_polling_state.json"

def load_state():
    if not os.path.exists(STATE_FILE):
        return set()
    try:
        with open(STATE_FILE, 'r') as f:
            data = json.load(f)
            return set(data.get('processed_files', []))
    except Exception:
        return set()

def save_state(processed_files):
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump({
                'processed_files': list(processed_files),
                'last_update': datetime.now().isoformat()
            }, f, indent=2)
    except Exception as e:
        print(f"Error guardando estado: {e}")

def find_h5_files(directory):
    h5_files = []
    print(f"Escanerando {directory}...")
    try:
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith('.h5.gz') or file.endswith('.h5.zip') or \
                   (file.endswith('.gz') and '.h5' in file.lower()):
                    full_path = os.path.join(root, file)
                    h5_files.append(full_path)
    except Exception as e:
        print(f"Error escaneando directorio: {e}")
    return h5_files

def main():
    parser = argparse.ArgumentParser(description='Backfill Radar LOXX')
    parser.add_argument('--limit', type=int, default=1000, help='Límite de archivos a procesar por ejecución')
    parser.add_argument('--date', type=str, help='Filtrar por fecha (YYYYMMDD) en el nombre del archivo')
    args = parser.parse_args()

    if not os.path.exists(PROCESSOR_SCRIPT):
        print(f"Error: No encuentro el script procesador en: {PROCESSOR_SCRIPT}")
        return

    processed = load_state()
    all_files = find_h5_files(INPUT_DIR)
    
    # Filtrar solo NO procesados
    pending_files = [f for f in all_files if f not in processed]

    # Filtrar por fecha si se especifica
    if args.date:
        pending_files = [f for f in pending_files if args.date in os.path.basename(f)]

    # ORDENAR: CRONOLÓGICO (Más antiguos primero)
    # Suponiendo que el nombre del archivo contiene la fecha y ordena bien alfabéticamente
    pending_files.sort() 

    print(f"\nResumen:")
    print(f"  Total encontrados: {len(all_files)}")
    print(f"  Ya procesados:     {len(processed)}")
    print(f"  Pendientes:        {len(pending_files)}")
    
    if not pending_files:
        print("¡Al día! No hay archivos pendientes.")
        return

    to_process = pending_files[:args.limit]
    print(f"  Procesando lote de: {len(to_process)} (Limit: {args.limit})")
    print(f"  Orden: Del más antiguo al más reciente\n")

    input("Presiona ENTER para comenzar el procesamiento (Ctrl+C para cancelar)...")

    count = 0
    for file_path in to_process:
        count += 1
        filename = os.path.basename(file_path)
        print(f"[{count}/{len(to_process)}] Procesando: {filename}")

        cmd = [
            sys.executable,
            PROCESSOR_SCRIPT,
            '--input-file', file_path,
            '--output-dir', OUTPUT_DIR,
            '--radar-id', 'LOXX'
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode == 0:
                print("  ✓ OK")
                processed.add(file_path)
                # Guardar cada 5 archivos para no perder progreso si falla
                if count % 5 == 0:
                    save_state(processed)
            else:
                print(f"  ✗ Error (Code {result.returncode})")
                # print(result.stderr[:200]) # Descomentar para debug
        except Exception as e:
            print(f"  ✗ Excepción: {e}")

    save_state(processed)
    print("\n--- Completado ---")

if __name__ == "__main__":
    main()
