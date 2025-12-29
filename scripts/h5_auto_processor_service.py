#!/usr/bin/env python3
"""
Servicio automático para monitorear archivos H5 comprimidos (LOXX) y convertirlos a PNG.

Este script debe ejecutarse en la PC REMOTA donde están los archivos H5.
Los PNGs generados se sincronizarán automáticamente a PostgreSQL local mediante el servicio de sincronización.

Uso:
    python h5_auto_processor_service.py --input-dir F:\LOXX\H5 --output-dir F:\LOXX\PNG_OUTPUT
"""

import argparse
import json
import os
import re
import sys
import time
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileSystemEvent
except ImportError:
    print("ERROR: watchdog no está instalado. Instálalo con: pip install watchdog")
    sys.exit(1)


class H5Handler(FileSystemEventHandler):
    """Maneja eventos de archivos H5 comprimidos nuevos"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.processing = set()
        self.debounce_time = config.get('debounce_time', 5.0)
        self.debounce_timers = {}
        self.script_path = config.get('script_path')
        self.output_dir = config.get('output_dir')
        self.radar_id = config.get('radar_id', 'LOXX')
        
    def on_created(self, event: FileSystemEvent):
        """Se llama cuando se crea un nuevo archivo"""
        if event.is_directory:
            return
        
        file_path = Path(event.src_path)
        # Monitorear archivos .h5.gz
        if file_path.suffix.lower() not in ['.gz', '.zip']:
            return
        
        # Verificar que sea un archivo H5 comprimido
        if not (file_path.name.endswith('.h5.gz') or 
                file_path.name.endswith('.h5.zip') or
                (file_path.suffix.lower() == '.gz' and '.h5' in file_path.stem)):
            return
        
        self._schedule_processing(file_path)
    
    def on_modified(self, event: FileSystemEvent):
        """Se llama cuando se modifica un archivo"""
        if event.is_directory:
            return
        
        file_path = Path(event.src_path)
        if file_path.suffix.lower() not in ['.gz', '.zip']:
            return
        
        if not (file_path.name.endswith('.h5.gz') or 
                file_path.name.endswith('.h5.zip') or
                (file_path.suffix.lower() == '.gz' and '.h5' in file_path.stem)):
            return
        
        # Solo procesar si el archivo no está siendo procesado
        if file_path not in self.processing:
            self._schedule_processing(file_path)
    
    def _schedule_processing(self, file_path: Path):
        """Programa el procesamiento de un archivo con debounce"""
        normalized = file_path.resolve()
        
        # Cancelar timer anterior si existe
        if normalized in self.debounce_timers:
            self.debounce_timers[normalized].cancel()
        
        # Programar nuevo procesamiento
        import threading
        timer = threading.Timer(self.debounce_time, self._process_file, args=(normalized,))
        timer.start()
        self.debounce_timers[normalized] = timer
    
    def _process_file(self, file_path: Path):
        """Procesa un archivo H5 comprimido"""
        normalized = file_path.resolve()
        
        if normalized in self.processing:
            print(f"[h5-watcher] {file_path.name} ya está siendo procesado, omitiendo...")
            return
        
        # Verificar que el archivo existe y no está siendo escrito
        if not normalized.exists():
            print(f"[h5-watcher] Archivo no encontrado: {file_path.name}")
            return
        
        # Verificar que el archivo no esté siendo escrito
        try:
            stats = normalized.stat()
            file_age = time.time() - stats.st_mtime
            if file_age < 2.0:
                print(f"[h5-watcher] Archivo muy reciente, esperando estabilidad: {file_path.name}")
                # Reprogramar para más tarde
                import threading
                timer = threading.Timer(3.0, self._process_file, args=(normalized,))
                timer.start()
                self.debounce_timers[normalized] = timer
                return
        except Exception as e:
            print(f"[h5-watcher] Error verificando archivo {file_path.name}: {e}")
            return
        
        self.processing.add(normalized)
        
        try:
            print(f"[h5-watcher] Procesando nuevo archivo H5: {file_path.name}")
            
            # Ejecutar script de procesamiento
            cmd = [
                sys.executable,
                str(self.script_path),
                '--input-file', str(normalized),
                '--output-dir', str(self.output_dir),
                '--radar-id', self.radar_id,
                '--vmin', '10.0',
                '--vmax', '70.0',
                '--transparent-below', '8.0',
                '--cmap', 'meteorological'
            ]
            
            print(f"[h5-watcher] Ejecutando: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                cwd=str(Path(self.script_path).parent),
                capture_output=True,
                text=True,
                timeout=300  # 5 minutos máximo
            )
            
            if result.returncode == 0:
                print(f"[h5-watcher] ✓ Procesado exitosamente: {file_path.name}")
                if result.stdout:
                    # Mostrar primeras líneas de salida
                    lines = result.stdout.strip().split('\n')
                    for line in lines[:5]:
                        if line.strip():
                            print(f"  {line}")
            else:
                print(f"[h5-watcher] ✗ Error procesando {file_path.name} (código: {result.returncode})")
                if result.stderr:
                    error_lines = result.stderr.strip().split('\n')
                    for line in error_lines[:10]:
                        if line.strip():
                            print(f"  ERROR: {line}")
                if result.stdout:
                    output_lines = result.stdout.strip().split('\n')
                    for line in output_lines[-5:]:
                        if line.strip():
                            print(f"  {line}")
        
        except subprocess.TimeoutExpired:
            print(f"[h5-watcher] ✗ Timeout procesando {file_path.name} (más de 5 minutos)")
        except Exception as e:
            print(f"[h5-watcher] ✗ Error procesando {file_path.name}: {e}")
        finally:
            self.processing.discard(normalized)
            if normalized in self.debounce_timers:
                del self.debounce_timers[normalized]


class H5AutoProcessorService:
    """Servicio principal para monitorear y procesar archivos H5 automáticamente"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.observer = None
        self.input_dir = Path(config['input_dir'])
        self.output_dir = Path(config['output_dir'])
        self.script_path = Path(config.get('script_path', 
            Path(__file__).parent / 'process_loxx_h5_compressed.py'))
        
        # Validar directorios
        if not self.input_dir.exists():
            raise ValueError(f"Directorio de entrada no existe: {self.input_dir}")
        
        if not self.script_path.exists():
            raise ValueError(f"Script de procesamiento no encontrado: {self.script_path}")
        
        # Crear directorio de salida si no existe
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"[h5-service] Configuración:")
        print(f"  Directorio H5: {self.input_dir}")
        print(f"  Directorio PNG: {self.output_dir}")
        print(f"  Script: {self.script_path}")
        print(f"  Radar ID: {config.get('radar_id', 'LOXX')}")
    
    def start(self):
        """Inicia el servicio de monitoreo"""
        event_handler = H5Handler({
            'script_path': self.script_path,
            'output_dir': self.output_dir,
            'radar_id': self.config.get('radar_id', 'LOXX'),
            'debounce_time': self.config.get('debounce_time', 5.0),
        })
        
        self.observer = Observer()
        self.observer.schedule(event_handler, str(self.input_dir), recursive=True)
        self.observer.start()
        
        print(f"[h5-service] ✓ Monitoreo iniciado en: {self.input_dir}")
        print(f"[h5-service] Esperando nuevos archivos H5 comprimidos...")
        print(f"[h5-service] Presiona Ctrl+C para detener")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[h5-service] Deteniendo servicio...")
            self.stop()
    
    def stop(self):
        """Detiene el servicio de monitoreo"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            print("[h5-service] Servicio detenido")


def main():
    parser = argparse.ArgumentParser(
        description='Servicio automático para monitorear y procesar archivos H5 comprimidos (LOXX)'
    )
    parser.add_argument(
        '--input-dir',
        default='F:\\LOXX\\H5',
        help='Directorio con archivos H5 comprimidos (default: F:\\LOXX\\H5)'
    )
    parser.add_argument(
        '--output-dir',
        default='F:\\LOXX\\PNG_OUTPUT',
        help='Directorio de salida para PNGs (default: F:\\LOXX\\PNG_OUTPUT)'
    )
    parser.add_argument(
        '--script-path',
        help='Ruta al script process_loxx_h5_compressed.py (por defecto: mismo directorio)'
    )
    parser.add_argument(
        '--radar-id',
        default='LOXX',
        help='ID del radar (default: LOXX)'
    )
    parser.add_argument(
        '--debounce-time',
        type=float,
        default=5.0,
        help='Tiempo de espera antes de procesar (segundos, default: 5.0)'
    )
    
    args = parser.parse_args()
    
    # Determinar ruta del script
    if args.script_path:
        script_path = Path(args.script_path)
    else:
        script_path = Path(__file__).parent / 'process_loxx_h5_compressed.py'
    
    if not script_path.exists():
        print(f"ERROR: Script no encontrado: {script_path}")
        print(f"Especifica la ruta con --script-path")
        sys.exit(1)
    
    config = {
        'input_dir': args.input_dir,
        'output_dir': args.output_dir,
        'script_path': str(script_path),
        'radar_id': args.radar_id,
        'debounce_time': args.debounce_time,
    }
    
    try:
        service = H5AutoProcessorService(config)
        service.start()
    except KeyboardInterrupt:
        print("\n[h5-service] Interrupción recibida, deteniendo...")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()


