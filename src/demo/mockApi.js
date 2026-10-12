// Modo demo: simula el backend (Node + PostgreSQL) con datos de muestra
// para que el frontend pueda publicarse como sitio estático.
// Se activa con VITE_DEMO_MODE=true en el build.
import axios from 'axios';
import frames from './frames.json';

const FIVE_MIN = 5 * 60 * 1000;
const ECUADOR_OFFSET = 5 * 60 * 60 * 1000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const pad = (n) => String(n).padStart(2, '0');

const ecuadorDateStr = (ms) => {
  const d = new Date(ms - ECUADOR_OFFSET);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

const toFrame = (f, timestamp) => ({
  id: f.id,
  filename: f.filename,
  url: `/demo/radar/${f.id}.png`,
  imageUrl: `/demo/radar/${f.id}.png`,
  timestamp,
  sourceTimestamp: timestamp,
  bounds: f.bounds,
  metadata: { bounds: f.bounds, min: f.min, max: f.max, maxDbz: f.max },
});

// Frames "en vivo": la secuencia de muestra termina en la hora actual
// y se mantiene dentro del día de hoy (hora de Ecuador).
const liveFrames = () => {
  const last = Math.floor(Date.now() / FIVE_MIN) * FIVE_MIN;
  const today = ecuadorDateStr(last);
  let times = frames.map((_, i) => last - (frames.length - 1 - i) * FIVE_MIN);
  if (ecuadorDateStr(times[0]) !== today) {
    const midnight = Date.parse(`${today}T00:00:00-05:00`);
    times = frames.map((_, i) => midnight + i * FIVE_MIN);
  }
  return frames.map((f, i) => toFrame(f, new Date(times[i]).toISOString()));
};

// Frames históricos: la misma secuencia de muestra en la fecha pedida.
const framesForDate = (date) =>
  frames.map((f) => toFrame(f, new Date(`${date}T${f.time}:00-05:00`).toISOString()));

const lastDays = (n) =>
  Array.from({ length: n }, (_, i) => ecuadorDateStr(Date.now() - i * 86400000));

// Valores pseudoaleatorios estables para que los gráficos no cambien en cada carga
const seeded = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const analytics = (endpoint, period) => {
  switch (endpoint) {
    case 'metrics':
      return { success: true, totalPrecipitation: 128.4, maxIntensity: 52.5, registeredEvents: frames.length * 6, activeAlerts: 3 };
    case 'temporal': {
      const labels = period === 'today'
        ? Array.from({ length: 24 }, (_, h) => `${pad(h)}:00`)
        : lastDays(period === 'week' ? 7 : 30).reverse();
      return {
        success: true,
        data: labels.map((time, i) => ({
          time,
          GUAXX: +(15 + seeded(i + 1) * 30).toFixed(1),
          LOXX: +(10 + seeded(i + 50) * 28).toFixed(1),
        })),
      };
    }
    case 'provinces':
      return { success: true, data: [{ name: 'Loja', value: 34.2 }, { name: 'El Oro', value: 28.7 }, { name: 'Zamora', value: 25.8 }] };
    case 'intensity':
      return {
        success: true,
        data: [
          { name: 'Baja', value: 46, color: '#6B7280' },
          { name: 'Moderada', value: 32, color: '#3B82F6' },
          { name: 'Alta', value: 15, color: '#F59E0B' },
          { name: 'Muy Alta', value: 7, color: '#EF4444' },
        ],
      };
    case 'weekly':
      return {
        success: true,
        data: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, i) => ({
          day,
          value: +(18 + seeded(i + 100) * 25).toFixed(1),
        })),
      };
    default:
      return null;
  }
};

const resolve = (rawUrl) => {
  const url = new URL(rawUrl, window.location.origin);
  const p = url.pathname;
  const q = url.searchParams;

  let m = p.match(/^\/api\/analytics\/(\w+)/);
  if (m) return analytics(m[1], q.get('period') || 'today');

  m = p.match(/^\/api\/radar\/(\w+)\/available-dates/);
  if (m) return { success: true, radar: m[1], dates: m[1] === 'LGUAXX' ? lastDays(60) : [] };

  m = p.match(/^\/api\/radar\/(\w+)\/pngs\/(viewer-frames|recent)/);
  if (m) {
    if (m[1] !== 'LGUAXX') return { success: true, frames: [] };
    let list = liveFrames();
    const hours = Number(q.get('hours'));
    if (hours) {
      const end = Date.parse(list[list.length - 1].timestamp);
      list = list.filter((f) => end - Date.parse(f.timestamp) <= hours * 3600000);
    }
    return { success: true, frames: list.slice().reverse() };
  }

  m = p.match(/^\/api\/radar\/(\w+)\/pngs$/);
  if (m) {
    if (m[1] !== 'LGUAXX') return { success: true, radar: m[1], count: 0, pngs: [] };
    const date = q.get('date') || ecuadorDateStr(Date.now());
    const pngs = framesForDate(date).map((f) => ({ ...f, processedAt: f.timestamp, hasImageData: true }));
    return { success: true, radar: m[1], count: pngs.length, pngs };
  }

  if (p.startsWith('/api/')) return { success: true, data: [], frames: [], pngs: [], dates: [] };
  return null;
};

const weatherSample = (url) => {
  const lat = Number(url.searchParams.get('lat')) || -4;
  const s = seeded(Math.abs(lat) * 100);
  const temp = 14 + s * 10;
  const now = Math.floor(Date.now() / 1000);
  return {
    dt: now,
    main: { temp, temp_max: temp + 3, temp_min: temp - 4, humidity: Math.round(60 + s * 30), feels_like: temp - 1, pressure: 1015 },
    wind: { speed: 2 + s * 4, deg: Math.round(s * 360), gust: 4 + s * 3 },
    rain: { '1h': +(s * 2).toFixed(1) },
    weather: [{ description: 'nubes dispersas', icon: '03d', main: 'Clouds' }],
    visibility: 10000,
    clouds: { all: 40 },
    sys: { sunrise: now - 3600 * 6, sunset: now + 3600 * 6 },
  };
};

export const installMockApi = () => {
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const rawUrl = typeof input === 'string' ? input : input.url;
    const url = new URL(rawUrl, window.location.origin);
    if (url.hostname === 'api.openweathermap.org') return json(weatherSample(url));
    const data = resolve(rawUrl);
    return data ? json(data) : realFetch(input, init);
  };

  axios.defaults.adapter = async (config) => {
    const query = new URLSearchParams(config.params || {}).toString();
    const fullUrl = query ? `${config.url}${config.url.includes('?') ? '&' : '?'}${query}` : config.url;
    const data = resolve(fullUrl) ?? { success: true };
    return { data, status: 200, statusText: 'OK', headers: {}, config, request: {} };
  };
};
