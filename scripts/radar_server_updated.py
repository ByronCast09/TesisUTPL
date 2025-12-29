#!/usr/bin/env python3
"""
Servidor HTTP actualizado para servir datos de radar desde
D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
"""

import os
import sys
import json
import time
import glob
import threading
import re
from datetime import datetime, timedelta
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import socketserver
import argparse

class RadarHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, radar_data_path=None, **kwargs):
        self.radar_data_path = radar_data_path
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        """Maneja las peticiones GET"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Endpoint para obtener índice de archivos
        if path == '/api/radar/index' or path == '/index.json':
            self.send_radar_index()
        # Endpoint para obtener imagen específica por fecha y archivo
        elif path.startswith('/api/radar/image/'):
            self.send_radar_image(path)
        # Endpoint para obtener última imagen
        elif path == '/api/radar/latest':
            self.send_latest_image()
        # Servir archivos por fecha (ej: /2025-10-24/archivo.png)
        elif len(path.split('/')) >= 3 and re.match(r'\d{4}-\d{2}-\d{2}', path.split('/')[1]):
            self.send_file_by_date(path)
        # Servir archivos estáticos
        else:
            super().do_GET()
    
    def scan_radar_data(self):
        """Escanea la carpeta de datos del radar y genera el índice"""
        try:
            radar_data = {
                "radar_id": "LGUAXX",
                "last_updated": datetime.now().isoformat() + "Z",
                "total_files": 0,
                "dates": {}
            }
            
            # Buscar carpetas de fechas en formato YYYY-MM-DD
            date_dirs = []
            for item in self.radar_data_path.iterdir():
                if item.is_dir() and re.match(r'\d{4}-\d{2}-\d{2}', item.name):
                    date_dirs.append(item)
            
            date_dirs.sort(key=lambda x: x.name)
            
            total_files = 0
            for date_dir in date_dirs:
                date_str = date_dir.name
                files = []
                
                # Buscar archivos .ppi, .nc4, .png, .gif en la carpeta de fecha
                for pattern in ['*.ppi', '*.nc4', '*.nc', '*.png', '*.gif']:
                    for file_path in date_dir.glob(pattern):
                        if file_path.is_file():
                            files.append(file_path.name)
                            total_files += 1
                
                if files:
                    files.sort()
                    radar_data["dates"][date_str] = files
            
            radar_data["total_files"] = total_files
            return radar_data
            
        except Exception as e:
            print(f"Error escaneando datos del radar: {e}")
            return {
                "radar_id": "LGUAXX",
                "last_updated": datetime.now().isoformat() + "Z",
                "total_files": 0,
                "dates": {},
                "error": str(e)
            }
    
    def send_radar_index(self):
        """Envía el índice de archivos de radar disponibles"""
        try:
            # Generar índice dinámicamente
            data = self.scan_radar_data()
            self.send_json_response(data)
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def send_file_by_date(self, path):
        """Envía un archivo específico por fecha (ej: /2025-10-24/archivo.png)"""
        try:
            path_parts = path.strip('/').split('/')
            if len(path_parts) < 2:
                self.send_error(400, "Formato de ruta inválido")
                return
                
            date_str = path_parts[0]
            filename = path_parts[1]
            
            # Validar formato de fecha
            if not re.match(r'\d{4}-\d{2}-\d{2}', date_str):
                self.send_error(400, "Formato de fecha inválido")
                return
            
            file_path = self.radar_data_path / date_str / filename
            
            if not file_path.exists():
                self.send_error(404, "Archivo no encontrado")
                return
            
            # Determinar tipo de contenido
            content_type = 'application/octet-stream'
            if filename.lower().endswith('.png'):
                content_type = 'image/png'
            elif filename.lower().endswith('.gif'):
                content_type = 'image/gif'
            elif filename.lower().endswith(('.nc', '.nc4')):
                content_type = 'application/netcdf'
            
            with open(file_path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            self.send_error(500, f"Error: {str(e)}")
    
    def send_radar_image(self, path):
        """Envía una imagen específica del radar"""
        try:
            # Extraer nombre del archivo de la URL
            filename = path.split('/')[-1]
            
            # Buscar el archivo en todas las carpetas de fechas
            found_file = None
            for date_dir in self.radar_data_path.iterdir():
                if date_dir.is_dir() and re.match(r'\d{4}-\d{2}-\d{2}', date_dir.name):
                    potential_file = date_dir / filename
                    if potential_file.exists():
                        found_file = potential_file
                        break
            
            if not found_file:
                self.send_error(404, "Imagen no encontrada")
                return
            
            # Determinar tipo de contenido
            content_type = 'application/octet-stream'
            if filename.lower().endswith('.png'):
                content_type = 'image/png'
            elif filename.lower().endswith('.gif'):
                content_type = 'image/gif'
            
            with open(found_file, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            self.send_error(500, f"Error: {str(e)}")
    
    def send_latest_image(self):
        """Envía la imagen más reciente del radar"""
        try:
            # Buscar el archivo más reciente en todas las carpetas de fechas
            latest_file = None
            latest_time = 0
            
            for date_dir in self.radar_data_path.iterdir():
                if date_dir.is_dir() and re.match(r'\d{4}-\d{2}-\d{2}', date_dir.name):
                    for pattern in ['*.png', '*.gif']:
                        for file_path in date_dir.glob(pattern):
                            if file_path.is_file():
                                mtime = file_path.stat().st_mtime
                                if mtime > latest_time:
                                    latest_time = mtime
                                    latest_file = file_path
            
            if not latest_file:
                self.send_json_response({'error': 'No hay imágenes disponibles'}, 404)
                return
            
            # Determinar tipo de contenido
            content_type = 'image/png'
            if latest_file.name.lower().endswith('.gif'):
                content_type = 'image/gif'
            
            with open(latest_file, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            self.send_error(500, f"Error: {str(e)}")
    
    def send_json_response(self, data, status=200):
        """Envía una respuesta JSON"""
        json_data = json.dumps(data, indent=2).encode('utf-8')
        
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(json_data)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json_data)
    
    def log_message(self, format, *args):
        """Personalizar mensajes de log"""
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")

class RadarServer:
    def __init__(self, data_path, port=8080):
        self.data_path = Path(data_path)
        self.port = port
        self.server = None
        
    def start(self):
        """Inicia el servidor HTTP"""
        if not self.data_path.exists():
            print(f"Error: El directorio de datos {self.data_path} no existe")
            return False
        
        # Crear handler personalizado
        def handler(*args, **kwargs):
            return RadarHTTPHandler(*args, radar_data_path=self.data_path, **kwargs)
        
        try:
            self.server = HTTPServer(('0.0.0.0', self.port), handler)
            print(f"Servidor de radar iniciado en puerto {self.port}")
            print(f"Directorio de datos: {self.data_path}")
            print(f"Acceso: http://localhost:{self.port}")
            print(f"API endpoints:")
            print(f"  - http://localhost:{self.port}/api/radar/index")
            print(f"  - http://localhost:{self.port}/api/radar/latest")
            print(f"  - http://localhost:{self.port}/api/radar/image/<filename>")
            print(f"  - http://localhost:{self.port}/<YYYY-MM-DD>/<filename>")
            print("\nPresiona Ctrl+C para detener el servidor")
            
            self.server.serve_forever()
            
        except KeyboardInterrupt:
            print("\nDeteniendo servidor...")
            self.stop()
        except Exception as e:
            print(f"Error iniciando servidor: {e}")
            return False
        
        return True
    
    def stop(self):
        """Detiene el servidor"""
        if self.server:
            self.server.shutdown()
            self.server.server_close()
            print("Servidor detenido")

def main():
    parser = argparse.ArgumentParser(description='Servidor HTTP para datos de radar')
    parser.add_argument('--data-path', required=True, help='Ruta a los datos de radar')
    parser.add_argument('--port', type=int, default=8080, help='Puerto del servidor')
    
    args = parser.parse_args()
    
    server = RadarServer(args.data_path, args.port)
    server.start()

if __name__ == "__main__":
    main()