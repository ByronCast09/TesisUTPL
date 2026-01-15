#!/usr/bin/env python3
"""
Monitor Completo Radar LOXX
1. "Backfill": Procesa todo desde una fecha específica (ej: 7 Enero 2026).
2. "Live": Sigue esperando y procesando nuevos archivos indefinidamente.
3. Orden Cronológico: Procesa lo antiguo primero para completar la historia.
"""

import os
import sys
import json
import subprocess
import time
import re
from datetime import datetime

# --- CONFIGURACIÓN ---
INPUT_DIR = r"F:\LOXX\H5"
OUTPUT_DIR = r"F:\LOXX\PNG_OUTPUT"
PROCESSOR_SCRIPT = r"C:\Users\Usuario iTC\Desktop\TesisUTPL\tesis_utpl\backend\scripts\process_loxx_h5_compressed.py"
STATE_FILE = r"C:\Users\Usuario iTC\Desktop\TesisUTPL\loxx_polling_state.json"

# FECHA DE INICIO PARA PROCESAR (Formato YYYYMMDD)
START_DATE_FILTER = 20260107 

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

def extract_date_from_filename(filename):
    # Busca patrones como 20260107 en el nombre
    match = re.search(r'(202[0-9]{5})', filename)
    if match:
        return int(match.group(1))
    return 0

def find_candidate_files(directory):
    candidates = []
    try:
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith('.h5.gz') or file.endswith('.h5.zip') or \
                   (file.endswith('.gz') and '.h5' in file.lower()):
                    
                    # Filtro de fecha
                    file_date = extract_date_from_filename(file)
                    if file_date >= START_DATE_FILTER:
                        full_path = os.path.join(root, file)
                        candidates.append((file_date, full_path))
    except Exception as e:
        print(f"Error escaneando: {e}")
    return candidates

def main():
    print("="*60)
    print(f"FULL MONITOR LOXX - Desde {START_DATE_FILTER} en adelante")
    print("="*60)

    processed = load_state()
    
    while True:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Buscando archivos...")
        
        # 1. Encontrar todos los candidatos que cumplan fecha
        candidates = find_candidate_files(INPUT_DIR)
        
        # 2. Filtrar los ya procesados
        pending = []
        for date_int, path in candidates:
            if path not in processed:
                pending.append((date_int, path))
        
        if pending:
            print(f"  -> Encontrados {len(pending)} archivos pendientes desde el {START_DATE_FILTER}.")
            
            # 3. Ordenar Cronológicamente (Oldest first)
            # Ordena por fecha extraída y luego por nombre para horas
            pending.sort(key=lambda x: (x[0], os.path.basename(x[1])))
            
            # Procesar lote (máx 50 por ciclo para permitir actualizar estado y logs)
            batch = pending[:50] 
            
            print(f"  -> Procesando lote de {len(batch)} archivos...")
            
            for i, (date, file_path) in enumerate(batch, 1):
                filename = os.path.basename(file_path)
                print(f"    [{i}/{len(batch)}] {filename} ... ", end='', flush=True)
                
                cmd = [
                    sys.executable,
                    PROCESSOR_SCRIPT,
                    '--input-file', file_path,
                    '--output-dir', OUTPUT_DIR,
                    '--radar-id', 'LOXX'
                ]
                
                try:
                    # Timeout generoso porque procesar histórico puede ser pesado
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
                    
                    if result.returncode == 0:
                        print("OK")
                        processed.add(file_path)
                    else:
                        print("ERROR")
                except Exception as e:
                    print(f"EXCEPCIÓN: {e}")
            
            # Guardamos estado después del lote
            save_state(processed)
            print("  -> Estado actualizado.")
            
        else:
            print("  -> Todo al día. Esperando nuevos archivos...")
            print("     (Ctrl+C para detener)")
            time.sleep(30) # Esperar 30 seg antes de volver a buscar

if __name__ == "__main__":
    main()
