/**
 * Configuración optimizada para sincronización sin sobrecargar servidores remotos
 */

// 1. INTERVALOS RECOMENDADOS
const SYNC_INTERVALS = {
    // Para sincronización inicial (primera vez o después de limpiar estado)
    initial: 30 * 60 * 1000,  // 30 minutos

    // Para mantenimiento normal (solo archivos nuevos)
    normal: 10 * 60 * 1000,   // 10 minutos

    // Para testing/desarrollo
    testing: 60 * 60 * 1000,  // 1 hora
};

// 2. DELAY ENTRE ARCHIVOS
const DELAYS = {
    betweenFiles: 1000,        // 1 segundo entre archivos
    betweenDates: 5000,        // 5 segundos entre fechas
    afterError: 30000,         // 30 segundos después de error
};

// 3. LÍMITES DE PROCESAMIENTO
const LIMITS = {
    maxFilesPerSync: 100,      // Máximo 100 archivos por sincronización
    maxDatesPerSync: 3,        // Máximo 3 fechas por sincronización (solo las más recientes)
    maxConcurrentDownloads: 1, // Solo 1 descarga a la vez
};

// 4. TIMEOUTS
const TIMEOUTS = {
    indexFetch: 15 * 60 * 1000,  // 15 minutos para obtener índice
    fileFetch: 5 * 60 * 1000,    // 5 minutos para descargar archivo
};

module.exports = {
    SYNC_INTERVALS,
    DELAYS,
    LIMITS,
    TIMEOUTS
};

// CONFIGURACIÓN RECOMENDADA EN .ENV:
// PNG_SYNC_INTERVAL=1800000  # 30 minutos para no sobrecargar
// RADAR_REMOTE_INDEX_TIMEOUT_MS=900000  # 15 minutos para índice
// RADAR_REMOTE_FILE_TIMEOUT_MS=300000   # 5 minutos por archivo
