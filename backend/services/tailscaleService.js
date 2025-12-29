const axios = require('axios');
const { Storage } = require('@google-cloud/storage');
const cloudService = require('./cloudService');
const path = require('path');
const fs = require('fs');
const os = require('os');

// URL base para la PC remota con Tailscale
const TAILSCALE_REMOTE_URL = process.env.TAILSCALE_REMOTE_URL || 'http://radar-remote.example.com:8000';

// Configuración de Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});
const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;

/**
 * Obtiene los datos más recientes de los radares desde la PC remota
 * @returns {Promise<Object>} - Datos de los radares
 */
const getRemoteRadarData = async () => {
  try {
    const response = await axios.get(`${TAILSCALE_REMOTE_URL}/api/radar/current`, {
      timeout: 10000 // 10 segundos de timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener datos remotos de los radares:', error);
    throw error;
  }
};

/**
 * Obtiene los datos de un radar específico desde la PC remota
 * @param {string} radarId - ID del radar (LGUAXX o LOXX)
 * @returns {Promise<Object>} - Datos del radar
 */
const getRemoteRadarById = async (radarId) => {
  try {
    const response = await axios.get(`${TAILSCALE_REMOTE_URL}/api/radar/${radarId}`, {
      timeout: 10000 // 10 segundos de timeout
    });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener datos remotos del radar ${radarId}:`, error);
    throw error;
  }
};

/**
 * Descarga un archivo NetCDF desde la PC remota
 * @param {string} radarId - ID del radar
 * @param {string} timestamp - Marca de tiempo del archivo
 * @returns {Promise<string>} - Ruta del archivo temporal descargado
 */
const downloadNetCDFFile = async (radarId, timestamp) => {
  try {
    const tempFilePath = path.join(os.tmpdir(), `${radarId}_${timestamp}.nc`);
    
    const response = await axios({
      method: 'get',
      url: `${TAILSCALE_REMOTE_URL}/api/radar/${radarId}/file/${timestamp}`,
      responseType: 'stream',
      timeout: 30000 // 30 segundos de timeout para archivos grandes
    });

    const writer = fs.createWriteStream(tempFilePath);
    
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      
      writer.on('close', () => {
        if (!error) {
          resolve(tempFilePath);
        }
      });
    });
  } catch (error) {
    console.error(`Error al descargar archivo NetCDF para radar ${radarId}:`, error);
    throw error;
  }
};

/**
 * Sincroniza los datos de radar desde la PC remota a Google Cloud Storage y GeoServer
 * @param {string} radarId - ID del radar (LGUAXX o LOXX)
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
const syncRadarData = async (radarId) => {
  try {
    console.log(`Iniciando sincronización de datos para radar ${radarId}...`);
    
    // Obtener datos del radar remoto
    const radarData = await getRemoteRadarById(radarId);
    
    if (!radarData || !radarData.latestFile) {
      throw new Error(`No se encontraron datos para el radar ${radarId}`);
    }
    
    // Descargar el archivo NetCDF
    const tempFilePath = await downloadNetCDFFile(radarId, radarData.latestFile.timestamp);
    console.log(`Archivo NetCDF descargado temporalmente en: ${tempFilePath}`);
    
    // Subir a Google Cloud Storage
    const fileName = path.basename(tempFilePath);
    const destinationPath = `radars/${radarId}/${fileName}`;
    
    await cloudService.uploadFile(tempFilePath, destinationPath);
    console.log(`Archivo subido a Google Cloud Storage: ${destinationPath}`);
    
    // Publicar en GeoServer
    await cloudService.publishNetCDFToGeoServer(destinationPath, radarId);
    console.log(`Datos publicados en GeoServer para radar ${radarId}`);
    
    // Limpiar archivo temporal
    fs.unlinkSync(tempFilePath);
    
    return {
      success: true,
      radarId,
      timestamp: radarData.latestFile.timestamp,
      storagePath: destinationPath,
      wmsUrl: cloudService.getGeoServerWmsUrl(radarId)
    };
  } catch (error) {
    console.error(`Error en la sincronización de datos para radar ${radarId}:`, error);
    throw error;
  }
};

/**
 * Verifica el estado de conexión con la PC remota
 * @returns {Promise<boolean>} - Estado de la conexión
 */
const checkRemoteConnection = async () => {
  try {
    await axios.get(`${TAILSCALE_REMOTE_URL}/api/status`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('Error al verificar conexión con PC remota:', error);
    return false;
  }
};

module.exports = {
  getRemoteRadarData,
  getRemoteRadarById,
  downloadNetCDFFile,
  syncRadarData,
  checkRemoteConnection
};