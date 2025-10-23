#!/usr/bin/env python3
"""
Script para crear GIFs de prueba que simulan datos de radar
Requiere: pip install pillow numpy
"""

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import datetime
import random

def create_radar_gif(output_path, radar_id, timestamp):
    """Crea un GIF animado que simula datos de radar"""
    
    # Configuración
    width, height = 400, 400
    frames = 10
    duration = 500  # ms por frame
    
    images = []
    
    for frame in range(frames):
        # Crear imagen base
        img = Image.new('RGBA', (width, height), (0, 0, 0, 255))
        draw = ImageDraw.Draw(img)
        
        # Dibujar círculos concéntricos (rangos de radar)
        center_x, center_y = width // 2, height // 2
        for radius in [50, 100, 150, 200]:
            draw.ellipse([center_x - radius, center_y - radius, 
                         center_x + radius, center_y + radius], 
                        outline=(100, 100, 100, 255), width=1)
        
        # Simular datos de precipitación con colores
        for _ in range(random.randint(5, 20)):
            x = random.randint(50, width - 50)
            y = random.randint(50, height - 50)
            size = random.randint(10, 30)
            
            # Colores que simulan intensidad de lluvia
            intensity = random.choice([
                (0, 255, 0, 180),    # Verde - ligera
                (255, 255, 0, 180),  # Amarillo - moderada
                (255, 165, 0, 180),  # Naranja - fuerte
                (255, 0, 0, 180),    # Rojo - muy fuerte
            ])
            
            # Añadir variación por frame para animación
            x += frame * random.randint(-2, 2)
            y += frame * random.randint(-2, 2)
            
            draw.ellipse([x - size//2, y - size//2, x + size//2, y + size//2], 
                        fill=intensity)
        
        # Añadir información de texto
        try:
            font = ImageFont.load_default()
        except:
            font = None
            
        text_info = f"{radar_id} - {timestamp.strftime('%H:%M:%S')}"
        draw.text((10, 10), text_info, fill=(255, 255, 255, 255), font=font)
        
        # Añadir timestamp del frame
        frame_time = timestamp + datetime.timedelta(minutes=frame * 5)
        draw.text((10, height - 30), frame_time.strftime('%Y-%m-%d %H:%M'), 
                 fill=(255, 255, 255, 255), font=font)
        
        images.append(img)
    
    # Guardar como GIF animado
    images[0].save(
        output_path,
        save_all=True,
        append_images=images[1:],
        duration=duration,
        loop=0,
        format='GIF'
    )
    
    print(f"GIF creado: {output_path}")

def main():
    """Crear estructura de directorios y GIFs de prueba"""
    
    # Crear directorios por fecha
    base_dir = "test_radar_data"
    os.makedirs(base_dir, exist_ok=True)
    
    # Fechas de prueba (últimos 7 días)
    today = datetime.date.today()
    dates = [(today - datetime.timedelta(days=i)).strftime('%Y-%m-%d') 
             for i in range(7)]
    
    radars = ['LGUAXX', 'LGUAYY', 'LGUAZZ']
    
    for date_str in dates:
        date_dir = os.path.join(base_dir, date_str)
        os.makedirs(date_dir, exist_ok=True)
        
        # Crear 2-4 GIFs por fecha para cada radar
        for radar in radars:
            num_gifs = random.randint(2, 4)
            
            for i in range(num_gifs):
                # Timestamp base para el día
                base_time = datetime.datetime.strptime(date_str, '%Y-%m-%d')
                gif_time = base_time + datetime.timedelta(hours=i*6, minutes=random.randint(0, 59))
                
                filename = f"{radar}_{gif_time.strftime('%H%M')}.gif"
                filepath = os.path.join(date_dir, filename)
                
                create_radar_gif(filepath, radar, gif_time)
    
    print(f"\n✅ Datos de prueba creados en: {os.path.abspath(base_dir)}")
    print("\nPara usar estos datos:")
    print("1. Copia la carpeta 'test_radar_data' a tu PC remota")
    print("2. Inicia un servidor HTTP en esa carpeta:")
    print("   python -m http.server 8080")
    print("3. Verifica que la URL en .env apunte a tu servidor")

if __name__ == "__main__":
    main()