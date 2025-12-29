#!/usr/bin/env python3
"""
Script de configuración para la PC remota
Configura el servidor de radar y convierte los datos PPI automáticamente
"""

import os
import sys
import json
import time
import subprocess
import threading
from datetime import datetime
from pathlib import Path
import argparse

class RemoteRadarSetup:
    def __init__(self, data_path, output_path, port=8080):
        self.data_path = Path(data_path)
        self.output_path = Path(output_path)
        self.port = port
        self.conversion_script = Path(__file__).parent / 'advanced_ppi_converter_standalone.py'
        self.server_script = Path(__file__).parent / 'radar_server_standalone.py'
        
    def check_dependencies(self):
        """Verifica que las dependencias estén instaladas"""
        print("Verificando dependencias...")
        
        try:
            import numpy
            import PIL
            print("✓ NumPy y PIL están disponibles")
        except ImportError as e:
            print(f"✗ Faltan dependencias: {e}")
            print("Instalando dependencias...")
            subprocess.run([sys.executable, '-m', 'pip', 'install', 'numpy', 'Pillow'])
        
        return True
    
    def convert_data(self):
        """Convierte los datos PPI a PNG"""
        print("Iniciando conversión de datos PPI...")
        
        if not self.data_path.exists():
            print(f"Error: El directorio de datos {self.data_path} no existe")
            return False
        
        # Ejecutar conversión
        cmd = [
            sys.executable,
            str(self.conversion_script),
            '--data-path', str(self.data_path),
            '--output-path', str(self.output_path),
            '--radar-id', 'LGUAXX'
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                print("✓ Conversión completada exitosamente")
                return True
            else:
                print(f"✗ Error en conversión: {result.stderr}")
                return False
        except Exception as e:
            print(f"✗ Error ejecutando conversión: {e}")
            return False
    
    def start_server(self):
        """Inicia el servidor HTTP"""
        print(f"Iniciando servidor HTTP en puerto {self.port}...")
        
        cmd = [
            sys.executable,
            str(self.server_script),
            '--data-path', str(self.output_path),
            '--port', str(self.port)
        ]
        
        try:
            # Ejecutar servidor en subproceso
            process = subprocess.Popen(cmd)
            print(f"✓ Servidor iniciado con PID {process.pid}")
            print(f"✓ Acceso: http://localhost:{self.port}")
            print(f"✓ API: http://localhost:{self.port}/api/radar/index")
            return process
        except Exception as e:
            print(f"✗ Error iniciando servidor: {e}")
            return None
    
    def create_startup_script(self):
        """Crea un script de inicio automático"""
        startup_script = self.output_path / 'start_radar_server.bat'
        
        script_content = f'''@echo off
echo Iniciando servidor de radar...
cd /d "{self.output_path.parent}"
python "{self.server_script}" --data-path "{self.output_path}" --port {self.port}
pause
'''
        
        with open(startup_script, 'w') as f:
            f.write(script_content)
        
        print(f"✓ Script de inicio creado: {startup_script}")
        return startup_script
    
    def create_config_file(self):
        """Crea archivo de configuración"""
        config = {
            'data_path': str(self.data_path),
            'output_path': str(self.output_path),
            'port': self.port,
            'radar_id': 'LGUAXX',
            'last_setup': datetime.now().isoformat()
        }
        
        config_file = self.output_path / 'config.json'
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"✓ Archivo de configuración creado: {config_file}")
        return config_file
    
    def setup(self):
        """Configuración completa del sistema"""
        print("=== Configuración del Servidor de Radar Remoto ===")
        print(f"Directorio de datos: {self.data_path}")
        print(f"Directorio de salida: {self.output_path}")
        print(f"Puerto: {self.port}")
        print()
        
        # Verificar dependencias
        if not self.check_dependencies():
            return False
        
        # Crear directorio de salida
        self.output_path.mkdir(parents=True, exist_ok=True)
        
        # Convertir datos
        if not self.convert_data():
            return False
        
        # Crear archivos de configuración
        self.create_config_file()
        self.create_startup_script()
        
        print("\n=== Configuración Completada ===")
        print("Para iniciar el servidor manualmente:")
        print(f"  python {self.server_script} --data-path {self.output_path} --port {self.port}")
        print()
        print("O usar el script de inicio:")
        print(f"  {self.output_path / 'start_radar_server.bat'}")
        
        return True

def main():
    parser = argparse.ArgumentParser(description='Configurar servidor de radar remoto')
    parser.add_argument('--data-path', required=True, help='Ruta a los datos PPI originales')
    parser.add_argument('--output-path', required=True, help='Ruta de salida para PNGs')
    parser.add_argument('--port', type=int, default=8080, help='Puerto del servidor')
    
    args = parser.parse_args()
    
    setup = RemoteRadarSetup(args.data_path, args.output_path, args.port)
    setup.setup()

if __name__ == "__main__":
    main()
