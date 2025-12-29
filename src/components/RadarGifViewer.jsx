import React, { useState, useEffect } from 'react';
import { Calendar, Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { getLatestGif, getGifByDate, getProxyGifUrl, getRemoteGifIndex } from '../services/radarService';

const RadarGifViewer = ({ radarId, isVisible = true, onGifChange }) => {
  const [currentGif, setCurrentGif] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [isRealTime, setIsRealTime] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dailyGifs, setDailyGifs] = useState([]);

  // Cargar fechas disponibles al montar el componente
  useEffect(() => {
    if (isVisible && radarId) {
      loadAvailableDates();
    }
  }, [radarId, isVisible]);

  // Auto-refresh para tiempo real
  useEffect(() => {
    let interval;
    if (isRealTime && autoRefresh && isVisible) {
      interval = setInterval(() => {
        loadLatestGif();
      }, 30000); // Actualizar cada 30 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealTime, autoRefresh, isVisible, radarId]);

  // Cargar GIF inicial
  useEffect(() => {
    if (isVisible && radarId) {
      if (isRealTime) {
        loadLatestGif();
      } else if (selectedDate) {
        loadGifByDate(selectedDate);
      }
    }
  }, [isRealTime, selectedDate, radarId, isVisible]);

  // Notificar cambios de GIF al componente padre
  useEffect(() => {
    if (onGifChange) {
      onGifChange(currentGif);
    }
  }, [currentGif, onGifChange]);

  const loadAvailableDates = async () => {
    try {
      setIsLoading(true);
      // Try local index first
      try {
        const res = await fetch('/radar_gifs/index.json');
        if (res.ok) {
          const local = await res.json();
          const radarBlock = local?.[radarId];
          if (radarBlock && typeof radarBlock === 'object') {
            const dates = Object.keys(radarBlock)
              .filter((d) => Array.isArray(radarBlock[d]) && radarBlock[d].length > 0)
              .sort()
              .reverse();
            setAvailableDates(dates);
            return;
          }
        }
      } catch (_) {
        // ignore and fallback to remote
      }
      // Fallback to remote backend
      const response = await getRemoteGifIndex(radarId);
      if (response.success && Array.isArray(response.index)) {
        const datesWithGifs = response.index
          .filter(entry => Array.isArray(entry.gifs) && entry.gifs.length > 0)
          .map(entry => entry.date)
          .sort()
          .reverse();
        setAvailableDates(datesWithGifs);
      }
    } catch (err) {
      console.error('Error al cargar fechas disponibles:', err);
      setError('Error al cargar fechas disponibles');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLatestGif = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Try local index first
      try {
        const res = await fetch('/radar_gifs/index.json');
        if (res.ok) {
          const local = await res.json();
          const radarBlock = local?.[radarId];
          if (radarBlock && typeof radarBlock === 'object') {
            const sortedDates = Object.keys(radarBlock).sort();
            const lastDate = sortedDates[sortedDates.length - 1];
            const files = radarBlock[lastDate] || [];
            if (files.length > 0) {
              const file = files[files.length - 1];
              setCurrentGif({
                date: lastDate,
                file,
                url: `/radar_gifs/${lastDate}/${file}`,
                timestamp: Date.now()
              });
              return;
            }
          }
        }
      } catch (_) {
        // ignore and fallback to remote
      }
      // Fallback to remote backend
      const response = await getLatestGif(radarId);
      if (response.success && response.gif) {
        setCurrentGif({
          date: response.gif.date,
          file: response.gif.file,
          url: getProxyGifUrl(radarId, response.gif.date, response.gif.file),
          timestamp: response.timestamp
        });
      } else {
        setError('No se encontraron GIFs recientes');
      }
    } catch (err) {
      console.error('Error al cargar GIF más reciente:', err);
      setError('Error al cargar GIF más reciente');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGifByDate = async (date) => {
    try {
      setIsLoading(true);
      setError(null);
      // Try local index first
      try {
        const res = await fetch('/radar_gifs/index.json');
        if (res.ok) {
          const local = await res.json();
          const radarBlock = local?.[radarId];
          const files = radarBlock?.[date] || [];
          if (Array.isArray(files) && files.length > 0) {
            const list = files.map((file) => ({
              date,
              file,
              url: `/radar_gifs/${date}/${file}`,
              timestamp: Date.now(),
            }));
            setDailyGifs(list);
            setCurrentGif(list[list.length - 1]);
            return;
          }
        }
      } catch (_) {
        // ignore and fallback to remote
      }
      // Fallback to remote backend
      const response = await getGifByDate(radarId, date);
      if (response.success && response.gifs && response.gifs.length > 0) {
        const list = response.gifs.map(gif => ({
          date: response.date,
          file: gif.file,
          url: getProxyGifUrl(radarId, response.date, gif.file),
          timestamp: response.timestamp
        }));
        setDailyGifs(list);
        const lastGif = list[list.length - 1];
        setCurrentGif(lastGif);
      } else {
        setError(`No se encontraron GIFs para la fecha ${date}`);
        setDailyGifs([]);
      }
    } catch (err) {
      console.error('Error al cargar GIF por fecha:', err);
      setError('Error al cargar GIF por fecha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setIsRealTime(false);
  };

  const handleRealTimeToggle = () => {
    setIsRealTime(!isRealTime);
    if (!isRealTime) {
      setSelectedDate('');
      loadLatestGif();
    }
  };

  const handleRefresh = () => {
    if (isRealTime) {
      loadLatestGif();
    } else if (selectedDate) {
      loadGifByDate(selectedDate);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
      {/* Header con controles */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          GIF Radar {radarId}
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Toggle tiempo real */}
          <button
            onClick={handleRealTimeToggle}
            className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              isRealTime 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isRealTime ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span>{isRealTime ? 'Tiempo Real' : 'Histórico'}</span>
          </button>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-1 rounded-md transition-colors ${
              autoRefresh 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={autoRefresh ? 'Desactivar auto-actualización' : 'Activar auto-actualización'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Refresh manual */}
          <button
            onClick={handleRefresh}
            className="p-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Actualizar"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selector de fecha histórica */}
      {!isRealTime && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Seleccionar fecha:
          </label>
          <select
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione una fecha...</option>
            {availableDates.map(date => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Información del GIF actual */}
      {currentGif && (
        <div className="mb-3 text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Fecha: {new Date(currentGif.date).toLocaleDateString('es-ES')}
            </span>
            <span>Archivo: {currentGif.file}</span>
          </div>
        </div>
      )}

      {/* Área de visualización del GIF */}
      <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Cargando GIF...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center text-red-600">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {currentGif && !isLoading && !error && (
          <img
            src={currentGif.url}
            alt={`GIF Radar ${radarId} - ${currentGif.date}`}
            className="w-full h-auto max-h-96 object-contain"
            onError={() => setError('Error al cargar la imagen GIF')}
          />
        )}

        {!currentGif && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-500">
            <div className="text-center">
              <p>No hay GIF disponible</p>
              <p className="text-sm">
                {isRealTime ? 'Esperando datos en tiempo real...' : 'Seleccione una fecha'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Galería del día seleccionado */}
      {!isRealTime && dailyGifs.length > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Imágenes del día</h4>
          <div className="grid grid-cols-4 gap-2">
            {dailyGifs.map((gif, idx) => (
              <button
                key={gif.file + idx}
                onClick={() => setCurrentGif(gif)}
                className={`border rounded overflow-hidden hover:ring-2 hover:ring-blue-500 ${
                  currentGif?.file === gif.file ? 'ring-2 ring-blue-600' : ''
                }`}
                title={gif.file}
              >
                <img src={gif.url} alt={gif.file} className="w-full h-20 object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Información adicional */}
      {currentGif && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          Última actualización: {new Date(currentGif.timestamp).toLocaleString('es-ES')}
          {isRealTime && autoRefresh && (
            <span className="ml-2">(Auto-actualización cada 30s)</span>
          )}
        </div>
      )}
    </div>
  );
};

export default RadarGifViewer;