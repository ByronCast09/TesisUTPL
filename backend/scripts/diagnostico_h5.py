#!/usr/bin/env python3
"""
Script de diagnóstico para ver valores crudos del H5
"""
import h5py
import numpy as np
import gzip
import io
import sys

def inspect_h5(h5_path):
    print(f"\n{'='*60}")
    print(f"Inspeccionando: {h5_path}")
    print(f"{'='*60}\n")
    
    # Abrir archivo (si es .gz, descomprimir primero)
    if h5_path.endswith('.gz'):
        print("Descomprimiendo .gz...")
        with gzip.open(h5_path, 'rb') as gz:
            h5_buffer = io.BytesIO(gz.read())
    else:
        h5_buffer = h5_path
    
    with h5py.File(h5_buffer, 'r') as h5file:
        # Inspeccionar data2 de todos los datasets
        for ds_num in range(1, 6):
            path = f"dataset{ds_num}/data2/data"
            if path not in h5file:
                print(f"❌ {path} no encontrado")
                continue
            
            data = h5file[path][...]
            if data.ndim == 3:
                data = data[-1]  # Último frame
            
            print(f"\n📊 {path}:")
            print(f"   Shape: {data.shape}")
            print(f"   Dtype: {data.dtype}")
            
            # Estadísticas básicas
            valid = data[~np.isnan(data)]
            if len(valid) == 0:
                print("   ⚠️  Todos los valores son NaN")
                continue
            
            print(f"   Min: {np.min(valid):.2f}")
            print(f"   Max: {np.max(valid):.2f}")
            print(f"   Mean: {np.mean(valid):.2f}")
            print(f"   Median: {np.median(valid):.2f}")
            
            # Histograma de valores
            print(f"\n   Distribución de valores:")
            if np.max(valid) > 100:
                print("   ⚠️  ADVERTENCIA: Valores >100 detectados (posible problema de calibración)")
                print(f"   Valores >100: {np.sum(valid > 100)} de {len(valid)} ({100*np.sum(valid > 100)/len(valid):.1f}%)")
            
            # Rangos típicos de dBZ
            print(f"   < 0 dBZ:    {np.sum(valid < 0)} ({100*np.sum(valid < 0)/len(valid):.1f}%)")
            print(f"   0-10 dBZ:   {np.sum((valid >= 0) & (valid < 10))} ({100*np.sum((valid >= 0) & (valid < 10))/len(valid):.1f}%)")
            print(f"   10-30 dBZ:  {np.sum((valid >= 10) & (valid < 30))} ({100*np.sum((valid >= 10) & (valid < 30))/len(valid):.1f}%)")
            print(f"   30-50 dBZ:  {np.sum((valid >= 30) & (valid < 50))} ({100*np.sum((valid >= 30) & (valid < 50))/len(valid):.1f}%)")
            print(f"   50-60 dBZ:  {np.sum((valid >= 50) & (valid < 60))} ({100*np.sum((valid >= 50) & (valid < 60))/len(valid):.1f}%)")
            print(f"   > 60 dBZ:   {np.sum(valid >= 60)} ({100*np.sum(valid >= 60)/len(valid):.1f}%)")
            
            # Verificar atributos de calibración
            try:
                what_path = f"dataset{ds_num}/data2/what"
                if what_path in h5file:
                    what = h5file[what_path]
                    print(f"\n   Atributos de calibración:")
                    if 'gain' in what.attrs:
                        print(f"   gain: {what.attrs['gain']}")
                    if 'offset' in what.attrs:
                        print(f"   offset: {what.attrs['offset']}")
                    if 'nodata' in what.attrs:
                        print(f"   nodata: {what.attrs['nodata']}")
                    if 'undetect' in what.attrs:
                        print(f"   undetect: {what.attrs['undetect']}")
            except Exception as e:
                print(f"   No se pudieron leer atributos: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python diagnostico_h5.py <archivo.h5.gz>")
        print("Ejemplo: python diagnostico_h5.py F:\\LOXX\\H5\\1003_20251007_035000.h5.gz")
        sys.exit(1)
    
    inspect_h5(sys.argv[1])
