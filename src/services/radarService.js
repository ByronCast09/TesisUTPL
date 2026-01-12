import axios from 'axios';

// Usar rutas relativas para que funcione tanto en localhost como en ngrok
const API_URL = '/api';
const ORIGIN_URL = '';

/**
 * Obtiene los datos actuales de los radares
 * @returns {Promise<Object>} - Datos de los radares
 */
export const getCurrentRadarData = async () => {
  try {
    const response = await axios.get(`${API_URL}/radar/current`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener datos actuales de los radares:', error);
    throw error;
  }
};

/**
 * Obtiene los datos de un radar específico
 * @param {string} radarId - ID del radar (LGUAXX o LOXX)
 * @returns {Promise<Object>} - Datos del radar
 */
export const getRadarData = async (radarId) => {
  try {
    const response = await axios.get(`${API_URL}/radar/${radarId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener datos del radar ${radarId}:`, error);
    throw error;
  }
};

/**
 * Lista todos los archivos remotos por fecha (nc/png) para un radar.
 */
export const getRemoteIndex = async (radarId) => {
  try {
    const response = await axios.get(`${API_URL}/radar/${radarId}/remote-index`);
    return response.data; // { success, radar, index }
  } catch (error) {
    console.error('Error al listar archivos remotos:', error);
    throw error;
  }
};

// Índice específico para GIFs remotos
export const getRemoteGifIndex = async (radarId) => {
  try {
    const response = await axios.get(`${API_URL}/radar/${radarId}/remote-gif-index`);
    return response.data; // { success, radar, index: [{date, gifs: [...]}, ...] }
  } catch (error) {
    console.error('Error al listar GIFs remotos:', error);
    throw error;
  }
};

/**
 * Construye la URL del backend para proxyear una imagen PNG remota.
 */
export const getProxyImageUrl = (radarId, date, file) => {
  const params = new URLSearchParams({ date, file });
  return `${API_URL}/radar/${radarId}/proxy-image?${params.toString()}`;
};

/**
 * Obtiene WMS remoto para un archivo específico (fecha/archivo).
 */
export const getRemoteWmsByQuery = async (radarId, date, file) => {
  try {
    const response = await axios.get(`${API_URL}/radar/${radarId}/remote-wms`, { params: { date, file } });
    return response.data; // { success, baseUrl, layerName, timestamp }
  } catch (error) {
    console.error('Error al obtener WMS remoto por fecha/archivo:', error);
    throw error;
  }
};

/**
 * Obtiene datos históricos de los radares
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @param {string} radar - ID del radar (LGUAXX, LOXX o 'all')
 * @returns {Promise<Array>} - Lista de datos históricos
 */
export const getHistoricalData = async (date, radar = 'all') => {
  try {
    const response = await axios.get(`${API_URL}/radar/historical/${date}`, {
      params: { radar }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener datos históricos:', error);
    throw error;
  }
};

/**
 * Obtiene la URL de WMS para un radar específico
 * @param {string} radarId - ID del radar (LGUAXX o LOXX)
 * @param {string} timestamp - Marca de tiempo (opcional)
 * @returns {Promise<string>} - URL de WMS
 */
export const getWmsUrl = async (radarId, timestamp = null) => {
  try {
    const response = await axios.get(`${API_URL}/radar/${radarId}/wms`, {
      params: { timestamp }
    });
    return response.data.wmsUrl;
  } catch (error) {
    console.error(`Error al obtener URL de WMS para el radar ${radarId}:`, error);
    throw error;
  }
};

// Obtener el GIF más reciente de un radar
export const getLatestGif = async (radarId) => {
  try {
    const response = await fetch(`${API_URL}/radar/${radarId}/latest-gif`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al obtener GIF más reciente:', error);
    throw error;
  }
};

// Obtener GIFs por fecha específica
export const getGifByDate = async (radarId, date) => {
  try {
    const response = await fetch(`${API_URL}/radar/${radarId}/gif-by-date?date=${date}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al obtener GIFs por fecha:', error);
    throw error;
  }
};

// Construir URL para proxy de GIF
export const getProxyGifUrl = (radarId, date, file) => {
  return `${API_URL}/radar/${radarId}/proxy-image?date=${date}&file=${file}`;
};

export const getLatestProcessedImage = async (radarId) => {
  const response = await axios.get(`${API_URL}/radar/${radarId}/latest-image`);
  return response.data;
};

export const getTimelineEntries = async (radarId, { limit, date, from, to } = {}) => {
  const params = {};
  if (typeof limit !== 'undefined') params.limit = limit;
  if (date) params.date = date;
  if (from) params.from = from;
  if (to) params.to = to;
  const response = await axios.get(`${API_URL}/radar/${radarId}/timeline`, { params });
  return response.data;
};

export const buildLocalAssetUrl = (relativePath) => `${ORIGIN_URL}${relativePath}`;

export const getAvailableDates = async (radarId) => {
  const response = await axios.get(`${API_URL}/radar/${radarId}/available-dates`);
  return response.data;
};

export const requestProcessDate = async (radarId, date) => {
  const response = await axios.post(`${API_URL}/radar/${radarId}/process-date`, { date });
  return response.data;
};

export const getDailyGif = async (radarId, date) => {
  const response = await axios.get(`${API_URL}/radar/${radarId}/daily-gif`, { params: { date } });
  return response.data;
};

export const getHistoricalIndex = async (radarId, windows) => {
  const params = {};
  if (Array.isArray(windows) && windows.length) {
    params.windows = windows.join(',');
  }
  const response = await axios.get(`${API_URL}/radar/${radarId}/historical-index`, { params });
  return response.data;
};

// ========== NUEVAS FUNCIONES PARA PNGs EN POSTGRESQL ==========

/**
 * Descarga y guarda PNGs de una fecha específica en PostgreSQL
 */
export const downloadPngsForDate = async (radarId, date) => {
  try {
    const response = await axios.post(`${API_URL}/radar/${radarId}/download-pngs/date`, null, {
      params: { date }
    });
    return response.data;
  } catch (error) {
    console.error('Error al descargar PNGs para fecha:', error);
    throw error;
  }
};

/**
 * Descarga todos los PNGs nuevos de un radar
 */
export const downloadAllNewPngs = async (radarId) => {
  try {
    const response = await axios.post(`${API_URL}/radar/${radarId}/download-pngs`);
    return response.data;
  } catch (error) {
    console.error('Error al descargar todos los PNGs:', error);
    throw error;
  }
};

/**
 * Descarga PNGs de los últimos N días
 */
export const downloadRecentPngs = async (radarId, days = 7) => {
  try {
    const response = await axios.post(`${API_URL}/radar/${radarId}/download-pngs/recent`, null, {
      params: { days }
    });
    return response.data;
  } catch (error) {
    console.error('Error al descargar PNGs recientes:', error);
    throw error;
  }
};

/**
 * Obtiene PNGs desde PostgreSQL por fecha
 */
export const getPngsFromDb = async (radarId, date = null) => {
  try {
    const params = {};
    if (date) params.date = date;
    const response = await axios.get(`${API_URL}/radar/${radarId}/pngs`, { params });
    return response.data;
  } catch (error) {
    console.error('Error al obtener PNGs desde BD:', error);
    throw error;
  }
};

/**
 * Obtiene el índice de PNGs almacenados en PostgreSQL
 */
export const getPngIndexFromDb = async (radarId) => {
  try {
    const response = await axios.get(`${API_URL}/radar/${radarId}/pngs/index`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener índice de PNGs desde BD:', error);
    throw error;
  }
};

/**
 * Obtiene la URL de una imagen PNG específica desde PostgreSQL
 */
export const getPngImageUrl = (id) => {
  return `${API_URL}/radar/pngs/${id}/image`;
};

/**
 * Obtiene el índice de PNGs desde PostgreSQL en formato compatible con el visor
 * (Similar a getRemoteIndex pero desde PostgreSQL local)
 */
export const getPngIndexFromDbForViewer = async (radarId) => {
  try {
    const response = await axios.get(`${API_URL}/radar/${radarId}/pngs/viewer-index`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener índice de PNGs desde BD para visor:', error);
    throw error;
  }
};

/**
 * Obtiene la última imagen procesada del día actual para un radar
 */
export const getLatestImageToday = async (radarId) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const response = await axios.get(`${API_URL}/radar/${radarId}/pngs/latest-today`, {
      params: { date: today }
    });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener última imagen del día para ${radarId}:`, error);
    throw error;
  }
};