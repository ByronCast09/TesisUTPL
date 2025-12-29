#!/usr/bin/env node
/**
 * Script para forzar la resincronización completa de PNGs de LOXX
 * Esto limpia el estado de sincronización y fuerza que todas las imágenes
 * se descarguen nuevamente desde la PC remota, actualizando las imágenes
 * reprocesadas con los nuevos colores.
 */

require('dotenv').config();
const PNGSyncService = require('../services/pngSyncService');
const path = require('path');
const fs = require('fs');

async function forzarResincronizacion() {
  const radarId = 'LOXX';
  
  console.log('='.repeat(60));
  console.log('FORZAR RESINCRONIZACIÓN COMPLETA - LOXX');
  console.log('='.repeat(60));
  console.log('');
  
  // Verificar configuración
  const radarUrl = process.env[`RADAR_${radarId}_URL`];
  if (!radarUrl) {
    console.error(`ERROR: RADAR_${radarId}_URL no está configurado en .env`);
    console.error('Por favor, agrega:');
    console.error(`RADAR_${radarId}_URL=http://IP_REMOTA:8080`);
    process.exit(1);
  }
  
  console.log(`Radar: ${radarId}`);
  console.log(`URL remota: ${radarUrl}`);
  console.log('');
  
  // Crear servicio de sincronización
  const syncService = new PNGSyncService({
    radarId,
    syncInterval: 300000, // 5 minutos
  });
  
  // Limpiar estado de sincronización
  console.log('Limpiando estado de sincronización...');
  syncService.clearSyncState();
  console.log('✓ Estado limpiado');
  console.log('');
  
  // Forzar sincronización inmediata
  console.log('Iniciando sincronización completa...');
  console.log('Esto descargará TODAS las imágenes desde la PC remota');
  console.log('y reemplazará las existentes en PostgreSQL');
  console.log('');
  
  try {
    await syncService.performSync();
    console.log('');
    console.log('='.repeat(60));
    console.log('✓ RESINCRONIZACIÓN COMPLETADA');
    console.log('='.repeat(60));
    console.log('');
    console.log('Las imágenes reprocesadas ahora están actualizadas en PostgreSQL.');
    console.log('Refresca el visor para ver los cambios.');
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('✗ ERROR EN RESINCRONIZACIÓN');
    console.error('='.repeat(60));
    console.error(error.message);
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  forzarResincronizacion()
    .then(() => {
      console.log('');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { forzarResincronizacion };

