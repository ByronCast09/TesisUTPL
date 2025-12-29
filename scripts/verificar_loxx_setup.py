#!/usr/bin/env python3
"""
Script de verificación para la configuración del radar LOXX.
Verifica que todos los archivos y dependencias estén correctamente instalados.
"""

import sys
import os
from pathlib import Path

def check_python_version():
    """Verifica la versión de Python"""
    if sys.version_info < (3, 7):
        print("❌ Python 3.7+ requerido. Versión actual:", sys.version)
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    return True

def check_dependencies():
    """Verifica que las dependencias estén instaladas"""
    dependencies = {
        'h5py': 'h5py',
        'numpy': 'numpy',
        'PIL': 'pillow',
        'matplotlib': 'matplotlib'
    }
    
    missing = []
    for module, package in dependencies.items():
        try:
            __import__(module)
            print(f"✅ {package} instalado")
        except ImportError:
            print(f"❌ {package} NO instalado")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Instala las dependencias faltantes:")
        print(f"   pip install {' '.join(missing)}")
        return False
    
    return True

def check_files():
    """Verifica que los archivos necesarios existan"""
    script_dir = Path(__file__).parent
    required_files = [
        'process_loxx_h5_compressed.py',
        'radar_server_loxx.py',
        'convert_h5_to_png.py',
        'process_loxx_h5.bat',
        'start_loxx_server.bat'
    ]
    
    missing = []
    for file in required_files:
        file_path = script_dir / file
        if file_path.exists():
            print(f"✅ {file} encontrado")
        else:
            print(f"❌ {file} NO encontrado")
            missing.append(file)
    
    if missing:
        print(f"\n⚠️  Archivos faltantes: {', '.join(missing)}")
        return False
    
    return True

def check_data_directories():
    """Verifica que los directorios de datos existan"""
    input_dir = Path('F:/LOXX/H5')
    output_dir = Path('F:/LOXX/PNG_OUTPUT')
    
    if input_dir.exists():
        print(f"✅ Directorio de entrada existe: {input_dir}")
        # Contar archivos comprimidos
        compressed_files = list(input_dir.glob('*.zip')) + \
                          list(input_dir.glob('*.gz')) + \
                          list(input_dir.glob('*.tar'))
        if compressed_files:
            print(f"   Encontrados {len(compressed_files)} archivos comprimidos")
        else:
            print(f"   ⚠️  No se encontraron archivos comprimidos en {input_dir}")
    else:
        print(f"❌ Directorio de entrada NO existe: {input_dir}")
    
    if output_dir.exists():
        print(f"✅ Directorio de salida existe: {output_dir}")
        png_files = list(output_dir.rglob('*.png'))
        if png_files:
            print(f"   Encontrados {len(png_files)} archivos PNG")
        else:
            print(f"   ⚠️  No hay archivos PNG aún (ejecuta process_loxx_h5.bat)")
    else:
        print(f"⚠️  Directorio de salida NO existe: {output_dir} (se creará automáticamente)")

def main():
    print("=" * 60)
    print("Verificación de Configuración - Radar LOXX")
    print("=" * 60)
    print()
    
    checks = []
    
    print("1. Verificando versión de Python...")
    checks.append(check_python_version())
    print()
    
    print("2. Verificando dependencias Python...")
    checks.append(check_dependencies())
    print()
    
    print("3. Verificando archivos necesarios...")
    checks.append(check_files())
    print()
    
    print("4. Verificando directorios de datos...")
    check_data_directories()
    print()
    
    print("=" * 60)
    if all(checks):
        print("✅ Todas las verificaciones pasaron. Sistema listo para usar.")
        print()
        print("Próximos pasos:")
        print("1. Ejecuta: process_loxx_h5.bat (para convertir archivos)")
        print("2. Ejecuta: start_loxx_server.bat (para iniciar servidor)")
        return 0
    else:
        print("❌ Algunas verificaciones fallaron. Revisa los errores arriba.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

