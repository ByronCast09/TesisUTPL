const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cloudService = require('./cloudService');

// URLs remotas configurables por entorno (pueden ser URL directas a .nc o la carpeta base con índice HTML)
const RADAR_URLS = {
  LGUAXX: process.env.RADAR_LGUAXX_URL,
  LGUAYY: process.env.RADAR_LGUAYY_URL || process.env.RADAR_LGUAXX_URL,
  LGUAZZ: process.env.RADAR_LGUAZZ_URL || process.env.RADAR_LGUAXX_URL,
  LOXX: process.env.RADAR_LOXX_URL
};

const GEOSERVER_WMS_URL = process.env.GEOSERVER_WMS_URL;
const GEOSERVER_WORKSPACE = process.env.GEOSERVER_WORKSPACE || 'radar_utpl';

const REMOTE_INDEX_TIMEOUT_MS = (() => {
  // Timeout aumentado a 120 segundos (2 minutos) para servidores que pueden tardar más
  // El servidor remoto puede tardar en responder, especialmente con muchos archivos
  const raw = Number(process.env.RADAR_REMOTE_INDEX_TIMEOUT_MS || process.env.RADAR_REMOTE_TIMEOUT_MS || 120000);
  if (Number.isNaN(raw) || raw <= 0) {
    return 120000; // 120 segundos (2 minutos) por defecto
  }
  return Math.max(30000, Math.floor(raw)); // Mínimo 30 segundos
})();

async function firstSuccessful(promises) {
  if (typeof Promise.any === 'function') {
    return Promise.any(promises);
  }

  return new Promise((resolve, reject) => {
    const errors = [];
    let pending = promises.length;
    if (!pending) {
      reject(new Error('No promises provided'));
      return;
    }

    promises.forEach((promise, index) => {
      Promise.resolve(promise)
        .then(resolve)
        .catch((err) => {
          errors[index] = err;
          pending -= 1;
          if (pending === 0) {
            const aggregateErr = new Error('All promises rejected');
            aggregateErr.errors = errors;
            reject(aggregateErr);
          }
        });
    });
  });
}

// Utilidad: obtiene el índice JSON remoto (intenta múltiples endpoints compatibles)
async function getRemoteIndex(baseUrl) {
  if (!baseUrl.endsWith('/')) baseUrl += '/';

  // PRIORIZAR el endpoint que sabemos que funciona: /index.json
  // Construir candidatos para index.json en serveres diferentes
  const candidates = [
    new URL('index.json', baseUrl).href,                  // http://host:port/index.json (PRIMERO - el que funciona)
    new URL('api/radar/index', baseUrl).href,             // http://host:port/api/radar/index
    new URL('index', baseUrl).href                        // http://host:port/index (por si devuelve JSON en /index)
  ];

  // Aumentar timeout para el endpoint principal que sabemos que funciona pero se demora
  // El servidor puede tardar 25-30 segundos con muchos archivos (65975 PNGs)
  const PRIMARY_TIMEOUT = Math.max(REMOTE_INDEX_TIMEOUT_MS, 180000); // Mínimo 180 segundos (3 minutos) para el principal

  let successFound = false; // Flag para indicar si ya encontramos uno que funciona
  
  const attempts = candidates.map((idxUrl, index) => {
    // El primer endpoint (index.json) tiene timeout más largo
    const timeout = index === 0 ? PRIMARY_TIMEOUT : REMOTE_INDEX_TIMEOUT_MS;
    
    return axios
      .get(idxUrl, { 
        timeout,
        // Agregar headers para evitar problemas de conexión
        headers: {
          'Connection': 'keep-alive',
          'Accept': 'application/json'
        },
        // Agregar validación de estado HTTP
        validateStatus: (status) => status >= 200 && status < 300
      })
      .then((res) => {
        if (res && res.data) {
          const dateCount = res.data.dates ? Object.keys(res.data.dates).length : 
                           (typeof res.data === 'object' ? Object.keys(res.data).filter(k => /\d{4}-\d{2}-\d{2}/.test(k)).length : 0);
          console.log(`✓ Índice remoto obtenido desde: ${idxUrl} (${dateCount} fechas)`);
          successFound = true; // Marcar que encontramos uno que funciona
          return res.data;
        }
        throw new Error('Respuesta vacía');
      })
      .catch((err) => {
        // Solo mostrar error si aún no encontramos uno que funciona
        // Esto evita spam de logs cuando el primer intento ya funcionó
        if (!successFound) {
          const errorMsg = err.code === 'ETIMEDOUT' 
            ? `timeout de ${timeout}ms exceeded` 
            : err.message || err.toString();
          console.warn(`No se pudo obtener índice desde ${idxUrl}: ${errorMsg}`);
        }
        throw err;
      });
  });

  try {
    const result = await firstSuccessful(attempts);
    // Si llegamos aquí, uno de los endpoints funcionó
    // No necesitamos mostrar errores de los otros
    return result;
  } catch (aggregateErr) {
    // Solo mostrar errores si TODOS fallaron
    if (aggregateErr && aggregateErr.errors) {
      console.error(`[getRemoteIndex] Todos los endpoints fallaron para ${baseUrl}:`);
      aggregateErr.errors.forEach((err, index) => {
        if (err) { // Solo mostrar si hay error real
          const errorMsg = err?.code === 'ETIMEDOUT' 
            ? `timeout de ${index === 0 ? PRIMARY_TIMEOUT : REMOTE_INDEX_TIMEOUT_MS}ms exceeded` 
            : err?.message || err;
          console.warn(`  ${index + 1}. ${candidates[index]}: ${errorMsg}`);
        }
      });
    }
    throw new Error(`No se pudo obtener index remoto desde ${baseUrl} (probados ${candidates.join(', ')}).`);
  }
}

// Utilidad: obtiene enlaces de una página HTML de índice simple (como python -m http.server)
async function listDirectoryLinks(url) {
  const res = await axios.get(url, { timeout: REMOTE_INDEX_TIMEOUT_MS });
  const html = res.data;
  const links = [];
  const regex = /href="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html))) {
    links.push(match[1]);
  }
  return links;
}

// Dado un baseUrl, usa index.json para encontrar la URL del último .nc/.nc4
async function findLatestNcUrl(baseUrl) {
  const index = await getRemoteIndex(baseUrl);
  
  // Manejar estructura actual: { "dates": { "2025-10-24": ["file1.png", "file2.nc4"] } }
  let dates = [];
  let filesMap = {};

  if (index.dates) {
    // Estructura actual del usuario
    dates = Object.keys(index.dates).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    filesMap = index.dates;
  } else {
    // Estructura anterior (por compatibilidad)
    dates = Object.keys(index).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    filesMap = index;
  }

  if (!dates.length) {
    throw new Error('No se encontraron fechas válidas en el index.json remoto');
  }

  const latestDate = dates[dates.length - 1];
  const files = filesMap[latestDate] || [];
  
  // Buscar archivos .nc4 o .nc
  const ncFiles = files.filter(file => {
    if (typeof file === 'string') {
      return file.match(/\.(nc4|nc)$/i);
    } else if (file && file.file) {
      return file.file.match(/\.(nc4|nc)$/i);
    }
    return false;
  });

  if (!ncFiles.length) {
    throw new Error(`No se encontraron archivos NetCDF para la fecha ${latestDate} en el index.json remoto`);
  }

  const latestNcFile = ncFiles[ncFiles.length - 1];
  
  // Construir URL
  let fileName;
  if (typeof latestNcFile === 'string') {
    fileName = latestNcFile;
  } else if (latestNcFile.file) {
    fileName = latestNcFile.file;
  } else {
    throw new Error(`Formato de archivo NetCDF no reconocido en index.json`);
  }

  let url = baseUrl;
  if (!url.endsWith('/')) url += '/';
  return new URL(`${latestDate}/${fileName}`, url).href;
}

/**
 * Descarga un archivo desde una URL remota y lo guarda temporalmente.
 */
async function downloadRadarFile(url, radarId) {
  console.log(`Descargando archivo de radar desde: ${url}`);
  const response = await axios({ method: 'GET', url, responseType: 'stream', timeout: 30000 });

  const tempDir = os.tmpdir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${radarId}_${timestamp}.nc`;
  const tempFilePath = path.join(tempDir, fileName);

  const writer = fs.createWriteStream(tempFilePath);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  console.log(`Archivo descargado: ${tempFilePath}`);
  return tempFilePath;
}

/**
 * Publica un archivo NetCDF en GeoServer a través de cloudService y devuelve info WMS.
 */
async function publishNetCDF(filePath, radarId) {
  try {
    const fileName = path.basename(filePath);
    const key = `radars/${radarId}/${fileName}`;
    await cloudService.uploadFile(filePath, key);

    const layerName = fileName.replace(/\.(nc4|nc)$/i, '').replace(/[^a-zA-Z0-9]/g, '_');
    return {
      baseUrl: GEOSERVER_WMS_URL,
      layerName: `${GEOSERVER_WORKSPACE}:${layerName}`,
      timestamp: new Date().toISOString(),
      fileName
    };
  } finally {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) {}
  }
}

/**
 * Obtiene el último archivo desde URL remota (directa o base con índice) y lo publica; devuelve datos para WMS.
 */
exports.getLatestWmsFromRemote = async (radarId) => {
  const configured = RADAR_URLS[radarId];
  if (!configured) throw new Error(`RADAR_${radarId}_URL no configurado en .env`);

  let fileUrl = configured;
  // Si no apunta a archivo .nc/.nc4, asumimos índice y buscamos el último
  if (!fileUrl.match(/\.(nc4|nc)$/i)) {
    fileUrl = await findLatestNcUrl(fileUrl);
  }

  const tempFilePath = await downloadRadarFile(fileUrl, radarId);
  return await publishNetCDF(tempFilePath, radarId);
};

/**
 * Verifica si una URL remota está disponible.
 */
exports.checkRemoteAvailability = async (radarId) => {
  const url = RADAR_URLS[radarId];
  if (!url) return { available: false, error: `URL no configurada para ${radarId}` };

  try {
    const response = await axios.head(url, { timeout: 5000 });
    return { available: true, status: response.status, lastModified: response.headers['last-modified'] };
  } catch (error) {
    return { available: false, error: error.message };
  }
};

exports.listAllRemoteFiles = async (radarId) => {
  const baseUrl = RADAR_URLS[radarId];
  if (!baseUrl) throw new Error(`RADAR_${radarId}_URL no configurado en .env`);
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

  // Obtener índice remoto normalizado
  const index = await getRemoteIndex(base);

  // Manejar estructura actual: { "dates": { "2025-10-24": ["file1.png", "file2.nc4"] } }
  let dates = [];
  let filesMap = {};

  if (index.dates) {
    dates = Object.keys(index.dates).filter(k => /\d{4}-\d{2}-\d{2}/.test(k)).sort();
    filesMap = index.dates;
  } else {
    dates = Object.keys(index).filter(k => /\d{4}-\d{2}-\d{2}/.test(k)).sort();
    filesMap = index;
  }

  const result = [];
  for (const date of dates) {
    const files = filesMap[date] || [];
    
    const nc = files.filter(file => {
      const fileName = typeof file === 'string' ? file : (file.file || '');
      return fileName.match(/\.(nc4|nc)$/i);
    }).map(file => {
      const fileName = typeof file === 'string' ? file : file.file;
      return { name: fileName, url: new URL(`${date}/${fileName}`, base).href };
    });
    
    const png = files.filter(file => {
      const fileName = typeof file === 'string' ? file : (file.file || '');
      return fileName.match(/\.png$/i);
    }).map(file => {
      const fileName = typeof file === 'string' ? file : file.file;
      return { name: fileName, url: new URL(`${date}/${fileName}`, base).href };
    });
    
    result.push({ date, nc, png });
  }
  return result;
};

exports.buildUrlFromDateFile = (radarId, date, file) => {
  const baseUrl = RADAR_URLS[radarId];
  if (!baseUrl) throw new Error(`RADAR_${radarId}_URL no configurado en .env`);
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  return `${base}${date}/${file}`;
};

// Función específica para listar archivos GIF
exports.listAllRemoteGifs = async (radarId) => {
  const baseUrl = RADAR_URLS[radarId];
  if (!baseUrl) throw new Error(`RADAR_${radarId}_URL no configurado en .env`);
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

  const index = await getRemoteIndex(base);
  
  // Manejar estructura actual: { "dates": { "2025-10-24": ["file1.png", "file2.gif"] } }
  let dates = [];
  let filesMap = {};

  if (index.dates) {
    dates = Object.keys(index.dates).filter(k => /\d{4}-\d{2}-\d{2}/.test(k)).sort();
    filesMap = index.dates;
  } else {
    dates = Object.keys(index).filter(k => /\d{4}-\d{2}-\d{2}/.test(k)).sort();
    filesMap = index;
  }

  const result = [];
  for (const date of dates) {
    const files = filesMap[date] || [];
    const gifs = files
      .filter(file => {
        const fileName = typeof file === 'string' ? file : (file.file || '');
        return fileName.match(/\.gif$/i);
      })
      .map(file => {
        const fileName = typeof file === 'string' ? file : file.file;
        return { name: fileName, url: new URL(`${date}/${fileName}`, base).href, date };
      });
    if (gifs.length > 0) result.push({ date, gifs });
  }
  return result;
};

// Función para obtener el GIF más reciente
exports.getLatestRemoteGif = async (radarId) => {
  try {
    const allGifs = await exports.listAllRemoteGifs(radarId);
    if (!allGifs.length) return null;
    const latestDateEntry = allGifs[allGifs.length - 1];
    const latestGif = latestDateEntry.gifs[latestDateEntry.gifs.length - 1];
    return { date: latestDateEntry.date, file: latestGif.name, url: latestGif.url };
  } catch (error) {
    console.error(`Error al obtener GIF más reciente para ${radarId}:`, error.message);
    return null;
  }
};

// Función para obtener GIFs de una fecha específica
exports.getRemoteGifsByDate = async (radarId, date) => {
  const baseUrl = RADAR_URLS[radarId];
  if (!baseUrl) throw new Error(`RADAR_${radarId}_URL no configurado en .env`);
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  try {
    const index = await getRemoteIndex(base);
    
    // Manejar estructura actual: { "dates": { "2025-10-24": ["file1.png", "file2.gif"] } }
    let files = [];
    if (index.dates && index.dates[date]) {
      files = index.dates[date];
    } else if (index[date]) {
      files = (index[date].images) || [];
    }
    
    const gifs = files
      .filter(file => {
        const fileName = typeof file === 'string' ? file : (file.file || '');
        return fileName.match(/\.gif$/i);
      })
      .map(file => {
        const fileName = typeof file === 'string' ? file : file.file;
        return { name: fileName, url: new URL(`${date}/${fileName}`, base).href };
      });
    return gifs;
  } catch (error) {
    console.error(`Error al obtener GIFs para fecha ${date}:`, error.message);
    return [];
  }
};

// Nueva función: descargar el último .nc/.nc4 remoto a un archivo temporal y devolver su path
exports.downloadLatestNcToTemp = async (radarId) => {
  const configured = RADAR_URLS[radarId];
  if (!configured) throw new Error(`RADAR_${radarId}_URL no configurado en .env`);

  let fileUrl = configured;
  if (!fileUrl.match(/\.(nc4|nc)$/i)) {
    fileUrl = await findLatestNcUrl(fileUrl);
  }

  const tempFilePath = await downloadRadarFile(fileUrl, radarId);
  return tempFilePath;
};