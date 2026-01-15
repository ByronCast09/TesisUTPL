#!/usr/bin/env python3
"""
Monitorea directorio LOXX usando POLLING (para directorios de red)
En lugar de watchdog (que no funciona en shares remotos), revisa el directorio cada X segundos
"""

import os
import sys
import time
import json
from pathlib import Path
from datetime import datetime
import subprocess

import re

# Configuración
INPUT_DIR = r"F:\LOXX\H5"
OUTPUT_DIR = r"F:\LOXX\PNG_OUTPUT"
PROCESSOR_SCRIPT = r"C:\Users\Usuario iTC\Desktop\TesisUTPL\tesis_utpl\backend\scripts\process_loxx_h5_compressed.py"
STATE_FILE = r"C:\Users\Usuario iTC\Desktop\TesisUTPL\loxx_polling_state.json"

POLL_INTERVAL = 10  # Más rápido
MAX_FILES_PER_CYCLE = 50  # Más archivos por ciclo para catch-up rápido
START_DATE_FILTER = 20260107 # Procesar desde el 7 de Enero en adelante

# ... (load_state, save_state functions remain same) ...

# Función auxiliar para extraer fecha
def extract_date(filename):
    match = re.search(r'(202[0-9]{5})', filename)
    return int(match.group(1)) if match else 0

def find_h5_files(directory):
    """Encuentra archivos H5 comprimidos y filtra por fecha"""
    h5_files = []
    
    try:
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith('.h5.gz') or file.endswith('.h5.zip') or \
                   (file.endswith('.gz') and '.h5' in file.lower()):
                    
                    # FILTRO DE FECHA
                    file_date = extract_date(file)
                    if file_date >= START_DATE_FILTER:
                        full_path = os.path.join(root, file)
                        h5_files.append(full_path)
    except Exception as e:
        print(f"Error escaneando directorio: {e}")
    
    return h5_files

# ... (process_file remains same) ...

import argparse

def main():
    parser = argparse.ArgumentParser(description='Monitor Radar LOXX con soporte Backfill')
    parser.add_argument('--start-date', type=int, default=20260107, 
                        help='Fecha de inicio para procesar (YYYYMMDD). Default: 20260107')
    parser.add_argument('--limit', type=int, default=50, 
                        help='Archivos por ciclo. Default: 50')
    parser.add_argument('--interval', type=int, default=10, 
                        help='Intervalo de polling (segundos). Default: 10')
    
    args = parser.parse_args()
    
    # Actualizar configuración global con argumentos
    global START_DATE_FILTER, MAX_FILES_PER_CYCLE, POLL_INTERVAL
    START_DATE_FILTER = args.start_date
    MAX_FILES_PER_CYCLE = args.limit
    POLL_INTERVAL = args.interval

    print("="*70)
    print("MONITOR LOXX - MODO CATCH-UP & LIVE")
    print("="*70)
    print(f"Directorio H5:   {INPUT_DIR}")
    print(f"Inicio Proceso:  > {START_DATE_FILTER}")
    print(f"Archivos/Ciclo:  {MAX_FILES_PER_CYCLE}")
    print(f"Intervalo:       {POLL_INTERVAL}s")
    print("Orden:           CRONOLÓGICO (Recuperando historia -> actual)")
    print("="*70)
    # ...

    # ... (inside loop)
            # Ordenar CRONOLÓGICAMENTE (Oldest first) para llenar historial
            # Usamos el nombre del archivo que contiene la fecha YYYYMMDDHHMM
            new_files.sort(key=lambda f: os.path.basename(f))
                
            # Procesar lote
            to_process = new_files[:MAX_FILES_PER_CYCLE]
                
            if len(new_files) > MAX_FILES_PER_CYCLE:
                print(f"  ⚠️ Hay {len(new_files)} pendientes. Procesando lote de {MAX_FILES_PER_CYCLE} antiguos...")
                
            for i, file_path in enumerate(to_process, 1):
                print(f"\n  [{i}/{len(to_process)}] {os.path.basename(file_path)}")
                # ...

def load_state():
    """Carga el estado de archivos ya procesados"""
    if not os.path.exists(STATE_FILE):
        return set()
    
    try:
        with open(STATE_FILE, 'r') as f:
            data = json.load(f)
            return set(data.get('processed_files', []))
    except Exception as e:
        print(f"Error cargando estado: {e}")
        return set()

def save_state(processed_files):
    """Guarda el estado de archivos procesados"""
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump({
                'processed_files': list(processed_files),
                'last_update': datetime.now().isoformat()
            }, f, indent=2)
    except Exception as e:
        print(f"Error guardando estado: {e}")

def find_h5_files(directory):
    """Encuentra archivos H5 comprimidos en el directorio"""
    h5_files = []
    
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

def process_file(file_path):
    """Procesa un archivo H5 usando el script Python"""
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Procesando: {os.path.basename(file_path)}")
        
        cmd = [
            sys.executable,  # Python ejecutable
            PROCESSOR_SCRIPT,
            '--input-file', file_path,
            '--output-dir', OUTPUT_DIR,
            '--radar-id', 'LOXX'
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60  # timeout de 60 segundos por archivo
        )
        
        if result.returncode == 0:
            print(f"  ✓ Procesado exitosamente")
            return True
        else:
            print(f"  ✗ Error procesando (código {result.returncode})")
            if result.stderr:
                print(f"  Error: {result.stderr[:200]}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"  ✗ Timeout procesando archivo (>60s)")
        return False
    except Exception as e:
        print(f"  ✗ Excepción: {e}")
        return False

def main():
    print("="*70)
    print("MONITOR LOXX - MODO POLLING")
    print("="*70)
    print(f"Directorio H5: {INPUT_DIR}")
    print(f"Directorio PNG: {OUTPUT_DIR}")
    print(f"Intervalo de revisión: {POLL_INTERVAL} segundos")
    print(f"Archivos por ciclo: máx {MAX_FILES_PER_CYCLE}")
    print("="*70)
    print("Presiona Ctrl+C para detener")
    print("="*70)
    print()
    
    # Verificar que existan los directorios
    if not os.path.exists(INPUT_DIR):
        print(f"ERROR: Directorio de entrada no existe: {INPUT_DIR}")
        sys.exit(1)
    
    if not os.path.exists(PROCESSOR_SCRIPT):
        print(f"ERROR: Script procesador no existe: {PROCESSOR_SCRIPT}")
        sys.exit(1)
    
    # Crear directorio de salida si no existe
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Cargar estado
    processed_files = load_state()
    print(f"Archivos ya procesados: {len(processed_files)}")
    print()
    
    cycle = 0
    
    try:
        while True:
            cycle += 1
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            print(f"[{now}] Ciclo #{cycle}: Escaneando directorio...")
            
            # Buscar archivos H5
            all_h5_files = find_h5_files(INPUT_DIR)
            print(f"  Encontrados {len(all_h5_files)} archivos H5 totales")
            
            # Filtrar archivos no procesados
            new_files = [f for f in all_h5_files if f not in processed_files]
            
            if new_files:
                print(f"  📁 Nuevos archivos: {len(new_files)}")
                
                # Ordenar por fecha de modificación (más recientes primero)
                new_files.sort(key=lambda f: os.path.getmtime(f), reverse=True)
                
                # Procesar solo los primeros N archivos
                to_process = new_files[:MAX_FILES_PER_CYCLE]
                
                if len(new_files) > MAX_FILES_PER_CYCLE:
                    print(f"  ⚠️ Limitando a {MAX_FILES_PER_CYCLE} archivos más recientes")
                
                for i, file_path in enumerate(to_process, 1):
                    print(f"\n  [{i}/{len(to_process)}] {os.path.basename(file_path)}")
                    
                    success = process_file(file_path)
                    
                    if success:
                        processed_files.add(file_path)
                        save_state(processed_files)
                
                print(f"\n  ✓ Ciclo #{cycle} completado")
            else:
                print(f"  ✓ No hay archivos nuevos")
            
            print(f"\n  💤 Esperando {POLL_INTERVAL} segundos...")
            print()
            time.sleep(POLL_INTERVAL)
            
    except KeyboardInterrupt:
        print("\n\n🛑 Detenido por usuario")
        print(f"Total archivos procesados: {len(processed_files)}")
        save_state(processed_files)
        print("Estado guardado")

if __name__ == "__main__":
    main()
