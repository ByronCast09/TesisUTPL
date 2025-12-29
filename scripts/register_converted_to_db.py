# scripts/register_converted_to_db.py
import argparse, json
from datetime import datetime
from pathlib import Path

import psycopg
from tqdm import tqdm

SQL_UPSERT_RADAR = """
INSERT INTO radars (radar_id, display_name, description, updated_at)
VALUES (%s, %s, %s, NOW())
ON CONFLICT (radar_id)
DO UPDATE SET
  display_name = COALESCE(EXCLUDED.display_name, radars.display_name),
  description = COALESCE(EXCLUDED.description, radars.description),
  updated_at = NOW();
"""

SQL = """
INSERT INTO radar_products (
  radar_id, product_type, filename, storage_path, public_url,
  source_timestamp, processed_at, file_size, checksum,
  metadata, raw_source, status
)
VALUES (%(radar_id)s, %(product_type)s, %(filename)s, %(storage_path)s, %(public_url)s,
        %(source_timestamp)s, NOW(), %(file_size)s, %(checksum)s,
        %(metadata)s::jsonb, %(raw_source)s::jsonb, %(status)s)
ON CONFLICT (radar_id, product_type, source_timestamp, filename)
DO UPDATE SET
  storage_path = EXCLUDED.storage_path,
  public_url   = COALESCE(EXCLUDED.public_url, radar_products.public_url),
  file_size    = COALESCE(EXCLUDED.file_size, radar_products.file_size),
  checksum     = COALESCE(EXCLUDED.checksum, radar_products.checksum),
  metadata     = COALESCE(EXCLUDED.metadata, radar_products.metadata),
  raw_source   = COALESCE(EXCLUDED.raw_source, radar_products.raw_source),
  status       = COALESCE(EXCLUDED.status, radar_products.status),
  processed_at = NOW();
"""

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--local-dir", required=True)
    parser.add_argument("--db-url", default="postgres://postgres:byronPost@localhost:5432/radar_metadata")
    parser.add_argument("--radar-id", default="LGUAXX")
    parser.add_argument("--public-url-base", help="Ej: http://100.88.71.120:8080/")
    args = parser.parse_args()

    root = Path(args.local_dir)
    public_base = args.public_url_base.rstrip("/") if args.public_url_base else None

    rows = []
    for json_path in root.rglob("*.json"):
        with open(json_path, "r", encoding="utf-8") as fh:
            metadata = json.load(fh)

        png_path = json_path.with_suffix(".png")
        if not png_path.exists():
            continue

        try:
            file_size = png_path.stat().st_size
        except OSError:
            file_size = None

        source_timestamp = metadata.get("timestamp") or metadata.get("sourceTimestamp")
        if not source_timestamp:
            continue
        try:
            source_ts = datetime.fromisoformat(source_timestamp)
        except Exception:
            # Intentar normalizar timestamp (algunos vienen sin ":" en la zona horaria)
            try:
                normalized = source_timestamp.replace(" ", "T")
                source_ts = datetime.fromisoformat(normalized)
            except Exception:
                continue

        public_url = None
        if public_base:
            public_url = f"{public_base}/{json_path.parent.name}/{png_path.name}"

        rows.append({
            "radar_id": metadata.get("radarId") or args.radar_id,
            "product_type": metadata.get("productType") or "ppi_png",
            "filename": png_path.name,
            "storage_path": str(png_path),
            "public_url": public_url,
            "source_timestamp": source_ts,
            "file_size": file_size,
            "checksum": metadata.get("checksum"),
            "metadata": json.dumps(metadata, ensure_ascii=False),
            "raw_source": json.dumps(metadata.get("source", {}), ensure_ascii=False),
            "status": metadata.get("status") or "ready",
            "radar_name": metadata.get("radarName") or metadata.get("radar") or args.radar_id,
        })

    with psycopg.connect(args.db_url) as conn:
        with conn.cursor() as cur:
            ensured_radars = set()

            for row in tqdm(rows, desc="Registrando"):
                radar_id = row["radar_id"]
                if radar_id not in ensured_radars:
                    display_name = row.get("radar_name") or radar_id
                    cur.execute(SQL_UPSERT_RADAR, (radar_id, display_name, None))
                    ensured_radars.add(radar_id)

                cur.execute(SQL, row)

    print(f"{len(rows)} registros insertados/actualizados en radar_products.")

if __name__ == "__main__":
    main()