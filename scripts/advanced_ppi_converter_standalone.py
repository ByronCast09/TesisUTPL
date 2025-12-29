#!/usr/bin/env python3
"""
Conversor avanzado de archivos PPI a PNG con transparencia
Maneja diferentes formatos de archivos PPI y crea imágenes optimizadas para Leaflet.js
"""

import os
import sys
import json
import time
import glob
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import struct
import math

class AdvancedPPIConverter:
    def __init__(self, data_path, output_path, radar_id="LGUAXX"):
        self.data_path = Path(data_path)
        self.output_path = Path(output_path)
        self.radar_id = radar_id
        self.radar_center = (-0.2, -78.5)  # Coordenadas del radar LGUAXX
        self.range_km = 100  # Rango del radar en km
        
        # Crear directorio de salida si no existe
        self.output_path.mkdir(parents=True, exist_ok=True)
        
        # Configuración de colores para dBZ
        self.dbz_colors = {
            (0, 5): (0, 0, 0, 0),      # Transparente
            (5, 10): (0, 255, 0, 100),   # Verde muy ligero
            (10, 15): (50, 255, 0, 120),  # Verde
            (15, 20): (100, 255, 0, 140), # Verde amarillento
            (20, 25): (150, 255, 0, 160), # Amarillo verdoso
            (25, 30): (255, 255, 0, 180), # Amarillo
            (30, 35): (255, 200, 0, 200), # Amarillo naranja
            (35, 40): (255, 150, 0, 220), # Naranja
            (40, 45): (255, 100, 0, 240), # Naranja rojizo
            (45, 50): (255, 50, 0, 255),  # Rojo
            (50, 55): (255, 0, 100, 255), # Rojo magenta
            (55, 60): (255, 0, 200, 255), # Magenta
            (60, 100): (200, 0, 255, 255) # Magenta púrpura
        }
    
    def detect_ppi_format(self, file_path):
        """
        Detecta el formato del archivo PPI
        """
        try:
            with open(file_path, 'rb') as f:
                # Leer los primeros bytes para detectar formato
                header = f.read(64)
                
                # Verificar si es un archivo de texto (ASCII)
                try:
                    header.decode('ascii')
                    return 'ascii'
                except:
                    pass
                
                # Verificar si es binario con header específico
                if header.startswith(b'PPI') or header.startswith(b'RADAR'):
                    return 'binary_header'
                
                # Asumir formato binario simple
                return 'binary'
                
        except Exception as e:
            print(f"Error detectando formato de {file_path}: {e}")
            return 'unknown'
    
    def read_ascii_ppi(self, file_path):
        """
        Lee archivo PPI en formato ASCII
        """
        try:
            data = []
            with open(file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        try:
                            value = float(line)
                            data.append(value)
                        except ValueError:
                            continue
            
            return np.array(data) if data else None
            
        except Exception as e:
            print(f"Error leyendo ASCII PPI {file_path}: {e}")
            return None
    
    def read_binary_ppi(self, file_path):
        """
        Lee archivo PPI en formato binario
        """
        try:
            with open(file_path, 'rb') as f:
                # Leer todo el archivo
                data = f.read()
                
                # Intentar diferentes formatos
                formats = ['f', 'd', 'h', 'i']  # float32, float64, int16, int32
                
                for fmt in formats:
                    try:
                        size = struct.calcsize(fmt)
                        if len(data) % size == 0:
                            values = struct.unpack(fmt * (len(data) // size), data)
                            return np.array(values)
                    except:
                        continue
                
                # Si nada funciona, intentar como bytes individuales
                return np.array([b for b in data])
                
        except Exception as e:
            print(f"Error leyendo binary PPI {file_path}: {e}")
            return None
    
    def read_ppi_file(self, file_path):
        """
        Lee un archivo PPI detectando automáticamente el formato
        """
        format_type = self.detect_ppi_format(file_path)
        
        if format_type == 'ascii':
            return self.read_ascii_ppi(file_path)
        elif format_type in ['binary', 'binary_header']:
            return self.read_binary_ppi(file_path)
        else:
            print(f"Formato desconocido para {file_path}")
            return None
    
    def dbz_to_color(self, dbz_value):
        """
        Convierte valor dBZ a color RGBA usando la configuración de colores
        """
        for (min_dbz, max_dbz), color in self.dbz_colors.items():
            if min_dbz <= dbz_value < max_dbz:
                return color
        
        # Para valores fuera del rango
        if dbz_value >= 60:
            return self.dbz_colors[(60, 100)]
        else:
            return self.dbz_colors[(0, 5)]  # Transparente
    
    def create_radar_image(self, data, timestamp, size=512):
        """
        Crea una imagen PNG del radar con transparencia
        """
        # Crear imagen con canal alpha
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        
        if data is None or len(data) == 0:
            return img
        
        # Procesar datos
        # Asumir que los datos están en formato de rayos radiales
        num_rays = 360  # 360 grados
        num_gates = min(len(data) // num_rays, size // 2) if len(data) >= num_rays else len(data)
        
        # Crear array de píxeles
        pixels = np.zeros((size, size, 4), dtype=np.uint8)
        
        # Procesar cada rayo
        for ray in range(num_rays):
            angle = math.radians(ray)
            
            for gate in range(num_gates):
                if ray * num_gates + gate < len(data):
                    dbz_value = data[ray * num_gates + gate]
                    
                    # Convertir a color
                    color = self.dbz_to_color(dbz_value)
                    if color[3] > 0:  # Solo si no es transparente
                        # Calcular posición
                        distance = (gate / num_gates) * (size // 2)
                        x = int(size // 2 + distance * math.cos(angle))
                        y = int(size // 2 + distance * math.sin(angle))
                        
                        # Verificar límites
                        if 0 <= x < size and 0 <= y < size:
                            pixels[y, x] = color
        
        # Aplicar suavizado para mejor apariencia
        img_array = Image.fromarray(pixels, 'RGBA')
        
        # Aplicar filtro de suavizado
        img_array = img_array.filter(ImageFilter.GaussianBlur(radius=1))
        
        return img_array
    
    def process_date_folder(self, date_folder):
        """
        Procesa todos los archivos .ppi de una carpeta de fecha
        """
        date_path = self.data_path / date_folder
        if not date_path.exists():
            return []
        
        # Buscar archivos .ppi
        ppi_files = list(date_path.glob("*.ppi"))
        if not ppi_files:
            print(f"No se encontraron archivos .ppi en {date_path}")
            return []
        
        converted_files = []
        
        for ppi_file in ppi_files:
            try:
                print(f"Procesando: {ppi_file.name}")
                
                # Leer datos del archivo PPI
                data = self.read_ppi_file(ppi_file)
                if data is None:
                    print(f"  No se pudieron leer datos de {ppi_file.name}")
                    continue
                
                # Crear imagen
                img = self.create_radar_image(data, ppi_file.stem)
                
                # Guardar como PNG
                output_file = self.output_path / f"{self.radar_id}_{ppi_file.stem}.png"
                img.save(output_file, "PNG")
                
                converted_files.append({
                    'filename': output_file.name,
                    'timestamp': ppi_file.stem,
                    'size': output_file.stat().st_size,
                    'date': date_folder
                })
                
                print(f"  Convertido: {ppi_file.name} -> {output_file.name}")
                
            except Exception as e:
                print(f"  Error procesando {ppi_file.name}: {e}")
                continue
        
        return converted_files
    
    def create_index_file(self, all_files):
        """
        Crea archivo índice JSON con todos los archivos convertidos
        """
        # Agrupar por fecha
        files_by_date = {}
        for file_info in all_files:
            date = file_info['date']
            if date not in files_by_date:
                files_by_date[date] = []
            files_by_date[date].append(file_info)
        
        index_data = {
            'radar_id': self.radar_id,
            'last_updated': datetime.now().isoformat(),
            'total_files': len(all_files),
            'dates': files_by_date,
            'files': all_files
        }
        
        index_file = self.output_path / 'index.json'
        with open(index_file, 'w') as f:
            json.dump(index_data, f, indent=2)
        
        print(f"Índice creado: {index_file}")
        return index_file
    
    def run_conversion(self):
        """
        Ejecuta la conversión completa
        """
        print(f"Iniciando conversión avanzada de datos PPI para {self.radar_id}")
        print(f"Directorio de datos: {self.data_path}")
        print(f"Directorio de salida: {self.output_path}")
        
        all_files = []
        
        # Buscar carpetas de fechas
        date_folders = [d for d in self.data_path.iterdir() if d.is_dir()]
        date_folders.sort()
        
        if not date_folders:
            print("No se encontraron carpetas de fechas")
            return []
        
        for date_folder in date_folders:
            print(f"\nProcesando fecha: {date_folder.name}")
            files = self.process_date_folder(date_folder.name)
            all_files.extend(files)
        
        # Crear archivo índice
        if all_files:
            self.create_index_file(all_files)
            print(f"\nConversión completada. {len(all_files)} archivos procesados.")
        else:
            print("\nNo se encontraron archivos para convertir.")
        
        return all_files

def main():
    parser = argparse.ArgumentParser(description='Convertir archivos PPI a PNG para radar')
    parser.add_argument('--data-path', required=True, help='Ruta a los datos PPI')
    parser.add_argument('--output-path', required=True, help='Ruta de salida para PNGs')
    parser.add_argument('--radar-id', default='LGUAXX', help='ID del radar')
    
    args = parser.parse_args()
    
    converter = AdvancedPPIConverter(
        data_path=args.data_path,
        output_path=args.output_path,
        radar_id=args.radar_id
    )
    
    converter.run_conversion()

if __name__ == "__main__":
    main()
