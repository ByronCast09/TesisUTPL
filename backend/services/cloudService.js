// const {Storage} = require('@google-cloud/storage'); // Comentado - no usar Google Cloud
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuración simplificada sin Google Cloud
const useGoogleCloud = process.env.USE_GOOGLE_CLOUD === 'true';
const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'radar-data-bucket';

// Configuración de GeoServer en Apache Tomcat
const geoserverUrl = process.env.GEOSERVER_URL;
const geoserverWmsUrl = process.env.GEOSERVER_WMS_URL;
const geoserverWorkspace = process.env.GEOSERVER_WORKSPACE;
const geoserverAuth = {
  username: process.env.GEOSERVER_USERNAME,
  password: process.env.GEOSERVER_PASSWORD
};

/**
 * Sube un archivo al almacenamiento local (sin Google Cloud)
 * @param {string} filePath - Ruta local del archivo
 * @param {string} key - Clave (ruta) en almacenamiento local
 * @returns {Promise<Object>} - Resultado de la operación
 */
exports.uploadFile = async (filePath, key) => {
  try {
    // Crear directorio local para almacenamiento
    const localStorageDir = path.join(__dirname, '../storage');
    if (!fs.existsSync(localStorageDir)) {
      fs.mkdirSync(localStorageDir, { recursive: true });
    }
    
    // Copiar archivo al almacenamiento local
    const destinationPath = path.join(localStorageDir, key);
    const destinationDir = path.dirname(destinationPath);
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }
    
    fs.copyFileSync(filePath, destinationPath);
    
    console.log(`Archivo guardado localmente en: ${destinationPath}`);
    
    return {
      bucket: 'local-storage',
      key: key,
      publicUrl: `file://${destinationPath}`,
      localPath: destinationPath
    };
  } catch (error) {
    console.error('Error al guardar archivo localmente:', error);
    throw error;
  }
};

/**
 * Publica un archivo NetCDF en GeoServer como una capa geoespacial
 * @param {string} filePath - Ruta local del archivo
 * @param {string} key - Clave (ruta) en Google Cloud Storage
 * @returns {Promise<void>}
 */
async function publishToGeoServer(filePath, key) {
  try {
    // Extraer nombre del archivo sin extensión para usarlo como nombre de capa
    const layerName = path.basename(key, '.nc').replace(/[^a-zA-Z0-9]/g, '_');
    
    // URL del archivo en Google Cloud Storage (accesible públicamente)
    const fileUrl = `https://storage.googleapis.com/${bucketName}/${key}`;
    
    // Verificar si el workspace existe, si no, crearlo
    try {
      await axios.get(`${geoserverUrl}/workspaces/${geoserverWorkspace}`, {
        auth: geoserverAuth
      });
      console.log(`Workspace ${geoserverWorkspace} ya existe en GeoServer`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Crear workspace si no existe
        await axios.post(`${geoserverUrl}/workspaces`, {
          workspace: {
            name: geoserverWorkspace
          }
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          auth: geoserverAuth
        });
        console.log(`Workspace ${geoserverWorkspace} creado en GeoServer`);
      } else {
        throw error;
      }
    }
    
    // Crear almacén de datos en GeoServer para el archivo NetCDF
    const createStoreUrl = `${geoserverUrl}/workspaces/${geoserverWorkspace}/coveragestores`;
    
    await axios.post(createStoreUrl, {
      coverageStore: {
        name: `store_${layerName}`,
        type: 'NetCDF',
        enabled: true,
        url: fileUrl
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      auth: geoserverAuth
    });
    
    // Publicar capa desde el almacén de datos
    const publishLayerUrl = `${geoserverUrl}/workspaces/${geoserverWorkspace}/coveragestores/store_${layerName}/coverages`;
    
    await axios.post(publishLayerUrl, {
      coverage: {
        name: layerName,
        nativeName: 'reflectivity', // Variable principal en el archivo NetCDF
        title: `Radar data - ${layerName}`,
        enabled: true
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      auth: geoserverAuth
    });
    
    console.log(`Archivo NetCDF publicado exitosamente en GeoServer como capa: ${layerName}`);
  } catch (error) {
    console.error('Error al publicar en GeoServer:', error);
    // No lanzamos el error para que no interrumpa el flujo principal
  }
}

/**
 * Obtiene datos históricos de los radares desde el almacenamiento local
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @param {string} radar - ID del radar (LGUAXX, LOXX o 'all')
 * @returns {Promise<Array>} - Lista de datos históricos
 */
exports.getHistoricalData = async (date, radar = 'all') => {
  try {
    const localStorageDir = path.join(__dirname, '../storage');
    if (!fs.existsSync(localStorageDir)) {
      return [];
    }
    
    // Buscar archivos en almacenamiento local
    const searchPath = radar.toLowerCase() === 'all' ? 
      path.join(localStorageDir, date) : 
      path.join(localStorageDir, radar, date);
    
    if (!fs.existsSync(searchPath)) {
      return [];
    }
    
    // Listar archivos en el directorio
    const files = fs.readdirSync(searchPath)
      .filter(file => file.endsWith('.nc'))
      .map(file => ({
        name: file,
        path: path.join(searchPath, file),
        stats: fs.statSync(path.join(searchPath, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime)
      .slice(0, 10);
    
    if (files.length === 0) {
      return [];
    }
    
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          // Procesar el archivo NetCDF
          const radarService = require('./radarService');
          const data = radarService.processNetCDFFile(file.path);
          
          // Obtener URL de WMS para visualización en el mapa
          const layerName = path.basename(file.name, '.nc').replace(/[^a-zA-Z0-9]/g, '_');
          const wmsUrl = `${geoserverWmsUrl}?service=WMS&version=1.1.0&request=GetMap&layers=${geoserverWorkspace}:${layerName}`;
          
          return {
            ...data,
            key: file.name,
            lastModified: file.stats.mtime,
            wmsUrl
          };
        } catch (error) {
          console.error(`Error procesando archivo ${file.name}:`, error);
          return null;
        }
      })
    );
    
    return results.filter(result => result !== null);
  } catch (error) {
    console.error('Error al obtener datos históricos:', error);
    return [];
  }
};

/**
 * Obtiene la URL de WMS para una capa específica en GeoServer
 * @param {string} radarId - ID del radar (LGUAXX o LOXX)
 * @param {string} timestamp - Marca de tiempo para identificar la capa
 * @returns {string} - URL de WMS
 */
exports.getWmsUrl = (radarId, timestamp) => {
  const layerName = `${radarId}_${timestamp}`.replace(/[^a-zA-Z0-9]/g, '_');
  return `${geoserverWmsUrl}?service=WMS&version=1.1.0&request=GetMap&layers=${geoserverWorkspace}:${layerName}`;
};