#!/usr/bin/env python3
"""
Monitor continuo para conversión automática de archivos PPI a PNG.
Ejecuta el conversor cada 5 minutos detectando nuevos archivos.
"""

import time
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# ⚡ CONFIGURACIÓN
INTERVAL_SECONDS = 300  # 5 minutos
DATA_PATH = r"D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi"
OUTPUT_PATH = r"D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX"
RADAR_ID = "LGUAXX"
DB_URL = "postgresql://postgres:byronPost@100.124.134.19:5432/radar_metadata"
PUBLIC_URL_BASE = "http://100.124.134.19:8080"
MAX_DATES = 2
MAX_FILES = 100

# Script a ejecutar
CONVERTER_SCRIPT = Path(__file__).parent / "convert_ppi_optimized.py"


def run_conversion():
    """Ejecuta el conversor una vez"""
    cmd = [
        sys.executable,  # Python interpreter
        str(CONVERTER_SCRIPT),
        "--data-path", DATA_PATH,
        "--output-path", OUTPUT_PATH,
        "--radar-id", RADAR_ID,
        "--max-dates", str(MAX_DATES),
        "--max-files", str(MAX_FILES),
        "--db-url", DB_URL,
        "--public-url-base", PUBLIC_URL_BASE,
    ]
    
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n{'='*60}")
        print(f"⚡ [{timestamp}] Iniciando conversión...")
        print(f"{'='*60}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600  # Timeout de 10 minutos
        )
        
        # Mostrar output
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr, file=sys.stderr)
        
        if result.returncode == 0:
            print(f"✅ Conversión completada exitosamente")
        else:
            print(f"⚠️ Conversión terminó con código {result.returncode}")
            
    except subprocess.TimeoutExpired:
        print("⚠️ Conversión excedió el tiempo límite de 10 minutos")
    except Exception as e:
        print(f"❌ Error ejecutando conversor: {e}")


def main():
    """Loop principal de monitoreo"""
    print("🚀 Monitor de conversión PPI → PNG iniciado")
    print(f"📁 Data path: {DATA_PATH}")
    print(f"💾 Output path: {OUTPUT_PATH}")
    print(f"🔄 Intervalo: {INTERVAL_SECONDS}s ({INTERVAL_SECONDS//60} minutos)")
    print(f"🎯 Radar ID: {RADAR_ID}")
    print(f"📊 Max fechas: {MAX_DATES}, Max archivos: {MAX_FILES}")
    print(f"\nPresiona Ctrl+C para detener\n")
    
    cycle = 1
    
    try:
        while True:
            print(f"\n{'#'*60}")
            print(f"# CICLO {cycle}")
            print(f"{'#'*60}")
            
            run_conversion()
            
            # Calcular próxima ejecución
            next_run = datetime.now().timestamp() + INTERVAL_SECONDS
            next_run_str = datetime.fromtimestamp(next_run).strftime("%H:%M:%S")
            
            print(f"\n⏰ Próxima ejecución en {INTERVAL_SECONDS}s (a las {next_run_str})")
            print(f"   Esperando...")
            
            cycle += 1
            time.sleep(INTERVAL_SECONDS)
            
    except KeyboardInterrupt:
        print("\n\n🛑 Monitor detenido por el usuario")
        print(f"Total de ciclos ejecutados: {cycle - 1}")
    except Exception as e:
        print(f"\n\n❌ Error fatal en monitor: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
