/**
 * Servicio para manejar la conexión con el radar remoto
 * Ahora normaliza la estructura de imágenes y expone URLs directas
 */

class RemoteRadarService {
  constructor() {
    this.remoteServerUrl = import.meta.env?.VITE_REMOTE_RADAR_URL || 'http://localhost:8080';
    this.radarId = 'LGUAXX';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  clearCache() {
    this.cache.clear();
  }

  setRemoteServerUrl(url) {
    this.remoteServerUrl = url.replace(/\/$/, '');
    this.clearCache();
  }

  getRemoteServerUrl() {
    return this.remoteServerUrl;
  }

  async getRemoteIndex() {
    try {
      const cacheKey = 'remote_index';
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) return cached.data;

      const res = await fetch(`${this.remoteServerUrl}/api/radar/index`);
      if (!res.ok) throw new Error(`Remote server responded ${res.status}`);
      const data = await res.json();

      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      console.error('Error getRemoteIndex:', err);
      throw err;
    }
  }

  // Normaliza las entradas de un día a objetos { filename, url, bbox?, meta? }
  async getImagesForDate(date) {
    try {
      const index = await this.getRemoteIndex();
      const entries = index?.dates?.[date] || [];
      const normalized = entries.map((e) => {
        if (!e) return null;
        if (typeof e === 'string') {
          return {
            filename: e,
            url: `${this.remoteServerUrl}/api/radar/image/${e}`,
            bbox: null,
            meta: null
          };
        }
        // Si es objeto con propiedades metadata
        const name = e.name || e.filename || e.file || null;
        if (name) {
          return {
            filename: name,
            url: e.url || `${this.remoteServerUrl}/api/radar/image/${name}`,
            bbox: e.bbox || null,
            meta: e.meta || null
          };
        }
        return null;
      }).filter(Boolean);
      return normalized;
    } catch (err) {
      console.error(`Error getImagesForDate(${date}):`, err);
      return [];
    }
  }

  // Devuelve URL directa para una imagen (no descarga blob)
  getImageUrl(filename) {
    if (!filename) return null;
    return `${this.remoteServerUrl}/api/radar/image/${filename}`;
  }

  // Obtiene metadatos básicos (HEAD) de la imagen remota
  async getImageMetadata(filename) {
    try {
      const url = this.getImageUrl(filename);
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) throw new Error(`HEAD ${res.status}`);
      return {
        contentType: res.headers.get('content-type'),
        contentLength: res.headers.get('content-length'),
        lastModified: res.headers.get('last-modified')
      };
    } catch (err) {
      console.warn('getImageMetadata error:', err.message || err);
      return null;
    }
  }

  // Devuelve información del último archivo disponible (filename + url)
  async getLatestImageInfo() {
    try {
      const index = await this.getRemoteIndex();
      const dates = index?.dates ? Object.keys(index.dates).sort() : [];
      if (!dates.length) return null;
      const lastDate = dates[dates.length - 1];
      const files = index.dates[lastDate] || [];
      const lastFile = Array.isArray(files) && files.length ? files[files.length - 1] : null;
      if (!lastFile) return null;
      const filename = typeof lastFile === 'string' ? lastFile : (lastFile.name || lastFile.filename || lastFile.file);
      return { filename, url: `${this.remoteServerUrl}/api/radar/image/${filename}`, date: lastDate };
    } catch (err) {
      console.error('getLatestImageInfo error:', err);
      return null;
    }
  }

  // Método legacy: si el servidor devuelve la imagen directa, esta función puede usarse,
  // pero preferimos usar getImageUrl para que el navegador gestione caché y streaming.
  async getImageByTimestamp(timestamp) {
    try {
      const filename = `LGUAXX_${timestamp}.png`;
      return this.getImageUrl(filename);
    } catch (err) {
      console.error('getImageByTimestamp error:', err);
      throw err;
    }
  }

  async getAvailableDates() {
    try {
      const index = await this.getRemoteIndex();
      return index?.dates ? Object.keys(index.dates).sort() : [];
    } catch (err) {
      console.error('getAvailableDates error:', err);
      return [];
    }
  }

  async checkServerStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.remoteServerUrl}/api/radar/index`, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (err) {
      return false;
    }
  }

  async getServerInfo() {
    try {
      const index = await this.getRemoteIndex();
      return {
        radarId: index.radar_id,
        lastUpdated: index.last_updated,
        totalFiles: index.total_files,
        availableDates: Object.keys(index.dates || {}),
        serverUrl: this.remoteServerUrl
      };
    } catch (err) {
      return null;
    }
  }
}

const remoteRadarService = new RemoteRadarService();
export default remoteRadarService;
