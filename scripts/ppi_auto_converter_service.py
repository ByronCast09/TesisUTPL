#!/usr/bin/env python3
"""
Servicio automático para monitorear archivos PPI y convertirlos a PNG,
luego subirlos automáticamente a PostgreSQL.

Este script debe ejecutarse en la PC REMOTA donde están los archivos PPI.
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileSystemEvent
except ImportError:
    print("ERROR: watchdog no está instalado. Instálalo con: pip install watchdog")
    sys.exit(1)

# Importar el conversor
try:
    # Intentar importar desde el mismo directorio
    sys.path.insert(0, str(Path(__file__).parent))
    from advanced_ppi_converter import AdvancedPPIConverter
except ImportError:
    print("ERROR: No se pudo importar advanced_ppi_converter")
    print("Asegúrate de que advanced_ppi_converter.py esté en el mismo directorio")
    sys.exit(1)

try:
    import psycopg
except ImportError:
    print("ERROR: psycopg no está instalado. Instálalo con: pip install psycopg[binary]")
    sys.exit(1)


class PPIHandler(FileSystemEventHandler):
    """Maneja eventos de archivos PPI nuevos"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.processing = set()
        self.debounce_time = config.get('debounce_time', 5.0)
        self.debounce_timers = {}
        
    def on_created(self, event: FileSystemEvent):
        """Se llama cuando se crea un nuevo archivo"""
        if event.is_directory:
            return
        
        file_path = Path(event.src_path)
        if file_path.suffix.lower() != '.ppi':
            return
        
        self._schedule_processing(file_path)
    
    def on_modified(self, event: FileSystemEvent):
        """Se llama cuando se modifica un archivo"""
        if event.is_directory:
            return
        
        file_path = Path(event.src_path)
        if file_path.suffix.lower() != '.ppi':
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
        """Procesa un archivo PPI"""
        normalized = file_path.resolve()
        
        if normalized in self.processing:
            print(f"[watcher] {file_path.name} ya está siendo procesado, omitiendo...")
            return
        
        self.processing.add(normalized)
        
        try:
            print(f"[watcher] Procesando nuevo archivo PPI: {file_path.name}")
            
            # Ejecutar conversión
            # El conversor necesita el directorio raíz con carpetas YYYY-MM-DD
            # Buscar el directorio raíz que contiene carpetas de fecha
            data_root = file_path.parent
            date_folder = None
            
            # Buscar hacia arriba hasta encontrar una carpeta de fecha o el directorio raíz configurado
            current = file_path.parent
            config_data_path = Path(self.config['data_path'])
            
            while current != config_data_path.parent and current != current.parent:
                if re.match(r'^\d{4}-\d{2}-\d{2}$', current.name):
                    date_folder = current
                    data_root = current.parent
                    break
                current = current.parent
            
            # Si no encontramos carpeta de fecha, usar el directorio configurado
            if data_root is None or not data_root.exists():
                data_root = config_data_path
            
            converter = AdvancedPPIConverter(
                data_path=str(data_root),
                output_path=self.config['output_path'],
                radar_id=self.config['radar_id'],
                db_url=self.config.get('db_url'),
                db_host=self.config.get('db_host'),
                db_port=self.config.get('db_port'),
                db_user=self.config.get('db_user'),
                db_password=self.config.get('db_password'),
                db_name=self.config.get('db_name'),
            )
            
            # Procesar la carpeta de fecha si la encontramos
            if date_folder and date_folder.exists():
                # Es una carpeta de fecha, procesarla
                converter.process_date_folder(date_folder)
            else:
                # No encontramos carpeta de fecha, procesar todo el directorio
                converter.run_conversion()
            
            converter.close()
            
            print(f"[watcher] ✓ Archivo procesado: {file_path.name}")
            
        except Exception as e:
            print(f"[watcher] ✗ Error procesando {file_path.name}: {e}")
        finally:
            self.processing.discard(normalized)
            self.debounce_timers.pop(normalized, None)


class PPIAutoConverterService:
    """Servicio principal de monitoreo y conversión automática"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.observer = None
        self.handler = None
        
    def start(self, process_existing=True):
        """Inicia el servicio de monitoreo"""
        data_path = Path(self.config['data_path'])
        
        if not data_path.exists():
            print(f"ERROR: El directorio de datos no existe: {data_path}")
            return False
        
        print("=" * 60)
        print("SERVICIO AUTOMÁTICO DE CONVERSIÓN PPI → PNG")
        print("=" * 60)
        print(f"Radar: {self.config['radar_id']}")
        print(f"Directorio PPI: {data_path}")
        print(f"Directorio PNG: {self.config['output_path']}")
        print(f"PostgreSQL: {self.config.get('db_host', 'N/A')}")
        print("=" * 60)
        print()
        
        # Procesar archivos existentes primero si está habilitado
        if process_existing:
            print("=" * 60)
            print("PROCESANDO ARCHIVOS EXISTENTES")
            print("=" * 60)
            print(f"Buscando archivos PPI en: {data_path}")
            
            # Buscar todos los archivos .ppi recursivamente
            existing_files = list(data_path.rglob("*.ppi"))
            
            if existing_files:
                print(f"Encontrados {len(existing_files)} archivos PPI para procesar")
                print("Procesando archivos existentes...")
                print()
                
                # Crear conversor para procesar archivos existentes
                converter = AdvancedPPIConverter(
                    data_path=str(data_path),
                    output_path=self.config['output_path'],
                    radar_id=self.config['radar_id'],
                    db_url=self.config.get('db_url'),
                    db_host=self.config.get('db_host'),
                    db_port=self.config.get('db_port'),
                    db_user=self.config.get('db_user'),
                    db_password=self.config.get('db_password'),
                    db_name=self.config.get('db_name'),
                )
                
                # Procesar todos los archivos existentes
                converter.run_conversion()
                converter.close()
                
                print()
                print("=" * 60)
                print("✓ Archivos existentes procesados")
                print("=" * 60)
                print()
            else:
                print("No se encontraron archivos PPI existentes")
                print()
        
        # Crear handler
        self.handler = PPIHandler(self.config)
        
        # Crear observer
        self.observer = Observer()
        self.observer.schedule(
            self.handler,
            str(data_path),
            recursive=True
        )
        
        # Iniciar monitoreo
        self.observer.start()
        print("=" * 60)
        print("MODO MONITOREO ACTIVO")
        print("=" * 60)
        print(f"[service] Monitoreo iniciado. Esperando nuevos archivos PPI...")
        print(f"[service] Presiona Ctrl+C para detener")
        print("=" * 60)
        print()
        
        return True
    
    def stop(self):
        """Detiene el servicio"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            print("\n[service] Servicio detenido")
    
    def run(self, process_existing=True):
        """Ejecuta el servicio (bloquea hasta Ctrl+C)"""
        if not self.start(process_existing=process_existing):
            return
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()


def build_db_config_from_env() -> Dict[str, Any]:
    """Construye configuración de BD desde variables de entorno"""
    config = {}
    
    # Intentar URL completa primero
    if os.getenv('DATABASE_URL'):
        config['db_url'] = os.getenv('DATABASE_URL')
    else:
        # Construir desde componentes
        config['db_host'] = os.getenv('DB_HOST', 'localhost')
        config['db_port'] = int(os.getenv('DB_PORT', '5432'))
        config['db_user'] = os.getenv('DB_USER', 'postgres')
        config['db_password'] = os.getenv('DB_PASSWORD', '')
        config['db_name'] = os.getenv('DB_NAME', 'radar_metadata')
    
    return config


def main():
    parser = argparse.ArgumentParser(
        description='Servicio automático de conversión PPI a PNG con subida a PostgreSQL'
    )
    
    parser.add_argument(
        '--data-path',
        required=True,
        help='Directorio donde están los archivos PPI (con carpetas YYYY-MM-DD)'
    )
    parser.add_argument(
        '--output-path',
        required=True,
        help='Directorio donde se guardarán los PNGs convertidos'
    )
    parser.add_argument(
        '--radar-id',
        default='LGUAXX',
        help='ID del radar (LGUAXX, LOXX, etc.)'
    )
    
    # Opciones de PostgreSQL
    parser.add_argument('--db-url', help='URL completa de conexión a PostgreSQL')
    parser.add_argument('--db-host', help='Host de PostgreSQL')
    parser.add_argument('--db-port', type=int, help='Puerto de PostgreSQL')
    parser.add_argument('--db-user', help='Usuario de PostgreSQL')
    parser.add_argument('--db-password', help='Contraseña de PostgreSQL')
    parser.add_argument('--db-name', help='Nombre de la base de datos')
    
    # Opciones de configuración
    parser.add_argument(
        '--debounce-time',
        type=float,
        default=5.0,
        help='Tiempo de espera antes de procesar (segundos, default: 5.0)'
    )
    parser.add_argument(
        '--skip-existing',
        action='store_true',
        help='Saltar el procesamiento de archivos existentes (solo monitorear nuevos)'
    )
    
    args = parser.parse_args()
    
    # Construir configuración
    config = {
        'data_path': args.data_path,
        'output_path': args.output_path,
        'radar_id': args.radar_id,
        'debounce_time': args.debounce_time,
    }
    
    # Configuración de BD desde argumentos o variables de entorno
    if args.db_url:
        config['db_url'] = args.db_url
    elif args.db_host:
        config['db_host'] = args.db_host
        config['db_port'] = args.db_port or 5432
        config['db_user'] = args.db_user
        config['db_password'] = args.db_password
        config['db_name'] = args.db_name
    else:
        # Intentar desde variables de entorno
        env_config = build_db_config_from_env()
        config.update(env_config)
    
    # Crear y ejecutar servicio
    service = PPIAutoConverterService(config)
    service.run(process_existing=not args.skip_existing)  # Procesar existentes a menos que se use --skip-existing


if __name__ == '__main__':
    main()

