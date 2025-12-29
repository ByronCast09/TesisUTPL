const fs = require('fs');
const path = require('path');
const cloudService = require('./cloudService');

// Directorios base configurables por entorno
const RADAR_DIRS = {
  LGUAXX: process.env.RADAR_LGUAXX_DIR, // e.g. D:\\Rainview-Analyzer\\Rainview-Analyzer\\rainbow\\online\\RS19\\100km.ppi
  LOXX: process.env.RADAR_LOXX_DIR
};

const GEOSERVER_WMS_URL = process.env.GEOSERVER_WMS_URL;

/**
 * Recorre un directorio recursivamente y devuelve la lista de archivos que
 * coinciden con las extensiones indicadas.
 * @param {string} baseDir
 * @param {string[]} extensions e.g. ['.nc4', '.nc']
 * @returns {string[]} rutas absolutas
 */
function listFilesRecursive(baseDir, extensions) {
  const results = [];
  if (!baseDir || !fs.existsSync(baseDir)) return results;

  const stack = [baseDir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        if (extensions.includes(path.extname(entry.name).toLowerCase())) {
          results.push(fullPath);
        }
      }
    }
  }
  return results;
}

/**
 * Encuentra el archivo más reciente por fecha de modificación.
 * @param {string[]} files
 */
function getLatestFile(files) {
  if (!files.length) return null;
  return files
    .map((f) => ({ f, mtime: fs.statSync(f).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].f;
}

/**
 * Obtiene el último archivo NetCDF v4 (.nc4) o .nc disponible en el directorio del radar.
 * @param {string} radarId
 */
function getLatestLocalNetCDF(radarId) {
  const baseDir = RADAR_DIRS[radarId];
  const files = listFilesRecursive(baseDir, ['.nc4', '.nc']);
  const latest = getLatestFile(files);
  return latest;
}

/**
 * Publica un archivo NetCDF en GeoServer a través de cloudService y devuelve info WMS.
 * @param {string} filePath
 * @param {string} radarId
 */
async function publishNetCDF(filePath, radarId) {
  const fileName = path.basename(filePath);
  const key = `radars/${radarId}/${fileName}`;
  await cloudService.uploadFile(filePath, key);
  const layerName = fileName.replace(/\.nc4$|\.nc$/i, '').replace(/[^a-zA-Z0-9]/g, '_');
  return {
    baseUrl: GEOSERVER_WMS_URL,
    layerName,
    timestamp: new Date().toISOString()
  };
}

/**
 * Obtiene el último archivo local y lo publica; devuelve datos para consumir como WMS.
 * @param {string} radarId
 */
exports.getLatestWmsFromLocal = async (radarId) => {
  if (!RADAR_DIRS[radarId]) {
    throw new Error(`RADAR_${radarId}_DIR no configurado en .env`);
  }
  const latest = getLatestLocalNetCDF(radarId);
  if (!latest) {
    throw new Error(`No se encontraron archivos NetCDF (.nc4/.nc) en ${RADAR_DIRS[radarId]}`);
  }
  return await publishNetCDF(latest, radarId);
};