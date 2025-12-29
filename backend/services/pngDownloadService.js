const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const remoteRadarService = require('./remoteRadarService');
const radarMetadataRepository = require('./radarMetadataRepository');
const crypto = require('crypto');

/**
 * Descarga un PNG desde una URL remota y devuelve el buffer
 */
async function downloadPng(url, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Descargando PNG desde: ${url} (intento ${attempt}/${maxRetries})`);
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'arraybuffer',
        timeout: 120000, // 2 minutos para descargas grandes
        headers: {
          'Connection': 'keep-alive'
        }
      });
      return Buffer.from(response.data);
    } catch (error) {
      lastError = error;
      const isNetworkError = error.code === 'ECONNREFUSED' || 
                            error.code === 'ETIMEDOUT' || 
                            error.code === 'ENOTFOUND' ||
                            error.message.includes('timeout');
      
      if (isNetworkError && attempt < maxRetries) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000); // Backoff exponencial
        console.log(`Reintentando descarga en ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      console.error(`Error al descargar PNG desde ${url}: ${error.message}`);
      throw error;
    }
  }
  throw lastError;
}

/**
 * Calcula el checksum MD5 de un buffer
 */
function calculateChecksum(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Extrae el timestamp de un nombre de archivo PNG
 * Formato esperado: LGUAXX_20250124_120000.png o similar
 */
function extractTimestampFromFilename(filename, date) {
  try {
    // Intentar extraer timestamp del nombre del archivo
    const timestampMatch = filename.match(/(\d{8})_(\d{6})/);
    if (timestampMatch) {
      const dateStr = timestampMatch[1];
      const timeStr = timestampMatch[2];
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = timeStr.substring(0, 2);
      const minute = timeStr.substring(2, 4);
      const second = timeStr.substring(4, 6);
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
    }
    
    // Si no se encuentra, usar la fecha proporcionada
    if (date) {
      return new Date(`${date}T12:00:00Z`);
    }
    
    return new Date();
  } catch (error) {
    console.warn(`No se pudo extraer timestamp de ${filename}, usando fecha actual`);
    return new Date();
  }
}

/**
 * Descarga y guarda un PNG en PostgreSQL
 */
async function downloadAndStorePng(radarId, date, filename, url) {
  try {
    // Descargar el PNG
    const pngBuffer = await downloadPng(url);
    
    // Calcular checksum
    const checksum = calculateChecksum(pngBuffer);
    
    // Extraer timestamp
    const sourceTimestamp = extractTimestampFromFilename(filename, date);
    
    // Crear metadata
    const metadata = {
      source: 'remote',
      downloadDate: new Date().toISOString(),
      originalUrl: url,
      date,
      filename,
    };
    
    // Guardar en PostgreSQL
    const result = await radarMetadataRepository.recordProcessedFile({
      radarId: radarId.toUpperCase(),
      productType: 'ppi_png',
      timestamp: sourceTimestamp,
      storagePath: url, // Guardamos la URL como storage_path
      pngBuffer,
      publicUrl: null,
      metadata,
      rawSource: { url, date, filename },
      status: 'ready',
      fileSize: pngBuffer.length,
      checksum,
      filename,
    });
    
    console.log(`PNG guardado en PostgreSQL: ${filename} (ID: ${result?.id})`);
    return result;
  } catch (error) {
    console.error(`Error al descargar y guardar PNG ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Descarga todos los PNGs de un radar para una fecha específica
 */
async function downloadPngsForDate(radarId, date) {
  try {
    console.log(`Descargando PNGs para ${radarId} en fecha ${date}`);
    
    // Obtener lista de archivos remotos
    const allFiles = await remoteRadarService.listAllRemoteFiles(radarId);
    const dateEntry = allFiles.find(entry => entry.date === date);
    
    if (!dateEntry || !dateEntry.png || dateEntry.png.length === 0) {
      console.log(`No se encontraron PNGs para ${radarId} en fecha ${date}`);
      return { downloaded: 0, skipped: 0, errors: [] };
    }
    
    const results = {
      downloaded: 0,
      skipped: 0,
      errors: [],
    };
    
    // Descargar cada PNG
    for (const pngFile of dateEntry.png) {
      try {
        // Verificar si ya existe en la base de datos
        const existing = await radarMetadataRepository.listProcessed({
          radarId: radarId.toUpperCase(),
          productType: 'ppi_png',
          from: new Date(`${date}T00:00:00Z`),
          to: new Date(`${date}T23:59:59Z`),
        });
        
        const alreadyExists = existing.some(
          entry => entry.filename === pngFile.name
        );
        
        if (alreadyExists) {
          console.log(`PNG ya existe en BD: ${pngFile.name}, reemplazando...`);
        }
        
        // Descargar y guardar (siempre reemplaza si existe)
        await downloadAndStorePng(radarId, date, pngFile.name, pngFile.url);
        results.downloaded++;
        
        // Pequeña pausa para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error procesando ${pngFile.name}:`, error.message);
        results.errors.push({ file: pngFile.name, error: error.message });
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Error al descargar PNGs para fecha ${date}:`, error.message);
    throw error;
  }
}

/**
 * Descarga todos los PNGs nuevos de un radar (todas las fechas disponibles)
 */
async function downloadAllNewPngs(radarId) {
  try {
    console.log(`Descargando todos los PNGs nuevos para ${radarId}`);
    
    // Obtener lista de archivos remotos
    const allFiles = await remoteRadarService.listAllRemoteFiles(radarId);
    
    const results = {
      totalDates: allFiles.length,
      downloaded: 0,
      skipped: 0,
      errors: [],
    };
    
    // Procesar cada fecha
    for (const dateEntry of allFiles) {
      if (!dateEntry.png || dateEntry.png.length === 0) {
        continue;
      }
      
      try {
        const dateResults = await downloadPngsForDate(radarId, dateEntry.date);
        results.downloaded += dateResults.downloaded;
        results.skipped += dateResults.skipped;
        results.errors.push(...dateResults.errors);
        
        // Pausa entre fechas
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error procesando fecha ${dateEntry.date}:`, error.message);
        results.errors.push({ date: dateEntry.date, error: error.message });
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Error al descargar todos los PNGs para ${radarId}:`, error.message);
    throw error;
  }
}

/**
 * Descarga PNGs de las últimas N fechas
 */
async function downloadRecentPngs(radarId, days = 7) {
  try {
    console.log(`Descargando PNGs de los últimos ${days} días para ${radarId}`);
    
    const allFiles = await remoteRadarService.listAllRemoteFiles(radarId);
    
    // Ordenar por fecha y tomar las últimas N
    const sortedFiles = allFiles
      .filter(entry => entry.png && entry.png.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);
    
    const results = {
      datesProcessed: sortedFiles.length,
      downloaded: 0,
      skipped: 0,
      errors: [],
    };
    
    for (const dateEntry of sortedFiles) {
      try {
        const dateResults = await downloadPngsForDate(radarId, dateEntry.date);
        results.downloaded += dateResults.downloaded;
        results.skipped += dateResults.skipped;
        results.errors.push(...dateResults.errors);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error procesando fecha ${dateEntry.date}:`, error.message);
        results.errors.push({ date: dateEntry.date, error: error.message });
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Error al descargar PNGs recientes para ${radarId}:`, error.message);
    throw error;
  }
}

module.exports = {
  downloadPng,
  downloadAndStorePng,
  downloadPngsForDate,
  downloadAllNewPngs,
  downloadRecentPngs,
};

