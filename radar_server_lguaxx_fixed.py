#!/usr/bin/env python3
"""
Servidor HTTP para radar LGUAXX
Sirve index.json e imágenes organizadas por fecha (compatible con backend)
"""

import os
import json
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import argparse
from datetime import datetime


class LGUAXXServerHandler(SimpleHTTPRequestHandler):
    """Handler que sirve archivos desde base_path con CORS"""
    
    def __init__(self, *args, base_path=None, **kwargs):
        self.base_path = Path(base_path) if base_path else Path.cwd()
        # Cambiar al directorio base para servir archivos
        os.chdir(str(self.base_path))
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        """Maneja peticiones GET"""
        path = urlparse(self.path).path
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] GET {path}")
        
        # Endpoints de índice
        if path in ['/api/radar/index', '/index.json', '/index']:
            self.serve_index()
        # Archivos estáticos (imágenes por fecha, etc)
        else:
            super().do_GET()
    
    def serve_index(self):
        """Sirve index.json"""
        try:
            index_path = self.base_path / 'index.json'
            
            if not index_path.exists():
                self.send_error(404, f"index.json no encontrado en {self.base_path}")
                return
            
            with open(index_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            json_str = json.dumps(data, indent=2, ensure_ascii=False)
            json_bytes = json_str.encode('utf-8')
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_bytes)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(json_bytes)
            
            print(f"  ✓ Servido index.json ({len(json_bytes)} bytes)")
            
        except Exception as e:
            self.send_error(500, f"Error: {str(e)}")
            print(f"  ✗ Error: {e}")
    
    def end_headers(self):
        """Agrega headers CORS"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        """Maneja preflight CORS"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()


def main():
    parser = argparse.ArgumentParser(description='Servidor HTTP para radar LGUAXX')
    parser.add_argument('--data-path', required=True, 
                       help='Ruta base de datos (donde está index.json y carpetas YYYY-MM-DD)')
    parser.add_argument('--port', type=int, default=8080, 
                       help='Puerto del servidor (default: 8080)')
    
    args = parser.parse_args()
    data_path = Path(args.data_path)
    
    if not data_path.exists():
        print(f"❌ Error: El directorio {data_path} no existe")
        return 1
    
    # Verificar index.json
    index_path = data_path / 'index.json'
    if not index_path.exists():
        print(f"⚠️ Advertencia: {index_path} no existe")
        print(f"   Asegúrate de que convert_ppi_optimized.py haya generado el índice")
    else:
        with open(index_path, 'r') as f:
            data = json.load(f)
            dates = data.get('dates', {})
            print(f"✓ index.json encontrado ({len(dates)} fechas)")
    
    # Crear handler
    def handler(*args, **kwargs):
        return LGUAXXServerHandler(*args, base_path=data_path, **kwargs)
    
    try:
        server = HTTPServer(('0.0.0.0', args.port), handler)
        
        print(f"\n{'='*60}")
        print(f"🚀 Servidor LGUAXX iniciado")
        print(f"{'='*60}")
        print(f"📁 Directorio: {data_path}")
        print(f"🌐 Puerto: {args.port}")
        print(f"\n📡 Endpoints:")
        print(f"   http://localhost:{args.port}/index.json")
        print(f"   http://localhost:{args.port}/api/radar/index")
        print(f"   http://localhost:{args.port}/YYYY-MM-DD/filename.png")
        print(f"\n✋ Presiona Ctrl+C para detener")
        print(f"{'='*60}\n")
        
        server.serve_forever()
        
    except KeyboardInterrupt:
        print("\n\n🛑 Servidor detenido")
        return 0
    except OSError as e:
        if 'Address already in use' in str(e):
            print(f"\n❌ Error: Puerto {args.port} ya está en uso")
            print(f"   Detén el otro servidor o usa --port con un puerto diferente")
        else:
            print(f"\n❌ Error: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
