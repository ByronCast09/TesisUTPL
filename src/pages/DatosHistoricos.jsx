import React, { useState, useEffect } from 'react';
import VisorHeader from '../components/VisorHeader';
import VisorSidebar from '../components/VisorSidebar';
import { getAvailableDates, getPngsFromDb } from '../services/radarService';
import { downloadWatermarkedImage } from '../services/watermarkService';
import { Calendar, List, Compass, Eye, Download, ChevronLeft, ChevronRight, X, Info } from 'lucide-react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import TransparentRadarOverlay from '../components/TransparentRadarOverlay';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

// Componente para ajustar automáticamente los bounds del mapa
const FitBoundsOnOverlay = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && Array.isArray(bounds) && bounds.length === 2) {
      try {
        map.fitBounds(bounds, { padding: [20, 20] });
      } catch (e) {
        console.warn('Error ajustando bounds:', e);
      }
    }
  }, [bounds, map]);
  return null;
};

const DatosHistoricos = () => {
  const [lguaxxToggle, setLguaxxToggle] = useState(true);
  const [loxxToggle, setLoxxToggle] = useState(true);
  const [selectedRadar, setSelectedRadar] = useState('Todos los radares');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDateInput, setSelectedDateInput] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [radarImages, setRadarImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [guaxxDates, setGuaxxDates] = useState([]);
  const [loxxDates, setLoxxDates] = useState([]);
  const [guaxxIndex, setGuaxxIndex] = useState({});
  const [loxxIndex, setLoxxIndex] = useState({});
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

  // Cargar índices de ambos radares
  useEffect(() => {
    const loadIndices = async () => {
      try {
        console.log('Cargando fechas disponibles...');

        // Cargar fechas GUAXX
        const guaxxRes = await getAvailableDates('LGUAXX');
        if (guaxxRes?.success && Array.isArray(guaxxRes.dates)) {
          setGuaxxDates(guaxxRes.dates);
        }

        // Cargar fechas LOXX
        const loxxRes = await getAvailableDates('LOXX');
        if (loxxRes?.success && Array.isArray(loxxRes.dates)) {
          setLoxxDates(loxxRes.dates);
        }
      } catch (error) {
        console.error('Error cargando fechas:', error);
      }
    };
    loadIndices();
  }, []);

  // Generar días del mes para el calendario
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Días del mes anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleDateClick = (date) => {
    if (date) {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      setSelectedDate(dateStr);
      setSelectedDateInput(`${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`);
    }
  };

  // Manejar cambio manual en el campo de fecha
  const handleDateInputChange = (value) => {
    setSelectedDateInput(value);
    // Intentar parsear DD/MM/YYYY o DD-MM-YYYY
    const dateMatch = value.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (dateMatch) {
      const day = dateMatch[1];
      const month = dateMatch[2];
      const year = dateMatch[3];
      const dateStr = `${year}-${month}-${day}`;
      setSelectedDate(dateStr);
    }
  };

  // Extraer hora del timestamp o filename
  const extractTime = (timestamp, filename) => {
    if (timestamp) {
      // Intentar parsear timestamp ISO
      try {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) { }

      // Intentar extraer de formato YYYYMMDD_HHMMSS
      const timeMatch = timestamp.match(/(\d{8})_(\d{6})/);
      if (timeMatch) {
        const hour = timeMatch[2].substring(0, 2);
        const minute = timeMatch[2].substring(2, 4);
        return `${hour}:${minute}`;
      }
    }

    // Intentar extraer del filename
    if (filename) {
      const filenameMatch = filename.match(/(\d{8})_(\d{6})/);
      if (filenameMatch) {
        const hour = filenameMatch[2].substring(0, 2);
        const minute = filenameMatch[2].substring(2, 4);
        return `${hour}:${minute}`;
      }
    }

    return '--:--';
  };

  // Calcular intensidad basada en metadatos
  const calculateIntensity = (metadata) => {
    if (!metadata) {
      console.log('calculateIntensity: No metadata');
      return 'Ligera';
    }

    let maxValue = 0;
    let parsedMetadata = metadata;

    if (typeof metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        console.warn('Error parseando metadata para intensidad:', e);
        return 'Ligera';
      }
    }

    // Intentar diferentes formas de obtener el valor máximo
    if (parsedMetadata && typeof parsedMetadata === 'object') {
      // Buscar en metadata.metadata.maxDbz (estructura anidada)
      if (parsedMetadata.metadata && parsedMetadata.metadata.maxDbz !== undefined && parsedMetadata.metadata.maxDbz !== null) {
        maxValue = Number(parsedMetadata.metadata.maxDbz);
      } else if (parsedMetadata.maxDbz !== undefined && parsedMetadata.maxDbz !== null) {
        maxValue = Number(parsedMetadata.maxDbz);
      } else if (parsedMetadata.stats && parsedMetadata.stats.max !== undefined && parsedMetadata.stats.max !== null) {
        maxValue = Number(parsedMetadata.stats.max);
      } else if (parsedMetadata.max !== undefined && parsedMetadata.max !== null) {
        maxValue = Number(parsedMetadata.max);
      } else if (parsedMetadata.vmax !== undefined && parsedMetadata.vmax !== null) {
        maxValue = Number(parsedMetadata.vmax);
      }
    }

    console.log('calculateIntensity - maxValue:', maxValue, 'metadata:', parsedMetadata);

    // Clasificar según dBZ (reflectividad)
    if (maxValue >= 45) return 'Fuerte';
    if (maxValue >= 30) return 'Moderada';
    return 'Ligera';
  };

  // Calcular precipitación estimada (basada en dBZ)
  const estimatePrecipitation = (metadata) => {
    if (!metadata) {
      console.log('estimatePrecipitation: No metadata');
      return '0.0';
    }

    let maxValue = 0;
    let parsedMetadata = metadata;

    if (typeof metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        console.warn('Error parseando metadata para precipitación:', e);
        return '0.0';
      }
    }

    // Intentar diferentes formas de obtener el valor máximo
    if (parsedMetadata && typeof parsedMetadata === 'object') {
      // Buscar en metadata.metadata.maxDbz (estructura anidada)
      if (parsedMetadata.metadata && parsedMetadata.metadata.maxDbz !== undefined && parsedMetadata.metadata.maxDbz !== null) {
        maxValue = Number(parsedMetadata.metadata.maxDbz);
      } else if (parsedMetadata.maxDbz !== undefined && parsedMetadata.maxDbz !== null) {
        maxValue = Number(parsedMetadata.maxDbz);
      } else if (parsedMetadata.stats && parsedMetadata.stats.max !== undefined && parsedMetadata.stats.max !== null) {
        maxValue = Number(parsedMetadata.stats.max);
      } else if (parsedMetadata.max !== undefined && parsedMetadata.max !== null) {
        maxValue = Number(parsedMetadata.max);
      } else if (parsedMetadata.vmax !== undefined && parsedMetadata.vmax !== null) {
        maxValue = Number(parsedMetadata.vmax);
      }
    }

    console.log('estimatePrecipitation - maxValue:', maxValue, 'metadata:', parsedMetadata);

    // Fórmula aproximada: Z = 200 * R^1.6 (Marshall-Palmer)
    // R ≈ (Z/200)^(1/1.6)
    // Pero primero convertir dBZ a Z (linear): Z = 10^(dBZ/10)
    if (maxValue <= 0) {
      console.log('maxValue <= 0, retornando 0.0');
      return '0.0';
    }

    // Convertir dBZ a Z (reflectividad lineal en mm^6/m^3)
    const Z = Math.pow(10, maxValue / 10);

    // Fórmula Marshall-Palmer: Z = 200 * R^1.6
    // Despejar R: R = (Z/200)^(1/1.6)
    const R = Math.pow(Z / 200, 1 / 1.6);

    const result = R.toFixed(1);
    console.log('Precipitación calculada:', { maxValue, Z, R, result });

    return result;
  };

  const handleSearch = async () => {
    if (!selectedDate) {
      alert('Por favor selecciona una fecha');
      return;
    }

    setLoading(true);
    setRecords([]);
    setRadarImages([]);

    try {
      const allRecords = [];
      const images = [];

      // Función auxiliar para procesar PNGs
      const processPngs = (pngs, radarId) => {
        pngs.forEach((png) => {
          const time = extractTime(png.sourceTimestamp || png.timestamp || '', png.filename);
          const metadata = png.metadata || {};

          const intensity = calculateIntensity(metadata);
          const precipitation = estimatePrecipitation(metadata);

          allRecords.push({
            time,
            radar: radarId === 'LGUAXX' ? 'GUAXX' : radarId,
            intensity,
            precipitation: `${precipitation} mm/h`,
            filename: png.filename,
            metadata: metadata
          });

          // Extraer bounds
          let bounds = null;
          if (metadata) {
            let meta = metadata;
            if (typeof meta === 'string') {
              try { meta = JSON.parse(meta); } catch (e) { }
            }
            // Intentar diferentes formatos de bounds
            if (meta && meta.bounds) {
              bounds = meta.bounds;
              // Convertir de formato API a Leaflet si es necesario
              if (bounds.northEast && bounds.southWest) {
                bounds = [
                  [bounds.southWest[0], bounds.southWest[1]],
                  [bounds.northEast[0], bounds.northEast[1]]
                ];
              }
            }
          }
          // Fallback de bounds
          if (!bounds) {
            if (radarId === 'LGUAXX') {
              bounds = [[-4.944622, -80.770709], [-3.136104, -78.967612]];
            } else {
              bounds = [[-5.077081, -80.286881], [-2.914919, -78.124719]];
            }
          }

          // Construir URL si no viene del backend (fallback)
          // Esto es crucial si el backend no se reinició: construimos la URL usando el ID
          let imageUrl = png.url;
          if (!imageUrl && png.id) {
            // Construimos manualmente con una ruta relativa que funcione con el proxy o directa
            imageUrl = 'http://localhost:5000/api/radar/pngs/' + png.id + '/image';
          }

          images.push({
            ...png,
            radar: radarId === 'LGUAXX' ? 'GUAXX' : radarId,
            url: imageUrl,
            bounds: bounds,
            time: time
          });
        });
      };

      // Buscar LGUAXX
      if (selectedRadar === 'Todos los radares' || selectedRadar === 'GUAXX') {
        try {
          const res = await getPngsFromDb('LGUAXX', selectedDate);
          if (res?.success && Array.isArray(res.pngs)) {
            processPngs(res.pngs, 'LGUAXX');
          }
        } catch (e) { console.error('Error fetching LGUAXX:', e); }
      }

      // Buscar LOXX
      if (selectedRadar === 'Todos los radares' || selectedRadar === 'LOXX') {
        try {
          const res = await getPngsFromDb('LOXX', selectedDate);
          if (res?.success && Array.isArray(res.pngs)) {
            processPngs(res.pngs, 'LOXX');
          }
        } catch (e) { console.error('Error fetching LOXX:', e); }
      }

      // Ordenar por hora
      allRecords.sort((a, b) => a.time.localeCompare(b.time));
      images.sort((a, b) => a.time.localeCompare(b.time));

      setRecords(allRecords);
      setRadarImages(images);

      if (allRecords.length === 0) {
        alert('No se encontraron registros para la fecha ' + selectedDate);
      }
    } catch (error) {
      console.error('Error buscando registros:', error);
      alert('Error al buscar registros: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getIntensityColor = (intensity) => {
    switch (intensity) {
      case 'Alta': return 'bg-red-500 text-white';
      case 'Moderada': return 'bg-gray-800 text-white';
      case 'Ligera': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRadarColor = (radar) => {
    return radar === 'GUAXX' ? 'bg-blue-400' : 'bg-gray-600';
  };

  const days = getDaysInMonth(currentMonth);
  const allDates = [...new Set([...guaxxDates, ...loxxDates])].sort();

  return (
    <div className="w-full min-h-screen bg-gray-100 flex relative overflow-hidden">
      {/* Sidebar */}
      <VisorSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <VisorHeader
          lguaxxToggle={lguaxxToggle}
          setLguaxxToggle={setLguaxxToggle}
          loxxToggle={loxxToggle}
          setLoxxToggle={setLoxxToggle}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl ml-auto mr-6">
            {/* Título */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-800">Datos Históricos</h1>
              <p className="text-sm text-gray-500 mt-1">Sistema de Monitoreo Meteorologico - Ecuador Sur</p>
            </div>

            {/* Layout: Filtro izquierdo, Lista derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Panel Izquierdo: Filtro de Búsqueda */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Filtro de Búsqueda</h2>
                  </div>

                  {/* Calendario */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-medium text-gray-700">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </span>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {days.map((date, idx) => {
                        if (!date) {
                          return <div key={idx} className="aspect-square" />;
                        }
                        const dateStr = `${date.getFullYear()} -${String(date.getMonth() + 1).padStart(2, '0')} -${String(date.getDate()).padStart(2, '0')} `;
                        const isSelected = selectedDate === dateStr;
                        const hasData = allDates.includes(dateStr);
                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                          <button
                            key={idx}
                            onClick={() => handleDateClick(date)}
                            className={`aspect - square text - xs rounded transition - colors ${isSelected
                              ? 'bg-blue-600 text-white font-semibold'
                              : hasData
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : isToday
                                  ? 'bg-gray-200 text-gray-700'
                                  : 'text-gray-600 hover:bg-gray-100'
                              } `}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campo de Fecha */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                    <input
                      type="text"
                      value={selectedDateInput}
                      onChange={(e) => handleDateInputChange(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {selectedDate && (
                      <p className="text-xs text-gray-500 mt-1">Fecha seleccionada: {selectedDate}</p>
                    )}
                  </div>

                  {/* Selector de Radar */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Radar</label>
                    <select
                      value={selectedRadar}
                      onChange={(e) => setSelectedRadar(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Todos los radares">Todos los radares</option>
                      <option value="GUAXX">GUAXX</option>
                      <option value="LOXX">LOXX</option>
                    </select>
                  </div>

                  {/* Botón de Búsqueda */}
                  <button
                    onClick={handleSearch}
                    disabled={loading || !selectedDate}
                    className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Buscando...' : 'Buscar Registros'}
                  </button>
                </div>
              </div>

              {/* Panel Derecho: Lista de Registros */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-md p-6 h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <List className="w-5 h-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Lista de Registros</h2>
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {records.length > 0 ? (
                      records.map((record, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowRecordModal(true);
                          }}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-medium text-gray-800">{record.time}</span>
                            <span className={`px - 2 py - 1 rounded text - xs font - medium ${getRadarColor(record.radar)} text - white`}>
                              {record.radar}
                            </span>
                            <span className={`px - 2 py - 1 rounded text - xs font - medium ${getIntensityColor(record.intensity)} `}>
                              {record.intensity}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">
                              Precipitación: {record.precipitation}
                            </span>
                            <Info className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        {selectedDate ? 'No hay registros para la fecha seleccionada' : 'Selecciona una fecha y haz clic en "Buscar Registros"'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Inferior: Imágenes del Radar */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <Compass className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-800">Imágenes del Radar</h2>
              </div>

              {radarImages.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    {radarImages.length} registros Encontrados para {selectedDateInput || selectedDate}
                  </p>

                  {/* Mapa Interactivo */}
                  <div className="mb-4">
                    <div className="h-[400px] w-full border border-gray-200 rounded-lg overflow-hidden relative">
                      {radarImages.length > 0 && radarImages[currentImageIndex] ? (
                        <MapContainer
                          key={`map - ${currentImageIndex} -${radarImages[currentImageIndex].url} `}
                          center={[-3.0, -79.5]}
                          zoom={7}
                          style={{ height: '100%', width: '100%' }}
                          zoomControl={true}
                          scrollWheelZoom={true}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />

                          {/* Círculo de cobertura basado en el radar actual */}
                          {radarImages[currentImageIndex]?.radar === 'GUAXX' && (
                            <Circle
                              center={[-4.040, -79.869]}
                              radius={100000}
                              pathOptions={{
                                color: '#6366f1',
                                fillColor: '#818cf8',
                                fillOpacity: 0.15,
                                weight: 2,
                                opacity: 0.5
                              }}
                            />
                          )}

                          {radarImages[currentImageIndex]?.radar === 'LOXX' && (
                            <Circle
                              center={[-3.996, -79.206]}
                              radius={100000}
                              pathOptions={{
                                color: '#10b981',
                                fillColor: '#34d399',
                                fillOpacity: 0.15,
                                weight: 2,
                                opacity: 0.5
                              }}
                            />
                          )}

                          {radarImages[currentImageIndex].bounds && Array.isArray(radarImages[currentImageIndex].bounds) && radarImages[currentImageIndex].bounds.length === 2 ? (
                            <>
                              <TransparentRadarOverlay
                                key={`overlay-${currentImageIndex}`}
                                url={radarImages[currentImageIndex].url}
                                bounds={radarImages[currentImageIndex].bounds}
                                opacity={0.7}
                                radarId={radarImages[currentImageIndex].radar}
                              />
                              <FitBoundsOnOverlay bounds={radarImages[currentImageIndex].bounds} />
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                              <p className="text-gray-500">Esperando bounds de la imagen...</p>
                            </div>
                          )}
                        </MapContainer>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                          <p className="text-gray-500">No hay imágenes disponibles</p>
                        </div>
                      )}

                      {/* Controles de navegación sobre el mapa */}
                      {radarImages.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : radarImages.length - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors z-[1000]"
                          >
                            <ChevronLeft className="w-5 h-5 text-gray-700" />
                          </button>
                          <button
                            onClick={() => setCurrentImageIndex((prev) => (prev < radarImages.length - 1 ? prev + 1 : 0))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors z-[1000]"
                          >
                            <ChevronRight className="w-5 h-5 text-gray-700" />
                          </button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-lg shadow-lg z-[1000]">
                            <span className="text-sm font-medium text-gray-700">
                              {currentImageIndex + 1} / {radarImages.length} - {radarImages[currentImageIndex]?.time || '--:--'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex gap-3 mb-4">
                    <a
                      href={radarImages[currentImageIndex]?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Ver en nueva pestaña
                    </a>
                    <button
                      onClick={async () => {
                        const currentImage = radarImages[currentImageIndex];
                        if (!currentImage) return;

                        try {
                          // Preparar metadata para la marca de agua
                          const metadata = {
                            radar: currentImage.radar,
                            date: `${selectedDate} - ${currentImage.time}`,
                          };

                          // Generar nombre de archivo
                          const filename = `${currentImage.radar}_${selectedDate}_${currentImage.time.replace(':', '')}.png`;

                          // Descargar con marca de agua
                          await downloadWatermarkedImage(currentImage.url, filename, metadata);
                        } catch (error) {
                          console.error('Error al descargar imagen:', error);
                          alert('Error al generar la imagen. Intentando descarga directa...');
                          // Fallback: descarga directa sin marca de agua
                          const link = document.createElement('a');
                          link.href = currentImage.url;
                          link.download = `${currentImage.radar}_${selectedDate}_${currentImage.time.replace(':', '')}.png`;
                          link.click();
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Descargar
                    </button>
                  </div>

                  {/* Miniaturas con scroll horizontal */}
                  <div className="overflow-x-auto">
                    <div className="flex gap-3 pb-2" style={{ minWidth: 'min-content' }}>
                      {radarImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`relative border - 2 rounded - lg overflow - hidden transition - all flex - shrink - 0 ${currentImageIndex === idx ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-200 hover:border-gray-300'
                            } `}
                          style={{ width: '120px', height: '80px' }}
                        >
                          <img
                            src={img.url}
                            alt={`Miniatura ${idx + 1} `}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'80\'><rect width=\'100%\' height=\'100%\' fill=\'%23f3f4f6\'/></svg>';
                            }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5 text-center">
                            {img.time || '--:--'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {selectedDate ? 'No hay imágenes para la fecha seleccionada' : 'Selecciona una fecha y haz clic en "Buscar Registros" para ver las imágenes'}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal de Información Detallada del Registro */}
      {showRecordModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRecordModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header del Modal */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">Información Detallada del Registro</h3>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-4">
              {/* Información Básica */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Hora</p>
                  <p className="font-semibold text-gray-800">{selectedRecord.time}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Radar</p>
                  <span className={`inline - block px - 2 py - 1 rounded text - xs font - medium ${getRadarColor(selectedRecord.radar)} text - white`}>
                    {selectedRecord.radar}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Intensidad</p>
                  <span className={`inline - block px - 2 py - 1 rounded text - xs font - medium ${getIntensityColor(selectedRecord.intensity)} `}>
                    {selectedRecord.intensity}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Precipitación</p>
                  <p className="font-semibold text-gray-800">{selectedRecord.precipitation}</p>
                </div>
              </div>

              {/* Nombre del Archivo */}
              {selectedRecord.filename && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Archivo</p>
                  <p className="font-mono text-sm text-gray-800 break-all">{selectedRecord.filename}</p>
                </div>
              )}

              {/* Metadatos Detallados */}
              {selectedRecord.metadata && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-3 font-semibold">METADATOS DETALLADOS</p>
                  <div className="space-y-3">
                    {(() => {
                      let meta = selectedRecord.metadata;
                      if (typeof meta === 'string') {
                        try {
                          meta = JSON.parse(meta);
                        } catch (e) {
                          return <p className="text-sm text-gray-600">Error al parsear metadatos</p>;
                        }
                      }

                      if (meta && typeof meta === 'object') {
                        return (
                          <>
                            {/* Stats - Buscar en diferentes ubicaciones */}
                            {(() => {
                              const stats = meta.stats || (meta.metadata && meta.metadata.stats);
                              const maxDbz = meta.metadata?.maxDbz || meta.maxDbz || meta.max;
                              const minDbz = meta.metadata?.minDbz || meta.minDbz || meta.min;

                              if (stats || maxDbz !== undefined || minDbz !== undefined) {
                                return (
                                  <div className="bg-white p-3 rounded border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Estadísticas de Reflectividad (dBZ)</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      {(minDbz !== undefined || (stats && stats.min !== undefined)) && (
                                        <div>
                                          <span className="text-gray-500">Mínimo:</span> <span className="font-medium">{minDbz !== undefined ? minDbz : stats.min} dBZ</span>
                                        </div>
                                      )}
                                      {(maxDbz !== undefined || (stats && stats.max !== undefined)) && (
                                        <div>
                                          <span className="text-gray-500">Máximo:</span> <span className="font-medium">{maxDbz !== undefined ? maxDbz : stats.max} dBZ</span>
                                        </div>
                                      )}
                                      {stats && stats.mean !== undefined && (
                                        <div>
                                          <span className="text-gray-500">Promedio:</span> <span className="font-medium">{stats.mean.toFixed(2)}</span>
                                        </div>
                                      )}
                                      {stats && stats.std !== undefined && (
                                        <div>
                                          <span className="text-gray-500">Desviación:</span> <span className="font-medium">{stats.std.toFixed(2)}</span>
                                        </div>
                                      )}
                                      {stats && stats.validCount !== undefined && (
                                        <div>
                                          <span className="text-gray-500">Datos válidos:</span> <span className="font-medium">{stats.validCount.toLocaleString()}</span>
                                        </div>
                                      )}
                                      {stats && stats.totalCount !== undefined && (
                                        <div>
                                          <span className="text-gray-500">Total:</span> <span className="font-medium">{stats.totalCount.toLocaleString()}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Bounds - Buscar en diferentes ubicaciones */}
                            {(() => {
                              const bounds = meta.bounds || (meta.metadata && meta.metadata.bounds);
                              const projection = meta.projection || (meta.metadata && meta.metadata.projection);

                              if (bounds || projection) {
                                return (
                                  <div className="bg-white p-3 rounded border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Límites Geográficos</p>
                                    <div className="text-sm space-y-2">
                                      {bounds && Array.isArray(bounds) && bounds.length === 2 && (
                                        <>
                                          <div>
                                            <span className="text-gray-500">Suroeste:</span> <span className="font-mono">{bounds[0][0]}, {bounds[0][1]}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Noreste:</span> <span className="font-mono">{bounds[1][0]}, {bounds[1][1]}</span>
                                          </div>
                                        </>
                                      )}
                                      {bounds && bounds.southWest && (
                                        <>
                                          <div>
                                            <span className="text-gray-500">Suroeste:</span> <span className="font-mono">{bounds.southWest[0]}, {bounds.southWest[1]}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Noreste:</span> <span className="font-mono">{bounds.northEast[0]}, {bounds.northEast[1]}</span>
                                          </div>
                                        </>
                                      )}
                                      {projection && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <p className="text-xs font-semibold text-gray-600 mb-1">Proyección (Esquinas)</p>
                                          <div className="grid grid-cols-2 gap-1 text-xs">
                                            <div>
                                              <span className="text-gray-500">Lat LL:</span> <span className="font-mono">{projection.lat_ll}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">Lon LL:</span> <span className="font-mono">{projection.lon_ll}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">Lat UL:</span> <span className="font-mono">{projection.lat_ul}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">Lon UL:</span> <span className="font-mono">{projection.lon_ul}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">Lat UR:</span> <span className="font-mono">{projection.lat_ur}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">Lon UR:</span> <span className="font-mono">{projection.lon_ur}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">Lat LR:</span> <span className="font-mono">{projection.lat_lr}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">Lon LR:</span> <span className="font-mono">{projection.lon_lr}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Información del Radar (Ubicación y Altitud) */}
                            {meta.radar_info && (
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Ubicación del Radar</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {meta.radar_info.name && (
                                    <div>
                                      <span className="text-gray-500">Nombre:</span> <span className="font-medium">{meta.radar_info.name}</span>
                                    </div>
                                  )}
                                  {meta.radar_info.id && (
                                    <div>
                                      <span className="text-gray-500">ID:</span> <span className="font-medium">{meta.radar_info.id}</span>
                                    </div>
                                  )}
                                  {meta.radar_info.lat !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Latitud:</span> <span className="font-mono">{meta.radar_info.lat}°</span>
                                    </div>
                                  )}
                                  {meta.radar_info.lon !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Longitud:</span> <span className="font-mono">{meta.radar_info.lon}°</span>
                                    </div>
                                  )}
                                  {meta.radar_info.height !== undefined && (
                                    <div className="col-span-2">
                                      <span className="text-gray-500">Altitud:</span> <span className="font-medium">{meta.radar_info.height} m</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Dimensiones de la Imagen */}
                            {meta.image_dimensions && (
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Dimensiones de la Imagen</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {meta.image_dimensions.width !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Ancho:</span> <span className="font-medium">{meta.image_dimensions.width} px</span>
                                    </div>
                                  )}
                                  {meta.image_dimensions.height !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Alto:</span> <span className="font-medium">{meta.image_dimensions.height} px</span>
                                    </div>
                                  )}
                                  {meta.image_dimensions.aspect_ratio !== undefined && (
                                    <div className="col-span-2">
                                      <span className="text-gray-500">Aspect Ratio:</span> <span className="font-medium">{meta.image_dimensions.aspect_ratio.toFixed(3)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Información de Dimensiones */}
                            {(() => {
                              const cols = meta.cols || meta.metadata?.cols || (meta.shape && meta.shape[1]);
                              const rows = meta.rows || meta.metadata?.rows || (meta.shape && meta.shape[0]);
                              const depth = meta.depth || meta.metadata?.depth;

                              if (cols !== undefined || rows !== undefined || depth !== undefined) {
                                return (
                                  <div className="bg-white p-3 rounded border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Dimensiones de la Imagen</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      {cols !== undefined && (
                                        <div>
                                          <span className="text-gray-500">Columnas:</span> <span className="font-medium">{cols}</span>
                                        </div>
                                      )}
                                      {rows !== undefined && (
                                        <div>
                                          <span className="text-gray-500">Filas:</span> <span className="font-medium">{rows}</span>
                                        </div>
                                      )}
                                      {depth !== undefined && (
                                        <div>
                                          <span className="text-gray-500">Profundidad:</span> <span className="font-medium">{depth} bits</span>
                                        </div>
                                      )}
                                      {meta.image_dimensions && (
                                        <>
                                          {meta.image_dimensions.width && (
                                            <div>
                                              <span className="text-gray-500">Ancho PNG:</span> <span className="font-medium">{meta.image_dimensions.width} px</span>
                                            </div>
                                          )}
                                          {meta.image_dimensions.height && (
                                            <div>
                                              <span className="text-gray-500">Alto PNG:</span> <span className="font-medium">{meta.image_dimensions.height} px</span>
                                            </div>
                                          )}
                                          {meta.image_dimensions.aspect_ratio && (
                                            <div className="col-span-2">
                                              <span className="text-gray-500">Aspect Ratio:</span> <span className="font-medium">{meta.image_dimensions.aspect_ratio.toFixed(3)}</span>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Información General */}
                            <div className="bg-white p-3 rounded border border-gray-200">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Información General</p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {(meta.radarId || meta.radar || meta.metadata?.radarId) && (
                                  <div>
                                    <span className="text-gray-500">Radar ID:</span> <span className="font-medium">{meta.radarId || meta.radar || meta.metadata?.radarId}</span>
                                  </div>
                                )}
                                {(meta.radarName || meta.metadata?.radarName) && (
                                  <div>
                                    <span className="text-gray-500">Nombre Radar:</span> <span className="font-medium">{meta.radarName || meta.metadata?.radarName}</span>
                                  </div>
                                )}
                                {(meta.productType || meta.metadata?.productType || meta.dataset) && (
                                  <div>
                                    <span className="text-gray-500">Tipo Producto:</span> <span className="font-medium">{meta.productType || meta.metadata?.productType || meta.dataset}</span>
                                  </div>
                                )}
                                {(meta.vmin !== undefined || meta.metadata?.vmin !== undefined) && (
                                  <div>
                                    <span className="text-gray-500">VMin:</span> <span className="font-medium">{meta.vmin !== undefined ? meta.vmin : meta.metadata?.vmin}</span>
                                  </div>
                                )}
                                {(meta.vmax !== undefined || meta.metadata?.vmax !== undefined) && (
                                  <div>
                                    <span className="text-gray-500">VMax:</span> <span className="font-medium">{meta.vmax !== undefined ? meta.vmax : meta.metadata?.vmax}</span>
                                  </div>
                                )}
                                {(meta.cmap || meta.metadata?.cmap) && (
                                  <div>
                                    <span className="text-gray-500">Colormap:</span> <span className="font-medium">{meta.cmap || meta.metadata?.cmap}</span>
                                  </div>
                                )}
                                {(meta.transparentBelow !== undefined || meta.metadata?.transparentBelow !== undefined) && (
                                  <div>
                                    <span className="text-gray-500">Transparente bajo:</span> <span className="font-medium">{meta.transparentBelow !== undefined ? meta.transparentBelow : meta.metadata?.transparentBelow}</span>
                                  </div>
                                )}
                                {(meta.status || meta.metadata?.status) && (
                                  <div>
                                    <span className="text-gray-500">Estado:</span> <span className="font-medium">{meta.status || meta.metadata?.status}</span>
                                  </div>
                                )}
                                {(meta.fileSize || meta.metadata?.fileSize) && (
                                  <div>
                                    <span className="text-gray-500">Tamaño archivo:</span> <span className="font-medium">{(meta.fileSize || meta.metadata?.fileSize).toLocaleString()} bytes</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Información del Archivo Fuente (Source) */}
                            {meta.source && (
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Archivo Fuente Original</p>
                                <div className="space-y-2 text-sm">
                                  {meta.source.ppi_path && (
                                    <div>
                                      <span className="text-gray-500">Ruta PPI:</span>
                                      <p className="font-mono text-xs text-gray-600 break-all mt-1">{meta.source.ppi_path}</p>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-2">
                                    {meta.source.radar_id && (
                                      <div>
                                        <span className="text-gray-500">Radar ID:</span> <span className="font-medium">{meta.source.radar_id}</span>
                                      </div>
                                    )}
                                    {meta.source.product_type && (
                                      <div>
                                        <span className="text-gray-500">Tipo:</span> <span className="font-medium">{meta.source.product_type}</span>
                                      </div>
                                    )}
                                    {meta.source.datatype && (
                                      <div>
                                        <span className="text-gray-500">Tipo dato:</span> <span className="font-medium">{meta.source.datatype}</span>
                                      </div>
                                    )}
                                    {meta.source.version && (
                                      <div>
                                        <span className="text-gray-500">Versión:</span> <span className="font-medium">{meta.source.version}</span>
                                      </div>
                                    )}
                                    {meta.source.cols !== undefined && (
                                      <div>
                                        <span className="text-gray-500">Columnas fuente:</span> <span className="font-medium">{meta.source.cols}</span>
                                      </div>
                                    )}
                                    {meta.source.rows !== undefined && (
                                      <div>
                                        <span className="text-gray-500">Filas fuente:</span> <span className="font-medium">{meta.source.rows}</span>
                                      </div>
                                    )}
                                    {meta.source.depth !== undefined && (
                                      <div>
                                        <span className="text-gray-500">Profundidad:</span> <span className="font-medium">{meta.source.depth} bits</span>
                                      </div>
                                    )}
                                    {meta.source.date_directory && (
                                      <div>
                                        <span className="text-gray-500">Directorio fecha:</span> <span className="font-medium">{meta.source.date_directory}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Información Adicional (elevation, azimuth, range, etc.) */}
                            {(meta.elevation !== undefined || meta.azimuth !== undefined || meta.range !== undefined || meta.scan_type || meta.sweep_number !== undefined) && (
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Parámetros de Escaneo</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {meta.elevation !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Elevación:</span> <span className="font-medium">{meta.elevation}°</span>
                                    </div>
                                  )}
                                  {meta.azimuth !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Azimut:</span> <span className="font-medium">{meta.azimuth}°</span>
                                    </div>
                                  )}
                                  {meta.range !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Rango:</span> <span className="font-medium">{meta.range} km</span>
                                    </div>
                                  )}
                                  {meta.scan_type && (
                                    <div>
                                      <span className="text-gray-500">Tipo de escaneo:</span> <span className="font-medium">{meta.scan_type}</span>
                                    </div>
                                  )}
                                  {meta.sweep_number !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Sweep número:</span> <span className="font-medium">{meta.sweep_number}</span>
                                    </div>
                                  )}
                                  {meta.beam_width !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Ancho de haz:</span> <span className="font-medium">{meta.beam_width}°</span>
                                    </div>
                                  )}
                                  {meta.pulse_width !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Ancho de pulso:</span> <span className="font-medium">{meta.pulse_width} μs</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Información del Archivo Fuente */}
                            {meta.sourceFile && (
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Archivo Fuente</p>
                                <p className="font-mono text-xs text-gray-600 break-all">{meta.sourceFile}</p>
                              </div>
                            )}

                            {/* Timestamps */}
                            {(() => {
                              const timestamp = meta.timestamp || meta.metadata?.timestamp;
                              const sourceTimestamp = meta.sourceTimestamp || meta.metadata?.sourceTimestamp;
                              const generatedAt = meta.generatedAt || meta.metadata?.generatedAt;
                              const date = meta.date || meta.metadata?.date;

                              if (timestamp || sourceTimestamp || generatedAt || date) {
                                return (
                                  <div className="bg-white p-3 rounded border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Fechas y Horas</p>
                                    <div className="text-sm space-y-1">
                                      {timestamp && (
                                        <div>
                                          <span className="text-gray-500">Timestamp:</span> <span className="font-mono">{new Date(timestamp).toLocaleString('es-ES')}</span>
                                        </div>
                                      )}
                                      {sourceTimestamp && (
                                        <div>
                                          <span className="text-gray-500">Timestamp Origen:</span> <span className="font-mono">{new Date(sourceTimestamp).toLocaleString('es-ES')}</span>
                                        </div>
                                      )}
                                      {generatedAt && (
                                        <div>
                                          <span className="text-gray-500">Generado en:</span> <span className="font-mono">{new Date(generatedAt).toLocaleString('es-ES')}</span>
                                        </div>
                                      )}
                                      {date && (
                                        <div>
                                          <span className="text-gray-500">Fecha:</span> <span className="font-medium">{date}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Metadata completo en JSON (colapsable) */}
                            <details className="bg-white p-3 rounded border border-gray-200">
                              <summary className="text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
                                Ver JSON Completo
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-60">
                                {JSON.stringify(meta, null, 2)}
                              </pre>
                            </details>
                          </>
                        );
                      }
                      return <p className="text-sm text-gray-600">No hay metadatos disponibles</p>;
                    })()}
                  </div>
                </div>
              )}

              {/* Si no hay metadatos */}
              {!selectedRecord.metadata && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">No hay metadatos disponibles para este registro</p>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowRecordModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatosHistoricos;
