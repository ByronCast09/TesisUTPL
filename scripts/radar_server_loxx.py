#!/usr/bin/env python3
"""
Servidor HTTP para servir imágenes PNG del radar LOXX convertidas desde archivos H5 comprimidos.
Similar a radar_server.py pero específico para LOXX con estructura de fechas.
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
from urllib.parse import urlparse, parse_qs, unquote
import posixpath
import socketserver
import argparse


class LOXXRadarHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, radar_data_path=None, **kwargs):
        self.radar_data_path = radar_data_path
        super().__init__(*args, **kwargs)
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    
    def do_GET(self):
        """Maneja las peticiones GET"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        try:
            # Endpoint para obtener índice de archivos
            if path == '/api/radar/index' or path == '/index.json' or path == '/index':
                self.send_radar_index()
            # Endpoint para obtener imagen específica
            elif path.startswith('/api/radar/image/'):
                self.send_radar_image(path)
            # Endpoint para obtener última imagen
            elif path == '/api/radar/latest':
                self.send_latest_image()
            # Endpoint para servir archivos por fecha
            elif path.startswith('/') and len([p for p in path.split('/') if p]) == 2:
                # Formato: /YYYY-MM-DD/filename.png
                self.send_file_by_date(path)
            # Servir archivos estáticos
            else:
                super().do_GET()
        except ConnectionAbortedError:
            # El cliente cerró la conexión antes de terminar - esto es normal con timeouts
            # No hacer nada, solo ignorar el error
            pass
        except Exception as e:
            # Log del error pero no crashear el servidor
            print(f"[ERROR] Error procesando petición {path}: {e}")
            try:
                self.send_error(500, f"Error interno: {str(e)}")
            except:
                pass  # Si no se puede enviar el error, ignorar
    
    def translate_path(self, path):
        """Reimplementa translate_path para servir desde radar_data_path"""
        path = urlparse(path).path
        path = posixpath.normpath(unquote(path))
        words = path.split('/')
        words = [word for word in words if word and word not in ('.', '..')]
        resolved_path = self.radar_data_path
        for word in words:
            resolved_path = resolved_path / word
        return str(resolved_path)
    
    def build_index(self):
        """Construye el índice de archivos organizados por fecha"""
        index = {"dates": {}}
        
        if not self.radar_data_path.exists():
            return index
        
        # Buscar todos los PNGs y organizarlos por fecha
        for png_file in self.radar_data_path.rglob('*.png'):
            # Intentar extraer fecha del nombre del archivo o del directorio
            date_str = None
            
            # Formato: LOXX_YYYYMMDD_HHMMSS.png
            if '_' in png_file.stem:
                parts = png_file.stem.split('_')
                if len(parts) >= 2:
                    date_part = parts[1]  # YYYYMMDD
                    if len(date_part) == 8 and date_part.isdigit():
                        date_str = f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}"
            
            # Si no se encuentra en el nombre, usar el directorio padre
            if not date_str:
                # Buscar directorio con formato YYYY-MM-DD
                for parent in png_file.parents:
                    if parent.name and len(parent.name) == 10 and parent.name.count('-') == 2:
                        try:
                            datetime.strptime(parent.name, '%Y-%m-%d')
                            date_str = parent.name
                            break
                        except ValueError:
                            continue
            
            # Si aún no se encuentra, usar fecha de modificación
            if not date_str:
                date_str = datetime.fromtimestamp(png_file.stat().st_mtime).strftime('%Y-%m-%d')
            
            if date_str not in index["dates"]:
                index["dates"][date_str] = []
            
            # Agregar archivo al índice
            relative_path = png_file.relative_to(self.radar_data_path)
            file_entry = {
                "file": relative_path.name,
                "url": f"/{date_str}/{relative_path.name}",
                "size": png_file.stat().st_size
            }
            index["dates"][date_str].append(file_entry)
        
        # Ordenar archivos por nombre (timestamp) dentro de cada fecha
        for date in index["dates"]:
            index["dates"][date].sort(key=lambda x: x["file"])
        
        return index
    
    def send_radar_index(self):
        """Envía el índice de archivos de radar disponibles"""
        try:
            index = self.build_index()
            self.send_json_response(index)
        except Exception as e:
            self.send_json_response({'error': str(e)}, 500)
    
    def send_file_by_date(self, path):
        """Sirve un archivo desde una ruta con fecha: /YYYY-MM-DD/filename.png"""
        try:
            parts = path.strip('/').split('/')
            if len(parts) == 2:
                date_str, filename = parts
                # Buscar el archivo en el directorio de la fecha o en cualquier lugar
                file_path = self.radar_data_path / date_str / filename
                if not file_path.exists():
                    # Buscar recursivamente
                    file_path = None
                    for png_file in self.radar_data_path.rglob(filename):
                        file_path = png_file
                        break
                
                if file_path and file_path.exists() and file_path.suffix.lower() == '.png':
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/png')
                    self.send_header('Content-Length', str(len(content)))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(content)
                    return
            
            self.send_error(404, "Archivo no encontrado")
        except Exception as e:
            self.send_error(500, f"Error: {str(e)}")
    
    def send_radar_image(self, path):
        """Envía una imagen específica del radar"""
        try:
            filename = path.split('/')[-1]
            # Buscar el archivo recursivamente
            image_path = None
            for png_file in self.radar_data_path.rglob(filename):
                image_path = png_file
                break
            
            if image_path and image_path.exists() and image_path.suffix.lower() == '.png':
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
            png_files = list(self.radar_data_path.rglob('*.png'))
            if not png_files:
                self.send_json_response({'error': 'No hay imágenes disponibles'}, 404)
                return
            
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
        try:
            json_data = json.dumps(data, indent=2).encode('utf-8')
            
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(json_data)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json_data)
        except ConnectionAbortedError:
            # Cliente cerró la conexión - ignorar silenciosamente
            pass
        except BrokenPipeError:
            # Pipe roto - cliente desconectado
            pass
    
    def log_message(self, format, *args):
        """Personalizar mensajes de log"""
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")


class LOXXRadarServer:
    def __init__(self, data_path, port=8080):
        self.data_path = Path(data_path)
        self.port = port
        self.server = None
        
    def start(self):
        """Inicia el servidor HTTP"""
        if not self.data_path.exists():
            print(f"Error: El directorio de datos {self.data_path} no existe")
            return False
        
        def handler(*args, **kwargs):
            return LOXXRadarHTTPHandler(*args, radar_data_path=self.data_path, **kwargs)
        
        try:
            self.server = HTTPServer(('0.0.0.0', self.port), handler)
            print(f"Servidor LOXX iniciado en puerto {self.port}")
            print(f"Directorio de datos: {self.data_path}")
            print(f"Acceso: http://localhost:{self.port}")
            print(f"API endpoints:")
            print(f"  - http://localhost:{self.port}/api/radar/index")
            print(f"  - http://localhost:{self.port}/api/radar/latest")
            print(f"  - http://localhost:{self.port}/YYYY-MM-DD/filename.png")
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
    parser = argparse.ArgumentParser(description='Servidor HTTP para datos del radar LOXX')
    parser.add_argument('--data-path', required=True, help='Ruta a los PNGs convertidos')
    parser.add_argument('--port', type=int, default=8080, help='Puerto del servidor')
    
    args = parser.parse_args()
    
    server = LOXXRadarServer(args.data_path, args.port)
    server.start()


if __name__ == "__main__":
    main()

