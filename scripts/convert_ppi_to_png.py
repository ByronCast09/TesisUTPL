#!/usr/bin/env python3
"""
Script para convertir archivos .ppi del radar GUAXx a imágenes PNG con transparencia
para ser servidas desde una PC remota y visualizadas en el visor Leaflet.js
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
from PIL import Image, ImageDraw
import struct
import math

class PPIConverter:
    def __init__(self, data_path, output_path, radar_id="LGUAXX"):
        self.data_path = Path(data_path)
        self.output_path = Path(output_path)
        self.radar_id = radar_id
        self.radar_center = (-0.2, -78.5)  # Coordenadas del radar LGUAXX
        self.range_km = 100  # Rango del radar en km
        
        # Crear directorio de salida si no existe
        self.output_path.mkdir(parents=True, exist_ok=True)
        
    def read_ppi_file(self, file_path):
        """
        Lee un archivo .ppi y extrae los datos de reflectividad
        """
        try:
            with open(file_path, 'rb') as f:
                # Leer header del archivo PPI
                header = f.read(1024)  # Asumiendo header de 1024 bytes
                
                # Leer datos de reflectividad
                data = f.read()
                
                # Convertir datos binarios a array numpy
                # Asumiendo que los datos están en formato float32
                if len(data) % 4 == 0:
                    values = struct.unpack('f' * (len(data) // 4), data)
                    return np.array(values)
                else:
                    # Si no es float32, intentar como int16
                    if len(data) % 2 == 0:
                        values = struct.unpack('h' * (len(data) // 2), data)
                        return np.array(values)
                    else:
                        print(f"Error: No se pudo interpretar el formato de datos en {file_path}")
                        return None
                        
        except Exception as e:
            print(f"Error leyendo archivo {file_path}: {e}")
            return None
    
    def create_radar_image(self, data, timestamp):
        """
        Crea una imagen PNG del radar con transparencia
        """
        # Dimensiones de la imagen (cuadrada para radar circular)
        size = 512
        center = size // 2
        
        # Crear imagen con canal alpha
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Si no hay datos válidos, retornar imagen transparente
        if data is None or len(data) == 0:
            return img
        
        # Procesar datos de reflectividad
        # Asumir que los datos están organizados en rayos radiales
        num_rays = 360  # 360 grados
        num_gates = len(data) // num_rays if len(data) >= num_rays else len(data)
        
        # Crear grid de píxeles
        for ray in range(num_rays):
            for gate in range(num_gates):
                if ray * num_gates + gate < len(data):
                    value = data[ray * num_gates + gate]
                    
                    # Convertir dBZ a color
                    color = self.dbz_to_color(value)
                    if color is not None:
                        # Calcular posición en la imagen
                        angle = math.radians(ray)
                        distance = (gate / num_gates) * center
                        
                        x = center + distance * math.cos(angle)
                        y = center + distance * math.sin(angle)
                        
                        # Dibujar píxel
                        if 0 <= x < size and 0 <= y < size:
                            img.putpixel((int(x), int(y)), color)
        
        return img
    
    def dbz_to_color(self, dbz_value):
        """
        Convierte valor dBZ a color RGBA
        """
        # Valores de referencia para colores de radar
        if dbz_value < 5:
            return None  # Transparente para valores muy bajos
        
        # Escala de colores basada en dBZ
        if dbz_value < 10:
            return (0, 255, 0, 180)  # Verde - Muy ligera
        elif dbz_value < 20:
            return (144, 255, 0, 200)  # Verde amarillento - Ligera
        elif dbz_value < 30:
            return (255, 255, 0, 220)  # Amarillo - Moderada
        elif dbz_value < 40:
            return (255, 144, 0, 240)  # Naranja - Fuerte
        elif dbz_value < 50:
            return (255, 0, 0, 255)  # Rojo - Muy fuerte
        else:
            return (255, 0, 255, 255)  # Magenta - Extrema
    
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
            return []
        
        converted_files = []
        
        for ppi_file in ppi_files:
            try:
                # Leer datos del archivo PPI
                data = self.read_ppi_file(ppi_file)
                if data is None:
                    continue
                
                # Crear imagen
                img = self.create_radar_image(data, ppi_file.stem)
                
                # Guardar como PNG
                output_file = self.output_path / f"{self.radar_id}_{ppi_file.stem}.png"
                img.save(output_file, "PNG")
                
                converted_files.append({
                    'filename': output_file.name,
                    'timestamp': ppi_file.stem,
                    'size': output_file.stat().st_size
                })
                
                print(f"Convertido: {ppi_file.name} -> {output_file.name}")
                
            except Exception as e:
                print(f"Error procesando {ppi_file.name}: {e}")
                continue
        
        return converted_files
    
    def create_index_file(self, all_files):
        """
        Crea archivo índice JSON con todos los archivos convertidos
        """
        index_data = {
            'radar_id': self.radar_id,
            'last_updated': datetime.now().isoformat(),
            'total_files': len(all_files),
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
        print(f"Iniciando conversión de datos PPI para {self.radar_id}")
        print(f"Directorio de datos: {self.data_path}")
        print(f"Directorio de salida: {self.output_path}")
        
        all_files = []
        
        # Buscar carpetas de fechas
        date_folders = [d for d in self.data_path.iterdir() if d.is_dir()]
        date_folders.sort()
        
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
    
    converter = PPIConverter(
        data_path=args.data_path,
        output_path=args.output_path,
        radar_id=args.radar_id
    )
    
    converter.run_conversion()

if __name__ == "__main__":
    main()
