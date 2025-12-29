#!/usr/bin/env python3
"""
Servidor HTTP simple para servir imágenes de radar convertidas
y datos en tiempo real desde una PC remota
"""

import os
import sys
import json
import time
import glob
import threading
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
        if path == '/api/radar/index':
            self.send_radar_index()
        # Endpoint para obtener imagen específica
        elif path.startswith('/api/radar/image/'):
            self.send_radar_image(path)
        # Endpoint para obtener última imagen
        elif path == '/api/radar/latest':
            self.send_latest_image()
        # Servir archivos estáticos
        else:
            super().do_GET()
    
    def send_radar_index(self):
        """Envía el índice de archivos de radar disponibles"""
        try:
            index_file = self.radar_data_path / 'index.json'
            if index_file.exists():
                with open(index_file, 'r') as f:
                    data = json.load(f)
                self.send_json_response(data)
            else:
                self.send_json_response({'error': 'No hay datos disponibles'}, 404)
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def send_radar_image(self, path):
        """Envía una imagen específica del radar"""
        try:
            # Extraer nombre del archivo de la URL
            filename = path.split('/')[-1]
            image_path = self.radar_data_path / filename
            
            if image_path.exists() and image_path.suffix.lower() == '.png':
                with open(image_path, 'rb') as f:
                    content = f.read()
                
                self.send_response(200)
                self.send_header('Content-Type', 'image/png')
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, "Imagen no encontrada")
        except Exception as e:
            self.send_error(500, f"Error: {str(e)}")
    
    def send_latest_image(self):
        """Envía la imagen más reciente del radar"""
        try:
            # Buscar el archivo PNG más reciente
            png_files = list(self.radar_data_path.glob('*.png'))
            if not png_files:
                self.send_json_response({'error': 'No hay imágenes disponibles'}, 404)
                return
            
            # Ordenar por fecha de modificación
            latest_file = max(png_files, key=lambda x: x.stat().st_mtime)
            
            with open(latest_file, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'image/png')
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
