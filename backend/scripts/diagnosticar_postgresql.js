const db = require('../services/db');

/**
 * Diagnóstico de conexión a PostgreSQL
 * Verifica si PostgreSQL está configurado y accesible
 */
async function diagnosticarPostgreSQL() {
    console.log('=== DIAGNÓSTICO DE POSTGRESQL ===\n');

    // 1. Verificar configuración
    console.log('1. Verificando configuración del .env...');
    const configured = db.isConfigured();

    if (!configured) {
        console.error('❌ PostgreSQL NO está configurado en .env');
        console.log('\nAgrega estas variables a tu archivo .env:');
        console.log('  DB_HOST=localhost');
        console.log('  DB_PORT=5432');
        console.log('  DB_USER=postgres');
        console.log('  DB_PASSWORD=tu_password');
        console.log('  DB_NAME=radar_metadata');
        return false;
    }

    console.log('✓ Configuración encontrada en .env');
    console.log(`  DB_HOST: ${process.env.DB_HOST}`);
    console.log(`  DB_PORT: ${process.env.DB_PORT}`);
    console.log(`  DB_NAME: ${process.env.DB_NAME}`);
    console.log(`  DB_USER: ${process.env.DB_USER}\n`);

    // 2. Intentar conexión
    console.log('2. Intentando conectar a PostgreSQL...');

    try {
        const pool = db.getPool();
        if (!pool) {
            console.error('❌ No se pudo crear el pool de conexiones');
            return false;
        }

        const result = await pool.query('SELECT version(), current_database(), current_user');

        console.log('✅ CONEXIÓN EXITOSA\n');
        console.log('Información del servidor:');
        console.log(`  Versión: ${result.rows[0].version}`);
        console.log(`  Base de datos: ${result.rows[0].current_database}`);
        console.log(`  Usuario: ${result.rows[0].current_user}\n`);

        // 3. Verificar tablas
        console.log('3. Verificando tablas...');
        const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

        if (tablesResult.rows.length === 0) {
            console.log('⚠️  No hay tablas creadas aún');
            console.log('   Ejecuta el servidor para crear el schema automáticamente');
        } else {
            console.log(`✓ Encontradas ${tablesResult.rows.length} tablas:`);
            tablesResult.rows.forEach(row => {
                console.log(`  - ${row.table_name}`);
            });
        }

        // 4. Verificar índices
        console.log('\n4. Verificando índices optimizados...');
        const indexesResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND tablename = 'radar_products'
        AND indexname LIKE '%optimized%'
      ORDER BY indexname
    `);

        if (indexesResult.rows.length === 0) {
            console.log('⚠️  No se encontraron índices optimizados');
            console.log('   Ejecuta: node scripts/optimize_database.js');
        } else {
            console.log(`✓ Encontrados ${indexesResult.rows.length} índices optimizados:`);
            indexesResult.rows.forEach(row => {
                console.log(`  - ${row.indexname}`);
            });
        }

        // 5. Pool stats
        console.log('\n5. Estado del connection pool:');
        console.log(`  Total conexiones: ${pool.totalCount}`);
        console.log(`  Conexiones idle: ${pool.idleCount}`);
        console.log(`  Conexiones esperando: ${pool.waitingCount}\n`);

        console.log('=== DIAGNÓSTICO COMPLETADO ===');
        console.log('✅ PostgreSQL está funcionando correctamente\n');

        return true;

    } catch (error) {
        console.error('❌ ERROR AL CONECTAR A POSTGRESQL\n');
        console.error('Detalles del error:');
        console.error(`  Mensaje: ${error.message}`);
        console.error(`  Código: ${error.code || 'N/A'}\n`);

        if (error.code === 'ECONNREFUSED') {
            console.error('💡 SOLUCIÓN:');
            console.error('  PostgreSQL no está corriendo. Inicialo con:');
            console.error('  - Windows: Busca "Services" → PostgreSQL → Start');
            console.error('  - O usa pg_ctl: pg_ctl start -D "C:\\Program Files\\PostgreSQL\\XX\\data"');
        } else if (error.code === '28P01') {
            console.error('💡 SOLUCIÓN:');
            console.error('  Contraseña incorrecta. Verifica DB_PASSWORD en .env');
        } else if (error.code === '3D000') {
            console.error('💡 SOLUCIÓN:');
            console.error(`  La base de datos "${process.env.DB_NAME}" no existe.`);
            console.error('  Créala con: CREATE DATABASE radar_metadata;');
        } else {
            console.error('💡 Verifica que:');
            console.error('  1. PostgreSQL esté instalado');
            console.error('  2. El servicio esté corriendo');
            console.error('  3. Las credenciales en .env sean correctas');
        }

        return false;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    require('dotenv').config();

    diagnosticarPostgreSQL()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Error fatal:', error);
            process.exit(1);
        });
}

module.exports = { diagnosticarPostgreSQL };
