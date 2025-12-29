# 🔌 Configuración: PC Remota → PostgreSQL en PC Local

## ✅ Confirmación

**SÍ, funciona perfectamente:**
- `ppi_auto_converter_service.py` está en la **PC REMOTA**
- PostgreSQL está en tu **PC LOCAL**
- El servicio se conecta desde la PC remota a PostgreSQL en tu PC local

---

## 📋 Pasos de Configuración

### Paso 1: Obtener la IP de tu PC Local

En tu **PC LOCAL**, abre PowerShell o CMD y ejecuta:

```bash
ipconfig
```

Busca la dirección IPv4. Ejemplos:
- Si estás en la misma red local: `192.168.1.100` o `192.168.0.50`
- Si usas Tailscale/VPN: `100.x.x.x` (como `100.124.134.19`)

**Anota esta IP** - la necesitarás en la PC remota.

---

### Paso 2: Configurar PostgreSQL para Aceptar Conexiones Remotas

En tu **PC LOCAL**:

#### 2.1 Editar `postgresql.conf`

Ubicación típica: `C:\Program Files\PostgreSQL\15\data\postgresql.conf`

Busca la línea:
```conf
listen_addresses = 'localhost'
```

Cámbiala a:
```conf
listen_addresses = '*'  # Acepta conexiones desde cualquier IP
```

O más seguro, solo desde la red local:
```conf
listen_addresses = '0.0.0.0'  # Acepta conexiones desde cualquier IP
```

#### 2.2 Editar `pg_hba.conf`

Ubicación típica: `C:\Program Files\PostgreSQL\15\data\pg_hba.conf`

Agrega al final del archivo:

```conf
# Permitir conexiones desde la PC remota
# Reemplaza IP_PC_REMOTA con la IP real de tu PC remota
host    all             all             IP_PC_REMOTA/32         md5

# O más permisivo (solo para desarrollo):
host    all             all             0.0.0.0/0               md5
```

**Ejemplo:**
```conf
# Si la PC remota tiene IP 192.168.1.50
host    all             all             192.168.1.50/32         md5

# O si usas Tailscale y la PC remota tiene IP 100.88.71.120
host    all             all             100.88.71.120/32        md5
```

#### 2.3 Reiniciar PostgreSQL

```bash
# En PowerShell como Administrador
Restart-Service postgresql-x64-15
```

O desde el Administrador de Servicios de Windows:
1. Abrir "Servicios"
2. Buscar "postgresql"
3. Clic derecho → Reiniciar

---

### Paso 3: Configurar Firewall en PC Local

En tu **PC LOCAL**, permitir conexiones al puerto 5432:

#### Opción A: Desde PowerShell (como Administrador)

```powershell
New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Allow
```

#### Opción B: Desde Windows Defender Firewall

1. Abrir "Firewall de Windows Defender con seguridad avanzada"
2. Clic en "Reglas de entrada" → "Nueva regla"
3. Tipo: Puerto
4. Protocolo: TCP
5. Puerto local específico: `5432`
6. Acción: Permitir la conexión
7. Perfiles: Marcar todos (Dominio, Privada, Pública)
8. Nombre: "PostgreSQL - Permitir desde PC Remota"

---

### Paso 4: Configurar el Script en la PC Remota

En la **PC REMOTA**, edita `iniciar_servicio_ppi.bat`:

```batch
REM PostgreSQL - CONFIGURAR CON LA IP DE TU PC LOCAL
set DB_HOST=192.168.1.100          ← CAMBIAR POR LA IP DE TU PC LOCAL
set DB_PORT=5432
set DB_USER=postgres
set DB_PASSWORD=tu_password        ← CAMBIAR POR TU PASSWORD
set DB_NAME=radar_metadata         ← O el nombre de tu base de datos
```

**Ejemplo completo:**
```batch
@echo off
REM Configuración - AJUSTA ESTAS RUTAS
set RADAR_ID=LGUAXX
set PPI_DATA_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
set PNG_OUTPUT_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX

REM PostgreSQL - IP DE TU PC LOCAL
set DB_HOST=192.168.1.100          ← TU IP LOCAL AQUÍ
set DB_PORT=5432
set DB_USER=postgres
set DB_PASSWORD=miPassword123     ← TU PASSWORD AQUÍ
set DB_NAME=radar_metadata

REM ... resto del script
```

---

### Paso 5: Probar la Conexión desde la PC Remota

En la **PC REMOTA**, prueba la conexión antes de iniciar el servicio:

```bash
# Instalar psycopg si no está instalado
pip install psycopg[binary]

# Probar conexión
python -c "import psycopg; conn = psycopg.connect('postgres://postgres:tu_password@192.168.1.100:5432/radar_metadata'); print('✓ Conexión exitosa'); conn.close()"
```

**Reemplaza:**
- `tu_password` → Tu password de PostgreSQL
- `192.168.1.100` → IP de tu PC local
- `radar_metadata` → Nombre de tu base de datos

Si ves `✓ Conexión exitosa`, ¡todo está bien configurado!

---

### Paso 6: Iniciar el Servicio en la PC Remota

En la **PC REMOTA**:

```bash
iniciar_servicio_ppi.bat
```

Deberías ver:
```
============================================================
SERVICIO AUTOMÁTICO DE CONVERSIÓN PPI → PNG
============================================================
Radar: LGUAXX
Directorio PPI: D:\Rainview-Analyzer\...
Directorio PNG: D:\Rainview-Analyzer\...
PostgreSQL: 192.168.1.100          ← Debe mostrar la IP de tu PC local
============================================================

[service] Monitoreo iniciado. Esperando nuevos archivos PPI...
```

---

## 🔍 Verificar que Funciona

### En la PC Remota:

Cuando aparezca un archivo PPI nuevo, deberías ver:
```
[watcher] Procesando nuevo archivo PPI: archivo.ppi
✓ archivo.ppi
↪ Registrado en Postgres LGUAXX_archivo.png    ← Esto confirma que subió a PostgreSQL
[watcher] ✓ Archivo procesado: archivo.ppi
```

### En la PC Local:

Verifica en PostgreSQL que los datos se están subiendo:

```sql
-- Conectar a PostgreSQL
psql -U postgres -d radar_metadata

-- Ver los últimos PNGs subidos
SELECT id, filename, source_timestamp, created_at 
FROM radar_products 
WHERE product_type = 'ppi_png' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🆘 Troubleshooting

### Error: "No se puede conectar a PostgreSQL"

**Causas posibles:**

1. **IP incorrecta**:
   - Verifica la IP de tu PC local con `ipconfig`
   - Asegúrate de usar la IP correcta en `DB_HOST`

2. **PostgreSQL no acepta conexiones remotas**:
   - Verifica `postgresql.conf`: `listen_addresses = '*'`
   - Verifica `pg_hba.conf`: Tiene regla para la IP de la PC remota
   - Reinicia PostgreSQL después de cambiar configuraciones

3. **Firewall bloqueando**:
   - Verifica que el puerto 5432 está abierto en Windows Firewall
   - Prueba desactivar temporalmente el firewall para verificar

4. **Password incorrecto**:
   - Verifica que `DB_PASSWORD` es correcto
   - Prueba conectarte desde la PC local primero

### Error: "Connection timeout"

- Verifica que ambas PCs están en la misma red
- Si usas VPN (Tailscale), verifica que ambas están conectadas
- Prueba hacer ping desde PC remota a PC local: `ping 192.168.1.100`

### Error: "Database does not exist"

- Verifica que la base de datos existe: `psql -U postgres -l`
- Crea la base de datos si no existe: `CREATE DATABASE radar_metadata;`
- Ejecuta el esquema: `psql -U postgres -d radar_metadata -f schema.sql`

---

## 📝 Resumen de Configuración

### PC LOCAL (PostgreSQL):
- [ ] PostgreSQL configurado para aceptar conexiones remotas
- [ ] `postgresql.conf`: `listen_addresses = '*'`
- [ ] `pg_hba.conf`: Regla para IP de PC remota
- [ ] Firewall: Puerto 5432 abierto
- [ ] PostgreSQL reiniciado
- [ ] IP de PC local conocida

### PC REMOTA (Servicio):
- [ ] `iniciar_servicio_ppi.bat` configurado con IP de PC local
- [ ] `DB_HOST` = IP de tu PC local
- [ ] `DB_PASSWORD` = Password correcto
- [ ] Conexión probada exitosamente
- [ ] Servicio ejecutándose

---

## 🔐 Seguridad (Opcional pero Recomendado)

Para mayor seguridad, en lugar de permitir conexiones desde cualquier IP:

1. **En `pg_hba.conf`**, solo permitir la IP específica de la PC remota:
   ```conf
   host    all             all             192.168.1.50/32         md5
   ```

2. **En Windows Firewall**, crear regla que solo permita la IP de la PC remota:
   ```powershell
   New-NetFirewallRule -DisplayName "PostgreSQL desde PC Remota" `
     -Direction Inbound -LocalPort 5432 -Protocol TCP `
     -RemoteAddress 192.168.1.50 -Action Allow
   ```

---

*Última actualización: Configuración para PC Remota → PostgreSQL en PC Local*


