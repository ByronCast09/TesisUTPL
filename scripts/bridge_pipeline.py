import time
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(r"C:\Users\Usuario iTC\Desktop\TesisUTPL\tesis_utpl")
SYNC_CMD = [
    "python", "scripts/sync_remote_converted.py",
    "--remote-base-url", "http://100.88.71.120:8080/converted_images/LGUAXX/",
    "--local-dir", r"C:\radar_bridge\converted\LGUAXX",
]
REGISTER_CMD = [
    "python", "scripts/register_converted_to_db.py",
    "--local-dir", r"C:\radar_bridge\converted\LGUAXX",
    "--radar-id", "LGUAXX",
    "--db-url", "postgres://postgres:byronPost@localhost:5432/radar_metadata",
    "--public-url-base", "http://100.88.71.120:8080/converted_images/LGUAXX",
]

def run(cmd):
    subprocess.run(cmd, cwd=PROJECT_ROOT, check=True)

def main(interval_minutes=5):
    while True:
        try:
            print("=== Sincronizando ===")
            run(SYNC_CMD)
            print("=== Registrando en Postgres ===")
            run(REGISTER_CMD)
            print("Listo. Esperando...")

        except subprocess.CalledProcessError as exc:
            print(f"Error ejecutando {exc.cmd}: {exc}")

        time.sleep(interval_minutes * 60)

if __name__ == "__main__":
    main(interval_minutes=10)