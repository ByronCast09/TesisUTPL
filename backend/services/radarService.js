const axios = require('axios');
// const netcdf4 = require('netcdf4'); // Comentado temporalmente - requiere instalación especial
const path = require('path');
const fs = require('fs');
const cloudService = require('./cloudService');

// Directorio temporal para almacenar archivos NetCDF
const tempDir = path.join(__dirname, '../temp');

// Crear directorio temporal si no existe
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// URLs de los radares (desde variables de entorno)
const radarUrls = {
  LGUAXX: process.env.RADAR_LGUAXX_URL,
  LOXX: process.env.RADAR_LOXX_URL
};

/**
 * Descarga un archivo NetCDF desde un radar remoto
 * @param {string} radarId - ID del radar (LGUAXX o LOXX)
 * @returns {Promise<string>} - Ruta del archivo descargado
 */
async function downloadNetCDFFile(radarId) {
  try {
    const url = radarUrls[radarId];
    if (!url) {
      throw new Error(`URL no configurada para el radar ${radarId}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(tempDir, `${radarId}_${timestamp}.nc`);
    
    const response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer'
    });

    fs.writeFileSync(filePath, response.data);
    
    // Subir a la nube para almacenamiento permanente
    await cloudService.uploadFile(filePath, `${radarId}/${path.basename(filePath)}`);
    
    return filePath;
  } catch (error) {
    console.error(`Error al descargar archivo NetCDF para ${radarId}:`, error);
    throw error;
  }
}

/**
 * Procesa un archivo NetCDF y extrae los datos relevantes
 * @param {string} filePath - Ruta al archivo NetCDF
 * @returns {Object} - Datos procesados del radar
 */
function processNetCDFFile(filePath) {
  try {
    // TODO: Implementar procesamiento real de NetCDF cuando netcdf4 esté disponible
    // const nc = new netcdf4.File(filePath, 'r');
    
    console.log(`Procesando archivo NetCDF simulado: ${filePath}`);
    
    // Datos simulados para pruebas
    const data = {
      latitude: [-4.0, -3.9, -3.8], // Coordenadas de ejemplo para Ecuador
      longitude: [-79.2, -79.1, -79.0],
      reflectivity: [10, 15, 20], // Valores de reflectividad simulados
      timestamp: new Date().getTime(),
      metadata: {
        radarName: path.basename(filePath),
        elevation: [0.5, 1.0, 1.5],
        azimuth: [0, 90, 180]
      }
    };
    
    return data;
  } catch (error) {
    console.error('Error al procesar archivo NetCDF:', error);
    throw error;
  }
}

/**
 * Obtiene y procesa datos de un radar específico
 * @param {string} radarId - ID del radar (LGUAXX o LOXX)
 * @returns {Promise<Object>} - Datos procesados del radar
 */
exports.getRadarData = async (radarId) => {
  try {
    const filePath = await downloadNetCDFFile(radarId);
    const data = processNetCDFFile(filePath);
    
    // Opcional: eliminar archivo temporal después de procesarlo
    fs.unlinkSync(filePath);
    
    return {
      ...data,
      source: radarId,
      processedAt: new Date()
    };
  } catch (error) {
    console.error(`Error al obtener datos del radar ${radarId}:`, error);
    throw error;
  }
};

/**
 * Descarga y procesa datos de radar (alias para compatibilidad)
 * @param {string} radarId - ID del radar (LGUAXX o LOXX)
 * @returns {Promise<Object>} - Datos procesados del radar
 */
exports.downloadAndProcessRadarData = async (radarId) => {
  return exports.getRadarData(radarId);
};