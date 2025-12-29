import axios from 'axios';

/**
 * Servicio para comunicarse con la PC remota a través de Tailscale
 */

// URL base para la PC remota con Tailscale (debe configurarse en .env)
const TAILSCALE_REMOTE_URL = process.env.REACT_APP_TAILSCALE_REMOTE_URL || 'http://radar-remote.example.com:8000';

/**
 * Obtiene los datos más recientes de los radares desde la PC remota
 * @returns {Promise<Object>} - Datos de los radares
 */
export const getRemoteRadarData = async () => {
  try {
    const response = await axios.get(`${TAILSCALE_REMOTE_URL}/api/radar/current`);
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
export const getRemoteRadarById = async (radarId) => {
  try {
    const response = await axios.get(`${TAILSCALE_REMOTE_URL}/api/radar/${radarId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener datos remotos del radar ${radarId}:`, error);
    throw error;
  }
};

/**
 * Verifica el estado de conexión con la PC remota
 * @returns {Promise<boolean>} - Estado de la conexión
 */
export const checkRemoteConnection = async () => {
  try {
    await axios.get(`${TAILSCALE_REMOTE_URL}/api/status`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('Error al verificar conexión con PC remota:', error);
    return false;
  }
};