#!/usr/bin/env python3
"""
Servidor HTTP para servir imágenes de radar LGUAXX
Compatible con el formato esperado por el backend (igual que LOXX)
"""

import os
import json
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import argparse


class LGUAXXRadarHandler(SimpleHTTPRequestHandler):
    """Handler para servir imágenes de radar en formato compatible con backend"""
    
    def __init__(self, *args, base_path=None, **kwargs):
        self.base_path = Path(base_path) if base_path else Path.cwd()
        super().__init__(*args, directory=str(self.base_path), **kwargs)
    
    def do_GET(self):
        """Maneja peticiones GET"""
        parsed = urlparse(self.path)
        path = parsed.path
        
        # Servir index.json
        if path in ['/index.json', '/api/radar/index', '/index']:
            self.serve_index()
        # Servir imágenes por fecha (formato: /YYYY-MM-DD/filename.png)
        elif path.startswith('/202') and path.endswith('.png'):
            super().do_GET()
        # Cualquier otro archivo
        else:
            super().do_GET()
    
    def serve_index(self):
        """Sirve el index.json generado por convert_ppi_optimized.py"""
        try:
            index_path = self.base_path / 'index.json'
            
            if index_path.exists():
                with open(index_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                json_str = json.dumps(data, indent=2, ensure_ascii=False)
                json_bytes = json_str.encode('utf-8')
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(json_bytes)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(json_bytes)
            else:
                self.send_error(404, "index.json no encontrado")
        except Exception as e:
            self.send_error(500, f"Error: {str(e)}")
    
    def end_headers(self):
        """Agrega headers CORS a todas las respuestas"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def log_message(self, format, *args):
        """Log personalizado"""
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {format % args}")


def main():
    parser = argparse.ArgumentParser(description='Servidor HTTP para radar LGUAXX')
    parser.add_argument('--data-path', required=True, help='Ruta base de datos (donde está index.json)')
    parser.add_argument('--port', type=int, default=8080, help='Puerto del servidor (default: 8080)')
    args = parser.parse_args()
    
    data_path = Path(args.data_path)
    
    if not data_path.exists():
        print(f"❌ Error: El directorio {data_path} no existe")
        return
    
    # Verificar que existe index.json
    index_path = data_path / 'index.json'
    if not index_path.exists():
        print(f"⚠️ Advertencia: {index_path} no existe")
        print(f"   El servidor funcionará pero no habrá índice hasta que se genere")
    
    # Crear handler con base_path
    def handler(*args, **kwargs):
        return LGUAXXRadarHandler(*args, base_path=data_path, **kwargs)
    
    try:
        server = HTTPServer(('0.0.0.0', args.port), handler)
        
        print(f"🚀 Servidor LGUAXX iniciado")
        print(f"📁 Directorio base: {data_path}")
        print(f"🌐 Puerto: {args.port}")
        print(f"\n📡 Endpoints disponibles:")
        print(f"   http://localhost:{args.port}/index.json")
        print(f"   http://localhost:{args.port}/api/radar/index")
        print(f"   http://localhost:{args.port}/YYYY-MM-DD/filename.png")
        print(f"\nPresiona Ctrl+C para detener\n")
        
        server.serve_forever()
        
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()
