import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import { Image, Wifi, WifiOff } from 'lucide-react';
import VisorHeader from '../components/VisorHeader';
import VisorSidebar from '../components/VisorSidebar';
import TransparentRadarOverlay from '../components/TransparentRadarOverlay';
import { getLatestProcessedImage, getTimelineEntries, buildLocalAssetUrl, getAvailableDates, requestProcessDate, getDailyGif, getHistoricalIndex, getRemoteIndex, getProxyImageUrl, getGifByDate, getProxyGifUrl, getPngIndexFromDbForViewer } from '../services/radarService';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import '../styles/radar.css';

const parseTimeInput = (value) => {
    if (!value || typeof value !== 'string') return null;
    const [hoursStr, minutesStr] = value.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
};

const toTimeInputValue = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const getMinutesFromTimestamp = (iso) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.getHours() * 60 + date.getMinutes();
};

const formatFullTimeLabel = (timestamp) => {
    if (!timestamp) return '--:--:--';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '--:--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};


const Visor = () => {
    const [lguaxxToggle, setLguaxxToggle] = useState(true);
    const [loxxToggle, setLoxxToggle] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [showGifViewer, setShowGifViewer] = useState(true);
    const [selectedRadarForPng] = useState('LGUAXX');
    const [currentRadarPng, setCurrentRadarPng] = useState(null);
    const [currentLoxxPng, setCurrentLoxxPng] = useState(null); // Estado para LOXX
    const [availableDatesPng, setAvailableDatesPng] = useState([]);
    const [selectedDateForPng, setSelectedDateForPng] = useState('');
    const [timelineByDate, setTimelineByDate] = useState({});
    const [framesForDate, setFramesForDate] = useState([]);
    const [selectedFrameIndex, setSelectedFrameIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [animationPlaying, setAnimationPlaying] = useState(false); // NUEVO estado para animación
    const [playSpeed, setPlaySpeed] = useState(1000);
    const [processingDate, setProcessingDate] = useState(false);
    const requestedDateRef = useRef(null);
    const userSelectedDateRef = useRef(false);
    const [currentRadarGif, setCurrentRadarGif] = useState(null);
    const [showGif, setShowGif] = useState(false);
    const [historicalIndex, setHistoricalIndex] = useState(null);
    const [historicalLoading, setHistoricalLoading] = useState(false);
    const [selectedHistoricalCategory, setSelectedHistoricalCategory] = useState('');
    const [selectedHistoricalYear, setSelectedHistoricalYear] = useState(null);
    const [selectedHistoricalMonth, setSelectedHistoricalMonth] = useState(null);
    const [recentWindows, setRecentWindows] = useState([]);
    const [activeWindowId, setActiveWindowId] = useState(null);
    const [selectedDateInput, setSelectedDateInput] = useState('');
    // Capas WMS dinámicas
    const [lguaxxWms, setLguaxxWms] = useState(null);
    // Estado para overlay de GIF de radar
    const [radarOverlayOpacity, setRadarOverlayOpacity] = useState(0.65);
    // Estados para radar remoto
    const [remoteRadarEnabled, setRemoteRadarEnabled] = useState(false);
    const [remoteServerStatus, setRemoteServerStatus] = useState(false);
    const [remoteRadarInfo, setRemoteRadarInfo] = useState(null);
    const [remoteDates, setRemoteDates] = useState([]);
    const [selectedRemoteDate, setSelectedRemoteDate] = useState('');
    const [remoteImages, setRemoteImages] = useState([]);
    const [selectedRemoteImage, setSelectedRemoteImage] = useState('');
    const [remoteIndexByDate, setRemoteIndexByDate] = useState({});
    const [remoteError, setRemoteError] = useState(null);
    // Controles adicionales para filtrado/fechas/búsqueda
    const [timeRangeStart, setTimeRangeStart] = useState('');
    const [timeRangeEnd, setTimeRangeEnd] = useState('');
    const remoteIndexFetchedAtRef = useRef(0);
    const remoteFramesCacheRef = useRef(new Map());
    const animationStartedRef = useRef(false); // Para evitar loop infinito
    const animationIndexRef = useRef(0); // Contador para animación
    const [debugError, setDebugError] = useState(null); // Para mostrar errores en UI
    const [debugLog, setDebugLog] = useState(''); // Para mostrar logs en UI
    const [tickCount, setTickCount] = useState(0); // Contador de ticks
    const [animationFrameIndex, setAnimationFrameIndex] = useState(0); // Frame actual durante animación


    const geoserverWorkspace = import.meta?.env?.VITE_GEOSERVER_WORKSPACE || '';

    const currentHistoricalCategory = historicalIndex?.categories?.find((cat) => cat.id === selectedHistoricalCategory) || historicalIndex?.categories?.[0] || null;
    const enableAutoProcess = import.meta?.env?.VITE_ENABLE_AUTO_PROCESS === 'true';
    const historicalYears = currentHistoricalCategory?.years || [];
    const historicalYearEntry = historicalYears.find((year) => year.year === selectedHistoricalYear) || historicalYears[historicalYears.length - 1] || null;
    const historicalMonths = historicalYearEntry?.months || [];
    const historicalMonthEntry = historicalMonths.find((month) => month.month === selectedHistoricalMonth) || historicalMonths[historicalMonths.length - 1] || null;
    const historicalDates = historicalMonthEntry?.dates || [];
    const activeWindow = recentWindows.find((window) => window.id === activeWindowId) || null;
    const minAvailableDate = availableDatesPng.length ? availableDatesPng[0] : '';
    const maxAvailableDate = availableDatesPng.length ? availableDatesPng[availableDatesPng.length - 1] : '';
    const minAvailableMonth = minAvailableDate ? minAvailableDate.slice(0, 7) : '';
    const maxAvailableMonth = maxAvailableDate ? maxAvailableDate.slice(0, 7) : '';
    const selectedMonthValue = (selectedHistoricalYear && selectedHistoricalMonth)
        ? `${selectedHistoricalYear}-${String(selectedHistoricalMonth).padStart(2, '0')}`
        : '';
    const selectedMonthLabel = historicalMonthEntry?.monthName || '';

    const filteredFrameIndices = useMemo(() => {
        if (!framesForDate.length) return [];
        const start = parseTimeInput(timeRangeStart);
        const end = parseTimeInput(timeRangeEnd);
        if (start !== null && end !== null && end < start) {
            return [];
        }
        return framesForDate.reduce((acc, frame, index) => {
            const minutes = getMinutesFromTimestamp(frame?.timestamp);
            if (minutes === null) {
                acc.push(index);
                return acc;
            }
            if (start !== null && minutes < start) return acc;
            if (end !== null && minutes > end) return acc;
            acc.push(index);
            return acc;
        }, []);
    }, [framesForDate, timeRangeStart, timeRangeEnd]);

    const visibleFrames = useMemo(
        () => filteredFrameIndices.map((index) => framesForDate[index]).filter(Boolean),
        [filteredFrameIndices, framesForDate]
    );

    const hasFrames = framesForDate.length > 0;
    const hasVisibleFrames = visibleFrames.length > 0;
    const showPlaybackPanel = true;
    const panelDisabled = !currentRadarPng && !currentRadarGif;

    const applyQuickRange = (minutesBack) => {
        if (!framesForDate.length) return;
        const latestFrame = framesForDate[framesForDate.length - 1];
        const latestDate = new Date(latestFrame.timestamp);
        if (Number.isNaN(latestDate.getTime())) return;
        const endValue = toTimeInputValue(latestDate);
        const startDate = new Date(latestDate.getTime() - minutesBack * 60_000);
        setTimeRangeStart(toTimeInputValue(startDate));
        setTimeRangeEnd(endValue);
    };

    // Animación automática de frames
    React.useEffect(() => {
        try {
            setDebugError(null); // Limpiar errores previos

            setDebugLog(`useEffect: playing=${animationPlaying}, frames=${visibleFrames.length}`);

            if (!animationPlaying || visibleFrames.length === 0) {
                setDebugLog(prev => prev + ' | NO CUMPLE CONDICIÓN');
                return;
            }

            // Resetear frame al inicio
            setAnimationFrameIndex(0);

            setDebugLog(prev => prev + ' | CREANDO INTERVAL...');
            const intervalId = setInterval(() => {
                setTickCount(prev => prev + 1);
                try {
                    setAnimationFrameIndex(prevIndex => {
                        const nextIndex = prevIndex + 1;
                        setDebugLog(`Tick! Frame: ${prevIndex} → ${nextIndex}`);
                        if (nextIndex >= visibleFrames.length) {
                            setAnimationPlaying(false);
                            return 0;
                        }
                        // Aplicar el frame al mapa
                        if (visibleFrames[nextIndex]) {
                            handleSelectFrame(nextIndex, true);
                        }
                        return nextIndex;
                    });
                } catch (err) {
                    setDebugError(`Error en interval: ${err.message}`);
                    setAnimationPlaying(false);
                }
            }, playSpeed);

            setDebugLog(prev => prev + ` | INTERVAL ID: ${intervalId}`);
            return () => {
                setDebugLog(prev => prev + ' | LIMPIANDO');
                clearInterval(intervalId);
            };
        } catch (err) {
            setDebugError(`Error en useEffect: ${err.message}`);
        }
    }, [animationPlaying, visibleFrames.length, playSpeed]); // Removido selectedRadarForPng



    // Coordenadas de los radares
    const radarCoordinates = {
        LGUAXX: [-0.2, -78.5],
        LOXX: [-3.8, -79.2]
    };

    // Bounds para los overlays de radar (aproximadamente 100km de radio)
    const radarBounds = {
        LGUAXX: [
            [-4.938786, -80.770638],
            [-3.140217, -78.967363]
        ]
    };

    // Manejar cambio de GIF de radar
    // const handleGifChange = (gifData) => {
    //   setCurrentRadarGif(gifData);
    // };

    // Carga PNG local más reciente para el radar
    const apiUrl = (import.meta?.env?.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
    const enableLocalWms = import.meta?.env?.VITE_ENABLE_LOCAL_WMS === 'true';

    // Funciones para radar remoto
    const loadRemoteDates = async (force = false) => {
        const radarId = selectedRadarForPng;
        try {
            const now = Date.now();
            const hasCached =
                !force &&
                remoteDates.length &&
                Object.keys(remoteIndexByDate).length &&
                now - remoteIndexFetchedAtRef.current < 60_000;
            if (hasCached) {
                return { dates: remoteDates, index: remoteIndexByDate };
            }

            // Usar PostgreSQL local en lugar de PC remota
            const response = await getPngIndexFromDbForViewer(radarId);
            if (!response?.success || !Array.isArray(response.index)) {
                throw new Error('Respuesta inválida del índice de PostgreSQL');
            }

            const indexMap = {};
            let totalFiles = 0;
            let remoteBaseUrl = null;

            response.index.forEach((entry) => {
                if (!entry?.date) {
                    return;
                }
                const pngFiles = Array.isArray(entry.png) ? entry.png : [];
                const normalizedPng = pngFiles
                    .map((file) => {
                        const name = file?.name || file?.file || file?.filename;
                        if (!name) {
                            return null;
                        }
                        const url = file?.url || getProxyImageUrl(radarId, entry.date, name);
                        if (!remoteBaseUrl) {
                            try {
                                remoteBaseUrl = new URL(url).origin;
                            } catch (_) {
                                remoteBaseUrl = null;
                            }
                        }
                        const timestampMatch = name.match(/(\d{8}_\d{6})/);
                        const timestamp = timestampMatch ? timestampMatch[1] : name.replace(/\.[^.]+$/, '');
                        return {
                            filename: name,
                            url,
                            timestamp,
                            bbox: file?.bbox || null,
                            meta: file?.meta || null
                        };
                    })
                    .filter(Boolean);

                indexMap[entry.date] = {
                    png: normalizedPng,
                    nc: Array.isArray(entry.nc) ? entry.nc : []
                };
                totalFiles += normalizedPng.length;
            });

            const dateList = Object.keys(indexMap).sort();
            setRemoteIndexByDate(indexMap);
            setRemoteDates(dateList);
            remoteIndexFetchedAtRef.current = Date.now();
            remoteFramesCacheRef.current.clear();

            // PRESERVAR la fecha seleccionada por el usuario si todavía existe
            // Solo cambiar a la fecha más reciente si no hay fecha seleccionada o si la fecha seleccionada ya no existe
            const nextDate = (() => {
                // Si hay una fecha seleccionada y todavía existe en el nuevo índice, mantenerla
                if (selectedRemoteDate && indexMap[selectedRemoteDate]) {
                    return selectedRemoteDate;
                }
                // Si no hay fecha seleccionada o la fecha seleccionada ya no existe, usar la más reciente
                // PERO solo si no hay una fecha seleccionada previamente (evitar cambiar automáticamente)
                if (!selectedRemoteDate && dateList.length) {
                    return dateList[dateList.length - 1];
                }
                // Si la fecha seleccionada ya no existe, mantenerla vacía o usar la más reciente
                // (esto evita que se cambie automáticamente cuando el usuario seleccionó una fecha específica)
                return selectedRemoteDate || (dateList.length ? dateList[dateList.length - 1] : '');
            })();

            // Solo actualizar la fecha si realmente cambió o si no había fecha seleccionada
            if (nextDate !== selectedRemoteDate) {
                setSelectedRemoteDate(nextDate);
            }

            const imagesForDate = nextDate ? (indexMap[nextDate]?.png || []) : [];
            setRemoteImages(imagesForDate);

            const nextImage = (() => {
                if (!imagesForDate.length) return '';
                if (selectedRemoteImage && imagesForDate.some((img) => img.filename === selectedRemoteImage)) {
                    return selectedRemoteImage;
                }
                return imagesForDate[imagesForDate.length - 1].filename;
            })();

            setSelectedRemoteImage(nextImage);

            setRemoteServerStatus(true);
            setRemoteRadarInfo({
                radarId: response.radar || radarId,
                totalFiles,
                availableDates: dateList,
                lastUpdated: new Date().toISOString(),
                serverUrl: remoteBaseUrl || '',
                source: response.source || 'postgresql' // Indicar que viene de PostgreSQL
            });
            setRemoteError(null);

            return { dates: dateList, index: indexMap };
        } catch (error) {
            console.error('Error cargando fechas remotas:', error);
            setRemoteIndexByDate({});
            setRemoteDates([]);
            setRemoteImages([]);
            setSelectedRemoteDate('');
            setSelectedRemoteImage('');
            setRemoteServerStatus(false);
            setRemoteRadarInfo(null);
            remoteIndexFetchedAtRef.current = 0;
            remoteFramesCacheRef.current.clear();
            const message = error?.response?.data?.message || error?.message || 'No se pudo conectar con PostgreSQL';
            setRemoteError(message);
            return { dates: [], index: {} };
        }
    };

    const checkRemoteServer = async () => {
        try {
            const result = await loadRemoteDates();
            return result.dates.length > 0;
        } catch (error) {
            console.error('Error en checkRemoteServer:', error);
            setRemoteError(error?.message || 'Error al conectar con PostgreSQL');
            setRemoteServerStatus(false);
            throw error; // Re-lanzar para que el useEffect pueda manejarlo
        }
    };

    const updateRemoteImagesForDate = (date, indexMap = remoteIndexByDate) => {
        if (!date || !indexMap[date]) {
            setRemoteImages([]);
            setSelectedRemoteImage('');
            return;
        }
        const images = indexMap[date].png || [];
        setRemoteImages(images);
        let nextImage = selectedRemoteImage;
        if (!nextImage || !images.some((img) => img.filename === nextImage)) {
            nextImage = images.length ? images[images.length - 1].filename : '';
        }
        setSelectedRemoteImage(nextImage);
    };

    const loadRemoteImage = async (imageFilename, dateOverride = null, indexMap = remoteIndexByDate) => {
        if (!imageFilename) return false;
        const targetDate = dateOverride || selectedRemoteDate;
        const entry = targetDate ? indexMap[targetDate] : null;
        const found = entry?.png?.find((img) => img.filename === imageFilename) || null;
        // Si viene de PostgreSQL, usar la URL directa del endpoint
        const url = found?.url || (targetDate ? getProxyImageUrl(selectedRadarForPng, targetDate, imageFilename) : null);
        if (!url) {
            console.warn('No se pudo determinar la URL para la imagen seleccionada');
            return false;
        }
        const bounds = found?.bbox?.southWest && found?.bbox?.northEast
            ? [found.bbox.southWest, found.bbox.northEast]
            : radarBounds[selectedRadarForPng];

        setCurrentRadarPng({
            url,
            timestamp: found?.timestamp || extractTimestampFromFilename(targetDate, imageFilename),
            bounds,
            source: 'postgresql', // Cambiar a PostgreSQL
            metadata: found?.meta || found?.metadata || null
        });

        return true;
    };

    const loadLatestRemoteImage = async () => {
        let dates = remoteDates;
        let indexMap = remoteIndexByDate;
        if (!dates.length) {
            const result = await loadRemoteDates();
            dates = result.dates;
            indexMap = result.index;
        }
        if (!dates.length) {
            console.warn('No hay fechas remotas disponibles');
            return false;
        }
        const latestDate = dates[dates.length - 1];
        const entry = indexMap[latestDate] || null;
        const images = entry?.png || [];
        if (!images.length) {
            console.warn(`No hay imágenes PNG para la fecha ${latestDate}`);
            return false;
        }
        const latestImage = images[images.length - 1];
        setSelectedRemoteDate(latestDate);
        setSelectedRemoteImage(latestImage.filename);
        await loadRemoteImage(latestImage.filename, latestDate, indexMap);
        return true;
    };

    const applyTimelineEntry = (radarId, entry) => {
        if (!entry) {
            setCurrentRadarPng(null);
            return;
        }

        const metaBounds = entry.metadata?.bounds || entry.bounds || entry.remoteBounds;
        const bounds = normalizeBounds(metaBounds, radarId);

        let url = null;
        let source = entry.source || 'local';

        if (entry.local?.publicPng) {
            url = buildLocalAssetUrl(entry.local.publicPng);
            source = 'local';
        } else if (entry.remote?.url) {
            url = entry.remote.url;
            source = entry.remote.source || 'remote';
        } else if (entry.url) {
            url = entry.url;
            source = entry.source || 'remote';
        }

        if (!url) {
            setCurrentRadarPng(null);
            return;
        }

        setCurrentRadarPng({
            url,
            timestamp: entry.timestamp || Date.now(),
            bounds,
            metadata: entry.metadata || null,
            source
        });
    };

    const mergeUniqueDates = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();

    const extractDatesFromHistorical = (indexData) => {
        if (!indexData?.categories) {
            return [];
        }
        const collected = [];
        indexData.categories.forEach((category) => {
            (category.years || []).forEach((year) => {
                (year.months || []).forEach((month) => {
                    (month.dates || []).forEach((day) => {
                        if (day?.date) {
                            collected.push(day.date);
                        }
                    });
                });
            });
        });
        return collected;
    };

    const syncHistoricalSelections = (indexData) => {
        if (!indexData?.categories?.length) {
            setSelectedHistoricalCategory('');
            setSelectedHistoricalYear(null);
            setSelectedHistoricalMonth(null);
            return;
        }
        const currentCategory = indexData.categories.find((cat) => cat.id === selectedHistoricalCategory) || indexData.categories[0];
        if (selectedHistoricalCategory !== currentCategory.id) {
            setSelectedHistoricalCategory(currentCategory.id);
        }
        const years = currentCategory.years || [];
        if (!years.length) {
            setSelectedHistoricalYear(null);
            setSelectedHistoricalMonth(null);
            return;
        }
        const hasYear = years.some((year) => year.year === selectedHistoricalYear);
        const targetYear = hasYear ? years.find((year) => year.year === selectedHistoricalYear) : years[years.length - 1];
        if (!hasYear && targetYear) {
            setSelectedHistoricalYear(targetYear.year);
        }
        const months = targetYear?.months || [];
        if (!months.length) {
            setSelectedHistoricalMonth(null);
            return;
        }
        const hasMonth = months.some((month) => month.month === selectedHistoricalMonth);
        const targetMonth = hasMonth ? months.find((month) => month.month === selectedHistoricalMonth) : months[months.length - 1];
        if (!hasMonth && targetMonth) {
            setSelectedHistoricalMonth(targetMonth.month);
        }
    };

    const handleHistoricalSelectDate = (dateStr) => {
        if (!dateStr) {
            setSelectedDateForPng('');
            setFramesForDate([]);
            setSelectedFrameIndex(-1);
            setIsPlaying(false);
            setCurrentRadarGif(null);
            setShowGif(false);
            setCurrentRadarPng(null);
            return;
        }
        setSelectedDateInput(dateStr);
        const [yearStr, monthStr] = dateStr.split('-');
        if (yearStr) {
            const yearNum = Number(yearStr);
            if (!Number.isNaN(yearNum)) {
                setSelectedHistoricalYear(yearNum);
            }
        }
        if (monthStr) {
            const monthNum = Number(monthStr);
            if (!Number.isNaN(monthNum)) {
                setSelectedHistoricalMonth(monthNum);
            }
        }
        setActiveWindowId(null);
        userSelectedDateRef.current = true;
        requestedDateRef.current = dateStr;
        setAvailableDatesPng((prev) => mergeUniqueDates([...prev, dateStr]));
        setSelectedDateForPng(dateStr);
        setIsPlaying(false);
        setFramesForDate([]);
        setSelectedFrameIndex(-1);
        setCurrentRadarGif(null);
        setShowGif(false);
    };

    const handleSelectWindow = async (windowInfo) => {
        if (!windowInfo) return;
        setActiveWindowId(windowInfo.id);
        setSelectedDateInput('');
        userSelectedDateRef.current = false;
        requestedDateRef.current = null;
        setProcessingDate(true);
        try {
            const res = await getTimelineEntries(selectedRadarForPng, { from: windowInfo.start, to: windowInfo.end, limit: 0 });
            const entries = Array.isArray(res?.timeline) ? res.timeline : [];
            if (entries.length) {
                entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                setFramesForDate(entries);
                setSelectedFrameIndex(entries.length - 1);
                setIsPlaying(entries.length > 1);
                applyTimelineEntry(selectedRadarForPng, entries[entries.length - 1]);
            } else {
                setFramesForDate([]);
                setSelectedFrameIndex(-1);
                setIsPlaying(false);
                setCurrentRadarPng(null);
            }
            setCurrentRadarGif(null);
            setShowGif(false);
        } catch (error) {
            console.error('Error cargando ventana reciente', error);
        } finally {
            setProcessingDate(false);
        }
    };

    const normalizeBounds = (bounds, radarId) => {
        const defaultBounds = radarBounds[radarId] || radarBounds.LGUAXX || null;
        if (!bounds) {
            return defaultBounds;
        }
        if (Array.isArray(bounds) && bounds.length === 2) {
            return bounds;
        }
        if (bounds?.southWest && bounds?.northEast) {
            return [bounds.southWest, bounds.northEast];
        }
        return defaultBounds;
    };

    const loadRemoteGifFallback = async (radarId, dateStr, fallbackBounds = null) => {
        try {
            const response = await getGifByDate(radarId, dateStr);
            if (requestedDateRef.current && requestedDateRef.current !== dateStr) {
                return false;
            }
            if (response?.success && Array.isArray(response.gifs) && response.gifs.length) {
                const gifDate = response.date || dateStr;
                const gifs = response.gifs
                    .map((gif) => {
                        const name = gif.file || gif.name;
                        if (!name) return null;
                        return {
                            file: name,
                            proxyUrl: getProxyGifUrl(radarId, gifDate, name)
                        };
                    })
                    .filter(Boolean);
                if (!gifs.length) {
                    return false;
                }
                const lastGif = gifs[gifs.length - 1];
                const boundsArray = normalizeBounds(fallbackBounds, radarId) || normalizeBounds(null, radarId);
                setCurrentRadarPng(null);
                setCurrentRadarGif({
                    url: lastGif.proxyUrl,
                    bounds: boundsArray,
                    date: gifDate,
                    file: lastGif.file,
                    source: 'remote'
                });
                setShowGif(true);
                return true;
            }
        } catch (error) {
            console.error('Error cargando GIF remoto:', error);
        }
        return false;
    };

    const extractTimestampFromFilename = (dateStr, fileName) => {
        if (typeof fileName !== 'string') {
            return dateStr ? `${dateStr}T00:00:00Z` : null;
        }
        const fullMatch = fileName.match(/(\d{8})[_-]?(\d{6})/);
        if (fullMatch) {
            const [, datePart, timePart] = fullMatch;
            const isoDate = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
            const isoTime = `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}`;
            return `${isoDate}T${isoTime}Z`;
        }
        if (dateStr) {
            return `${dateStr}T00:00:00Z`;
        }
        return null;
    };

    const loadRemoteFramesForDate = async (radarId, dateStr) => {
        if (!dateStr) return [];
        if (remoteFramesCacheRef.current.has(dateStr)) {
            return remoteFramesCacheRef.current.get(dateStr);
        }

        try {
            let indexMap = remoteIndexByDate;
            const needsRefresh =
                !indexMap?.[dateStr] ||
                Date.now() - remoteIndexFetchedAtRef.current > 60_000 ||
                !Object.keys(indexMap || {}).length;

            if (needsRefresh) {
                const result = await loadRemoteDates(true);
                if (result?.index) {
                    indexMap = result.index;
                }
            }

            const dayEntry = indexMap?.[dateStr];
            if (!dayEntry || !Array.isArray(dayEntry.png) || !dayEntry.png.length) {
                return [];
            }

            const remoteFrames = dayEntry.png
                .map((item) => {
                    const fileName = item?.name || item?.file || item?.filename;
                    if (!fileName) {
                        return null;
                    }
                    const timestamp = item?.timestamp || extractTimestampFromFilename(dateStr, fileName);
                    const directUrl = item?.url || item?.href || null;
                    const proxyUrl = getProxyImageUrl(radarId, dateStr, fileName);
                    const finalUrl = directUrl || proxyUrl;
                    const rawBounds = item?.bbox || item?.bounds || null;
                    const metadata = item?.meta ? { ...item.meta } : {};
                    if (rawBounds?.southWest && rawBounds?.northEast) {
                        metadata.bounds = rawBounds;
                    }

                    return {
                        timestamp,
                        url: finalUrl,
                        bounds: rawBounds,
                        metadata,
                        source: 'remote',
                        remote: {
                            url: finalUrl,
                            proxyUrl,
                            directUrl,
                            file: fileName
                        }
                    };
                })
                .filter(Boolean)
                .sort((a, b) => {
                    const aTime = new Date(a.timestamp || `${dateStr}T00:00:00Z`).getTime();
                    const bTime = new Date(b.timestamp || `${dateStr}T00:00:00Z`).getTime();
                    return aTime - bTime;
                });

            remoteFramesCacheRef.current.set(dateStr, remoteFrames);

            return remoteFrames;
        } catch (error) {
            console.error('Error obteniendo frames remotos:', error);
            return [];
        }
    };

    const loadGifForDate = async (radarId, dateStr, fallbackBounds = null) => {
        if (!dateStr) {
            setCurrentRadarGif(null);
            setShowGif(false);
            return false;
        }

        try {
            const response = await getDailyGif(radarId, dateStr);
            if (requestedDateRef.current && requestedDateRef.current !== dateStr) {
                return false;
            }
            if (response?.success && response.gif?.publicGif) {
                const resolvedBounds = normalizeBounds(
                    response.gif.bounds || fallbackBounds,
                    radarId
                );
                setCurrentRadarGif({
                    url: buildLocalAssetUrl(response.gif.publicGif),
                    bounds: resolvedBounds || normalizeBounds(null, radarId),
                    date: dateStr,
                    file: response.gif.file || null,
                    source: 'local'
                });
                setShowGif(false);
                return true;
            }
        } catch (error) {
            console.error('Error obteniendo GIF diario:', error);
        }

        const remoteLoaded = await loadRemoteGifFallback(radarId, dateStr, fallbackBounds);
        if (!remoteLoaded) {
            setCurrentRadarGif(null);
            setShowGif(false);
        }
        return remoteLoaded;
    };

    const refreshTimeline = async (radarId) => {
        setHistoricalLoading(true);
        try {
            const [
                { success: latestSuccess = false, entry: latestEntry = null },
                timelineRes,
                datesRes,
                historicalRes
            ] = await Promise.all([
                getLatestProcessedImage(radarId).catch(() => ({ success: false })),
                getTimelineEntries(radarId, { limit: 288 }).catch(() => ({ success: false, timeline: [] })),
                getAvailableDates(radarId).catch(() => ({ dates: [] })),
                getHistoricalIndex(radarId, [1, 3, 6, 12, 24, 72]).catch(() => ({ success: false }))
            ]);

            const entries = Array.isArray(timelineRes?.timeline) ? timelineRes.timeline : [];
            const datesFromApi = Array.isArray(datesRes?.dates) ? datesRes.dates : [];
            const indexDatesFromHistorical = historicalRes?.success && historicalRes.index ? extractDatesFromHistorical(historicalRes.index) : [];
            if (historicalRes?.success && historicalRes.index) {
                setHistoricalIndex(historicalRes.index);
                syncHistoricalSelections(historicalRes.index);
                setRecentWindows(historicalRes.index.recentWindows || []);
                if (indexDatesFromHistorical.length) {
                    setAvailableDatesPng((prev) => mergeUniqueDates([...prev, ...indexDatesFromHistorical]));
                }
            }

            if (datesFromApi.length) {
                setAvailableDatesPng((prev) => mergeUniqueDates([...prev, ...datesFromApi]));
            }

            if (activeWindowId) {
                return;
            }

            if (entries.length) {
                const grouped = entries.reduce((acc, item) => {
                    const dateKey = (item.timestamp || '').slice(0, 10);
                    if (!acc[dateKey]) acc[dateKey] = [];
                    acc[dateKey].push(item);
                    return acc;
                }, {});

                Object.keys(grouped).forEach((key) => {
                    grouped[key].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                });

                const timelineDates = Object.keys(grouped);
                const combinedTimeline = { ...timelineByDate };
                timelineDates.forEach((date) => {
                    combinedTimeline[date] = grouped[date];
                });
                setTimelineByDate(combinedTimeline);

                const mergedDates = mergeUniqueDates([...timelineDates, ...datesFromApi, ...indexDatesFromHistorical]);
                setAvailableDatesPng(mergedDates);

                if (selectedDateForPng) {
                    let frames = combinedTimeline[selectedDateForPng] || [];
                    if (!frames.length && processingDate && requestedDateRef.current === selectedDateForPng) {
                        const fetched = await fetchTimelineForDate(radarId, selectedDateForPng, false);
                        if (Array.isArray(fetched) && fetched.length) {
                            frames = fetched;
                        }
                    }

                    if (frames.length) {
                        setFramesForDate(frames);
                        setSelectedFrameIndex(frames.length - 1);
                        applyTimelineEntry(radarId, frames[frames.length - 1]);
                        setIsPlaying(frames.length > 1);
                        const entryBounds = frames[0]?.metadata?.bounds || radarBounds[radarId];
                        await loadGifForDate(radarId, selectedDateForPng, entryBounds);
                    } else if (!processingDate) {
                        setFramesForDate([]);
                        setSelectedFrameIndex(-1);
                        setIsPlaying(false);
                        setCurrentRadarGif(null);
                        setShowGif(false);
                    }
                }
            } else {
                setAvailableDatesPng((prev) => mergeUniqueDates([...prev, ...datesFromApi, ...indexDatesFromHistorical]));
                if (!processingDate && !userSelectedDateRef.current) {
                    setSelectedDateForPng('');
                }
                if (!processingDate) {
                    setCurrentRadarPng(null);
                    setCurrentRadarGif(null);
                    setShowGif(false);
                }
                setFramesForDate([]);
                setSelectedFrameIndex(-1);
                setIsPlaying(false);
                if (!processingDate && latestSuccess && latestEntry) {
                    applyTimelineEntry(radarId, latestEntry);
                }
            }
        } catch (error) {
            console.error('Error actualizando timeline local:', error);
            setTimelineByDate({});
            setAvailableDatesPng([]);
            if (!processingDate && !userSelectedDateRef.current) {
                setSelectedDateForPng('');
            }
            if (!processingDate) {
                setCurrentRadarPng(null);
                setCurrentRadarGif(null);
                setShowGif(false);
            }
            setFramesForDate([]);
            setSelectedFrameIndex(-1);
            setIsPlaying(false);
        } finally {
            setHistoricalLoading(false);
        }
    };

    const fetchTimelineForDate = async (radarId, dateStr, allowProcess = enableAutoProcess) => {
        try {
            const res = await getTimelineEntries(radarId, { date: dateStr });
            const entries = Array.isArray(res?.timeline) ? res.timeline : [];
            if (entries.length) {
                entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                setTimelineByDate((prev) => ({ ...prev, [dateStr]: entries }));
                setAvailableDatesPng((prev) => mergeUniqueDates([...prev, dateStr]));
                setFramesForDate(entries);
                setSelectedFrameIndex(entries.length - 1);
                setIsPlaying(entries.length > 1);
                applyTimelineEntry(radarId, entries[entries.length - 1]);
                if (requestedDateRef.current === dateStr) {
                    requestedDateRef.current = null;
                }
                return entries;
            }
            if (allowProcess && enableAutoProcess) {
                try {
                    const result = await requestProcessDate(radarId, dateStr);
                    if (result?.count > 0) {
                        return await fetchTimelineForDate(radarId, dateStr, false);
                    }
                } catch (err) {
                    console.error('Error procesando fecha solicitada', err);
                }
            }
            setFramesForDate([]);
            setSelectedFrameIndex(-1);
            setIsPlaying(false);
            applyTimelineEntry(radarId, null);
            if (requestedDateRef.current === dateStr && !processingDate) {
                requestedDateRef.current = null;
            }
            return null;
        } catch (error) {
            console.error('Error cargando timeline para fecha', dateStr, error);
            setFramesForDate([]);
            setSelectedFrameIndex(-1);
            applyTimelineEntry(radarId, null);
            setIsPlaying(false);
            if (requestedDateRef.current === dateStr && !processingDate) {
                requestedDateRef.current = null;
            }
            return null;
        }
    };

    const loadPngByDate = async (radarId, dateStr) => {
        if (!dateStr) {
            setCurrentRadarPng(null);
            setFramesForDate([]);
            setSelectedFrameIndex(-1);
            setIsPlaying(false);
            setCurrentRadarGif(null);
            setShowGif(false);
            return;
        }

        setActiveWindowId(null);
        setProcessingDate(true);
        try {
            let entries = timelineByDate[dateStr] || [];

            if (!entries.length) {
                try {
                    const res = await getTimelineEntries(radarId, { date: dateStr });
                    const apiEntries = Array.isArray(res?.timeline) ? res.timeline : [];
                    if (apiEntries.length) {
                        entries = apiEntries;
                    }
                } catch (error) {
                    console.error('Error obteniendo timeline para fecha seleccionada:', error);
                }
            }

            let remoteFrames = [];
            if (!entries.length) {
                remoteFrames = await loadRemoteFramesForDate(radarId, dateStr);
                if (remoteFrames.length) {
                    setTimelineByDate((prev) => ({ ...prev, [dateStr]: remoteFrames }));
                    setAvailableDatesPng((prev) => mergeUniqueDates([...prev, dateStr]));
                    setFramesForDate(remoteFrames);
                    setSelectedFrameIndex(remoteFrames.length - 1);
                    setIsPlaying(remoteFrames.length > 1);
                    applyTimelineEntry(radarId, remoteFrames[remoteFrames.length - 1]);
                    setCurrentRadarGif(null);
                    setShowGif(false);

                    if (enableAutoProcess) {
                        requestProcessDate(radarId, dateStr).catch((error) => {
                            console.error('Error procesando fecha solicitada en segundo plano:', error);
                        });
                    }

                    loadGifForDate(
                        radarId,
                        dateStr,
                        remoteFrames[0]?.bounds || radarBounds[radarId]
                    ).catch(() => { });

                    return;
                }
            }

            if (!entries.length && enableAutoProcess) {
                requestProcessDate(radarId, dateStr)
                    .then((result) => {
                        if (result?.status === 'processed' || (Array.isArray(result?.entries) && result.entries.length)) {
                            refreshTimeline(radarId);
                            return;
                        }
                        // Reintentar para capturar resultados si el backend ya procesó la fecha
                        return getTimelineEntries(radarId, { date: dateStr })
                            .then((res) => {
                                const apiEntries = Array.isArray(res?.timeline) ? res.timeline : [];
                                if (apiEntries.length && (!requestedDateRef.current || requestedDateRef.current === dateStr)) {
                                    setTimelineByDate((prev) => ({ ...prev, [dateStr]: apiEntries }));
                                    setAvailableDatesPng((prev) => mergeUniqueDates([...prev, dateStr]));
                                }
                            })
                            .catch((err) => {
                                console.error('Error obteniendo timeline tras procesamiento:', err);
                            });
                    })
                    .catch((error) => {
                        console.error('Error procesando fecha solicitada:', error);
                    });
            }

            if (entries.length) {
                entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                setTimelineByDate((prev) => ({ ...prev, [dateStr]: entries }));
                setAvailableDatesPng((prev) => mergeUniqueDates([...prev, dateStr]));

                setFramesForDate(entries);
                setSelectedFrameIndex(entries.length - 1);
                setIsPlaying(entries.length > 1);
                applyTimelineEntry(radarId, entries[entries.length - 1]);

                const entryBounds = entries[0]?.metadata?.bounds || radarBounds[radarId];
                await loadGifForDate(radarId, dateStr, entryBounds);
            } else {
                setFramesForDate([]);
                setSelectedFrameIndex(-1);
                setIsPlaying(false);
                setCurrentRadarPng(null);
                await loadGifForDate(radarId, dateStr, radarBounds[radarId]);
            }
        } finally {
            if (requestedDateRef.current === dateStr) {
                requestedDateRef.current = null;
            }
            setProcessingDate(false);
        }
    };

    // Disparar carga de PNG inicial y reactualizar al cambiar fecha
    useEffect(() => { refreshTimeline(selectedRadarForPng); }, [selectedRadarForPng]);
    useEffect(() => {
        if (!selectedDateForPng) {
            setCurrentRadarGif(null);
            setShowGif(false);
            return;
        }
        (async () => {
            await loadPngByDate(selectedRadarForPng, selectedDateForPng);
        })();
    }, [selectedDateForPng, selectedRadarForPng, timelineByDate]);
    useEffect(() => {
        if (!visibleFrames.length) {
            setIsPlaying(false);
            setSelectedFrameIndex(-1);
            setCurrentRadarPng(null);
            return;
        }
        if (selectedFrameIndex < 0 || selectedFrameIndex >= visibleFrames.length) {
            const firstIndex = 0;
            setSelectedFrameIndex(firstIndex);
            applyTimelineEntry(selectedRadarForPng, visibleFrames[firstIndex]);
            const remoteFile = visibleFrames[firstIndex]?.remote?.file;
            if (remoteFile) {
                loadRemoteImage(remoteFile, selectedRemoteDate);
            }
        }
    }, [visibleFrames, selectedFrameIndex, selectedRadarForPng, selectedRemoteDate]);
    useEffect(() => {
        if (showGif) {
            setIsPlaying(false);
        } else if (visibleFrames.length > 1) {
            setIsPlaying(true);
        }
    }, [showGif, visibleFrames.length]);
    useEffect(() => {
        if (processingDate && currentRadarGif) {
            setProcessingDate(false);
        }
    }, [processingDate, currentRadarGif]);
    useEffect(() => {
        if (!isPlaying) return undefined;
        if (visibleFrames.length <= 1) {
            setIsPlaying(false);
            return undefined;
        }
        if (selectedFrameIndex < 0 && visibleFrames.length > 0) {
            const initialIndex = 0;
            setSelectedFrameIndex(initialIndex);
            applyTimelineEntry(selectedRadarForPng, visibleFrames[initialIndex]);
            const remoteFile = visibleFrames[initialIndex]?.remote?.file;
            if (remoteFile) {
                loadRemoteImage(remoteFile, selectedRemoteDate);
            }
            return undefined;
        }
        const id = setInterval(() => handleStepFrame(1, true), playSpeed);
        return () => clearInterval(id);
    }, [isPlaying, playSpeed, visibleFrames, selectedFrameIndex, selectedRadarForPng, selectedRemoteDate]);

    useEffect(() => {
        if (selectedFrameIndex >= 0 && selectedFrameIndex < visibleFrames.length) {
            applyTimelineEntry(selectedRadarForPng, visibleFrames[selectedFrameIndex]);
        }
    }, [visibleFrames, selectedFrameIndex, selectedRadarForPng]);

    useEffect(() => {
        if (activeWindowId && !recentWindows.some((window) => window.id === activeWindowId)) {
            setActiveWindowId(null);
        }
    }, [recentWindows, activeWindowId]);

    useEffect(() => {
        setSelectedDateInput(selectedDateForPng || '');
    }, [selectedDateForPng]);

    // Auto-sincronización: refrescar índice remoto periódicamente
    useEffect(() => {
        const id = setInterval(() => {
            refreshTimeline(selectedRadarForPng);
        }, 5 * 60 * 1000);
        return () => clearInterval(id);
    }, [selectedRadarForPng]);

    useEffect(() => {
        (async () => {
            try {
                const res = await getAvailableDates('LGUAXX');
                if (Array.isArray(res?.dates)) {
                    setAvailableDatesPng((prev) => mergeUniqueDates([...prev, ...res.dates]));
                }
            } catch (err) {
                console.warn('No se pudieron cargar fechas iniciales:', err);
            }
        })();
    }, []);

    // Efectos para radar remoto
    useEffect(() => {
        if (remoteRadarEnabled) {
            setRemoteError(null);
            // Cargar datos de forma segura con manejo de errores
            checkRemoteServer().catch(err => {
                console.error('Error al verificar servidor remoto:', err);
                setRemoteError(err?.message || 'Error al conectar con PostgreSQL');
                setRemoteServerStatus(false);
            });
        } else {
            setRemoteServerStatus(false);
            setRemoteDates([]);
            setRemoteImages([]);
            setRemoteIndexByDate({});
            setSelectedRemoteDate('');
            setSelectedRemoteImage('');
            setRemoteRadarInfo(null);
            setRemoteError(null);
            remoteIndexFetchedAtRef.current = 0;
            remoteFramesCacheRef.current.clear();
        }
    }, [remoteRadarEnabled, selectedRadarForPng]);
    useEffect(() => {
        (async () => {
            try {
                await loadRemoteDates();
            } catch (err) {
                console.warn('No se pudo precargar índice remoto:', err);
            }
        })();
    }, []);

    useEffect(() => {
        if (selectedRemoteDate) {
            updateRemoteImagesForDate(selectedRemoteDate, remoteIndexByDate);
        } else {
            setRemoteImages([]);
            setSelectedRemoteImage('');
        }
    }, [selectedRemoteDate, remoteIndexByDate]);

    useEffect(() => {
        if (remoteRadarEnabled && remoteImages.length) {
            const sortedImages = [...remoteImages].sort((a, b) => {
                const aDate = new Date(a.timestamp || extractTimestampFromFilename(selectedRemoteDate, a.filename));
                const bDate = new Date(b.timestamp || extractTimestampFromFilename(selectedRemoteDate, b.filename));
                return aDate - bDate;
            });

            const mappedFrames = sortedImages.map((img) => {
                const timestamp = img.timestamp || extractTimestampFromFilename(selectedRemoteDate, img.filename);
                return {
                    timestamp,
                    url: img.url,
                    metadata: img.meta || null,
                    bounds: img.bbox || null,
                    source: 'remote',
                    remote: {
                        url: img.url,
                        file: img.filename
                    }
                };
            });

            setFramesForDate(mappedFrames);

            if (mappedFrames.length) {
                setSelectedFrameIndex(0);
                setIsPlaying(mappedFrames.length > 1);
                applyTimelineEntry(selectedRadarForPng, mappedFrames[0]);
                setSelectedRemoteImage(sortedImages[0]?.filename || '');
            } else {
                setSelectedFrameIndex(-1);
                setIsPlaying(false);
                setSelectedRemoteImage('');
            }
        } else if (remoteRadarEnabled && !remoteImages.length) {
            setFramesForDate([]);
            setSelectedFrameIndex(-1);
            setIsPlaying(false);
            setSelectedRemoteImage('');
        } else if (!remoteRadarEnabled) {
            setFramesForDate((prev) => prev);
        }
    }, [remoteRadarEnabled, remoteImages, selectedRemoteDate, selectedRadarForPng]);

    useEffect(() => {
        if (!remoteRadarEnabled || !selectedRemoteImage || !framesForDate.length) {
            return;
        }
        const index = framesForDate.findIndex((frame) => frame?.remote?.file === selectedRemoteImage);
        if (index !== -1) {
            setSelectedFrameIndex(index);
            applyTimelineEntry(selectedRadarForPng, framesForDate[index]);
        }
    }, [selectedRemoteImage, remoteRadarEnabled, framesForDate, selectedRemoteDate, selectedRadarForPng]);

    // Auto-refresh para radar remoto
    // IMPORTANTE: No cambiar la fecha seleccionada automáticamente durante el refresh
    useEffect(() => {
        if (remoteRadarEnabled) {
            const id = setInterval(() => {
                // Cargar fechas sin forzar cambio de fecha seleccionada
                loadRemoteDates(false).catch(err => {
                    console.error('Error en auto-refresh:', err);
                });
            }, 30 * 1000); // Cada 30 segundos
            return () => clearInterval(id);
        }
    }, [remoteRadarEnabled, selectedRadarForPng]);

    const FitBoundsOnOverlay = ({ bounds }) => {
        const map = useMap();
        useEffect(() => {
            if (bounds && Array.isArray(bounds) && bounds.length === 2) {
                try { map.fitBounds(bounds, { padding: [20, 20] }); } catch { }
            }
        }, [bounds]);
        return null;
    };

    const OverlayOpacityControl = () => {
        const map = useMap();
        useEffect(() => {
            const container = L.DomUtil.create('div', 'overlay-control');
            container.innerHTML = `
        <div class="overlay-control-content">
          <label>Opacidad: ${Math.round(radarOverlayOpacity * 100)}%</label>
          <input id="overlay-slider" type="range" min="0" max="1" step="0.1" value="${radarOverlayOpacity}">
        </div>`;
            L.DomEvent.disableClickPropagation(container);
            const control = L.control({ position: 'topright' });
            control.onAdd = () => container;
            control.addTo(map);
            const slider = container.querySelector('#overlay-slider');
            const handleInput = (e) => {
                setRadarOverlayOpacity(parseFloat(e.target.value));
            };
            slider.addEventListener('input', handleInput);
            return () => {
                slider.removeEventListener('input', handleInput);
                control.remove();
            };
        }, [map, radarOverlayOpacity]);
        useEffect(() => {
            const slider = document.getElementById('overlay-slider');
            if (slider) slider.value = radarOverlayOpacity;
        }, [radarOverlayOpacity]);
        return null;
    };

    const generateSimulatedPoints = (center, count) => {
        const points = [];
        // Generar múltiples clusters de precipitación
        const clusters = Math.floor(Math.random() * 3) + 2; // 2-4 clusters

        for (let cluster = 0; cluster < clusters; cluster++) {
            // Centro del cluster
            const clusterDistance = Math.random() * 0.8 + 0.1; // 0.1 a 0.9 grados
            const clusterAngle = Math.random() * Math.PI * 2;
            const clusterCenterLat = clusterDistance * Math.cos(clusterAngle);
            const clusterCenterLon = clusterDistance * Math.sin(clusterAngle);

            // Puntos dentro del cluster
            const pointsInCluster = Math.floor(count / clusters) + Math.floor(Math.random() * 10);
            for (let i = 0; i < pointsInCluster; i++) {
                const pointDistance = Math.random() * 0.15; // Radio del cluster
                const pointAngle = Math.random() * Math.PI * 2;
                const lat = clusterCenterLat + pointDistance * Math.cos(pointAngle);
                const lon = clusterCenterLon + pointDistance * Math.sin(pointAngle);

                // Intensidad basada en la distancia al centro del cluster
                const distanceFromCenter = Math.sqrt(lat * lat + lon * lon);
                const baseIntensity = Math.max(0, 50 - distanceFromCenter * 30);
                const intensity = Math.floor(baseIntensity + Math.random() * 20);

                if (intensity > 5) { // Solo mostrar puntos con intensidad significativa
                    points.push({ lat, lon, intensity });
                }
            }
        }
        return points;
    };

    const formatFrameLabel = (timestamp) => {
        if (!timestamp) return '--:--';
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return '--:--';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatWindowTime = (isoString) => {
        if (!isoString) return '--:--';
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return '--:--';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleSelectFrame = (index, auto = false) => {
        if (index < 0 || index >= visibleFrames.length) return;
        if (!auto && isPlaying) {
            setIsPlaying(false);
        }
        setSelectedFrameIndex(index);
        applyTimelineEntry(selectedRadarForPng, visibleFrames[index]);
    };

    const handleStepFrame = (direction, auto = false) => {
        if (!visibleFrames.length) return;
        let nextIndex = selectedFrameIndex + direction;
        if (nextIndex < 0) nextIndex = visibleFrames.length - 1;
        if (nextIndex >= visibleFrames.length) nextIndex = 0;
        handleSelectFrame(nextIndex, auto);
        // Removido: if (auto) setIsPlaying(true);
    };

    const currentFrame = visibleFrames[selectedFrameIndex] || null;

    const fetchLatestWms = async (radarId, setter) => {
        try {
            const res = await fetch(`${apiUrl}/radar/${radarId}/latest-local-wms`);
            const json = await res.json();
            if (json?.success) {
                setter({ layerName: json.layerName, timestamp: json.timestamp });
            }
        } catch (err) {
            console.error('Error fetching WMS:', err);
        }
    };

    // Carga inicial de WMS y auto‑refresco cada 5 minutos
    useEffect(() => {
        if (!enableLocalWms) {
            setLguaxxWms(null);
            return undefined;
        }
        fetchLatestWms('LGUAXX', setLguaxxWms);

        const interval = setInterval(() => {
            if (lguaxxToggle) fetchLatestWms('LGUAXX', setLguaxxWms);
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [enableLocalWms, lguaxxToggle]);

    // Cargar LOXX cuando cambia LGUAXX
    useEffect(() => {
        if (!currentRadarPng || !selectedDateForPng) {
            setCurrentLoxxPng(null);
            return;
        }

        // Cargar frames de LOXX para la misma fecha y timestamp
        (async () => {
            try {
                const response = await getPngIndexFromDbForViewer('LOXX');
                const loxxData = response.index?.LOXX?.[selectedDateForPng] || [];

                if (loxxData.length === 0) {
                    setCurrentLoxxPng(null);
                    return;
                }

                // Buscar imagen de LOXX con timestamp más cercano a LGUAXX
                const lguaxxTime = new Date(currentRadarPng.timestamp).getTime();
                const closestLoxx = loxxData.reduce((prev, curr) => {
                    const prevDiff = Math.abs(new Date(prev.timestamp).getTime() - lguaxxTime);
                    const currDiff = Math.abs(new Date(curr.timestamp).getTime() - lguaxxTime);
                    return currDiff < prevDiff ? curr : prev;
                });

                setCurrentLoxxPng({
                    url: closestLoxx.url,
                    timestamp: closestLoxx.timestamp,
                    bounds: closestLoxx.bounds || [[-5.0, -81.0], [-1.0, -75.0]],
                    metadata: closestLoxx.metadata || null,
                    source: 'postgresql'
                });
            } catch (error) {
                console.error('Error cargando LOXX:', error);
                setCurrentLoxxPng(null);
            }
        })();
    }, [currentRadarPng, selectedDateForPng]);

    // Cargar última fecha automáticamente al montar
    useEffect(() => {
        (async () => {
            try {
                const response = await getPngIndexFromDbForViewer('LGUAXX');
                if (response?.dates && response.dates.length > 0) {
                    const latestDate = response.dates.sort()[response.dates.length - 1];
                    setSelectedDateForPng(latestDate);
                    setAvailableDatesPng(response.dates);
                }
            } catch (error) {
                console.error('Error cargando fecha inicial:', error);
            }
        })();
    }, []);

    // Cargar frames de LGUAXX cuando cambia la fecha seleccionada
    useEffect(() => {
        if (!selectedDateForPng) {
            setFramesForDate([]);
            setCurrentRadarPng(null);
            return;
        }

        (async () => {
            try {
                const response = await getPngIndexFromDbForViewer('LGUAXX');
                const framesData = response.index?.LGUAXX?.[selectedDateForPng] || [];

                if (framesData.length > 0) {
                    setFramesForDate(framesData);
                    // Seleccionar última imagen del día
                    const lastFrame = framesData[framesData.length - 1];
                    setSelectedFrameIndex(framesData.length - 1);

                    setCurrentRadarPng({
                        url: lastFrame.url,
                        timestamp: lastFrame.timestamp,
                        bounds: lastFrame.bounds || radarBounds.LGUAXX,
                        metadata: lastFrame.metadata || null,
                        source: 'postgresql'
                    });
                } else {
                    setFramesForDate([]);
                    setCurrentRadarPng(null);
                }
            } catch (error) {
                console.error('Error cargando frames de LGUAXX:', error);
                setFramesForDate([]);
                setCurrentRadarPng(null);
            }
        })();
    }, [selectedDateForPng]);

    // Animación: recorre frames cuando animationPlaying=true
    useEffect(() => {
        if (!animationPlaying || visibleFrames.length === 0) return;

        let frameCounter = 0;

        // Mostrar frame 0 inmediatamente
        const firstFrame = visibleFrames[0];
        if (firstFrame) {
            setSelectedFrameIndex(0);
            setCurrentRadarPng({
                url: firstFrame.url,
                timestamp: firstFrame.timestamp,
                bounds: firstFrame.bounds || radarBounds.LGUAXX,
                source: 'postgresql'
            });
        }

        // Interval para avanzar frames
        const interval = setInterval(() => {
            frameCounter++;

            if (frameCounter >= visibleFrames.length) {
                setAnimationPlaying(false); // Detener al final
                clearInterval(interval);
                return;
            }

            const frame = visibleFrames[frameCounter];
            if (frame) {
                setSelectedFrameIndex(frameCounter);
                setCurrentRadarPng({
                    url: frame.url,
                    timestamp: frame.timestamp,
                    bounds: frame.bounds || radarBounds.LGUAXX,
                    source: 'postgresql'
                });
            }
        }, 1000); // 1 segundo por frame

        return () => clearInterval(interval);
    }, [animationPlaying, visibleFrames, radarBounds.LGUAXX]);

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

                {/* Original header content moved to section below */}
                <header className="w-full px-4 sm:px-6 lg:px-10 xl:px-20 py-4 bg-white shadow-md z-30 relative" style={{ display: 'none' }}>
                    <div className="flex items-center justify-between">
                        {/* Logo and Navigation */}
                        <div className="flex items-center space-x-8">
                            <div className="flex items-center space-x-3">
                                <div className="h-12 w-12 bg-blue-600 rounded flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">UTPL</span>
                                </div>
                            </div>

                            <nav className="hidden md:flex items-center space-x-6">
                                <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">Inicio</a>
                                <a href="/visor" className="text-gray-600 hover:text-blue-600 font-medium">Visor</a>
                                <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Datos</a>
                                <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Análisis</a>
                            </nav>
                        </div>

                        {/* Title */}
                        <div className="flex-1 text-center">
                            <h1 className="text-xl font-bold text-blue-600">Universidad Técnica Particular de Loja</h1>
                        </div>

                        {/* Right side controls - removed User icon */}
                        <div className="flex items-center space-x-4">
                        </div>
                    </div>

                    {/* Toggle Switches */}
                    <div className="flex items-center justify-end space-x-6 mt-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">LGUAXX</span>
                            <button
                                onClick={() => setLguaxxToggle(!lguaxxToggle)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${lguaxxToggle ? 'bg-blue-400' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${lguaxxToggle ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Radar fijo LGUAXX */}

                        {/* Selector de radar para PNG */}
                        <div className="flex items-center space-x-2">
                            <Image className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">PNG</span>
                            <span className="text-xs text-gray-500 px-2 py-1 border border-gray-200 rounded">LGUAXX</span>
                            <select
                                value={selectedDateForPng}
                                onChange={(e) => handleHistoricalSelectDate(e.target.value)}
                                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                disabled={!availableDatesPng.length || processingDate}
                            >
                                {availableDatesPng.length ? (
                                    availableDatesPng.map(d => (<option key={d} value={d}>{d}</option>))
                                ) : (
                                    <option value="">Sin datos</option>
                                )}
                            </select>
                            {processingDate && (
                                <span className="text-xs text-blue-600">Procesando...</span>
                            )}
                        </div>

                        {/* Separador */}
                        <div className="h-6 w-px bg-gray-300"></div>

                        {/* Radar Remoto */}
                        <div className="flex items-center space-x-2">
                            {remoteServerStatus ? (
                                <Wifi className="w-4 h-4 text-green-600" />
                            ) : (
                                <WifiOff className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm font-medium text-gray-700">Remoto</span>
                            <button
                                onClick={() => setRemoteRadarEnabled(!remoteRadarEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${remoteRadarEnabled ? 'bg-green-400' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${remoteRadarEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {remoteRadarEnabled && (
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => { checkRemoteServer(); }}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    Actualizar remoto
                                </button>
                                {remoteError && (
                                    <span className="text-xs text-red-600 whitespace-nowrap">{remoteError}</span>
                                )}
                            </div>
                        )}

                        {/* Selector de fecha remota */}
                        {remoteRadarEnabled && (
                            <div className="flex items-center space-x-2">
                                <select
                                    value={selectedRemoteDate}
                                    onChange={(e) => setSelectedRemoteDate(e.target.value)}
                                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                    disabled={!remoteDates.length}
                                >
                                    {remoteDates.length ? (
                                        remoteDates.map(d => (<option key={d} value={d}>{d}</option>))
                                    ) : (
                                        <option value="">Sin fechas</option>
                                    )}
                                </select>
                                <select
                                    value={selectedRemoteImage}
                                    onChange={(e) => setSelectedRemoteImage(e.target.value)}
                                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                    disabled={!remoteImages.length}
                                >
                                    {remoteImages.length ? (
                                        remoteImages.map(img => (
                                            <option key={img.filename} value={img.filename}>
                                                {img.timestamp}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="">Sin imágenes</option>
                                    )}
                                </select>
                            </div>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 relative">
                    {(processingDate || historicalLoading) && (
                        <div className="absolute top-4 right-4 z-30 flex items-center space-x-2 rounded-md bg-white/85 px-3 py-2 shadow pointer-events-none">
                            <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            <span className="text-xs font-medium text-blue-700">Procesando datos…</span>
                        </div>
                    )}

                    {/* Panel de GIF eliminado: ahora se usa PNG local */}

                    {/* Map Container */}
                    <div className="absolute inset-0 z-10" style={{ height: 'calc(100vh - 120px)', width: '100%' }}>
                        <MapContainer
                            center={[-2.0, -79.0]}
                            zoom={7}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {/* Reubicar controles de zoom */}
                            <ZoomControl position="bottomright" />

                            {/* Capas WMS de GeoServer */}
                            {enableLocalWms && lguaxxToggle && lguaxxWms && (
                                <WMSTileLayer
                                    url={lguaxxWms.baseUrl}
                                    params={{
                                        layers: geoserverWorkspace ? `${geoserverWorkspace}:${lguaxxWms.layerName}` : lguaxxWms.layerName,
                                        format: 'image/png',
                                        transparent: true
                                    }}
                                />
                            )}


                            {/* Puntos de precipitación LGUAXX deshabilitados */}


                            {/* Puntos de precipitación LOXX deshabilitados */}

                            {/* Overlay de radar LGUAXX */}
                            {lguaxxToggle && currentRadarPng && currentRadarPng.url && currentRadarPng.bounds ? (
                                <TransparentRadarOverlay
                                    url={currentRadarPng.url}
                                    bounds={currentRadarPng.bounds}
                                    opacity={radarOverlayOpacity}
                                    className="radar-overlay"
                                    zIndex={1000}
                                    radarId="LGUAXX"
                                />
                            ) : null}

                            {/* Overlay de radar LOXX */}
                            {loxxToggle && currentLoxxPng && currentLoxxPng.url && currentLoxxPng.bounds ? (
                                <TransparentRadarOverlay
                                    url={currentLoxxPng.url}
                                    bounds={currentLoxxPng.bounds}
                                    opacity={radarOverlayOpacity}
                                    className="radar-overlay"
                                    zIndex={999}
                                    radarId="LOXX"
                                />
                            ) : null}
                            {(currentRadarPng || currentLoxxPng || currentRadarGif) && <OverlayOpacityControl />}
                        </MapContainer>

                        {/* Panel de controles */}
                        {visibleFrames.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                bottom: '30px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'white',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                zIndex: 1000
                            }}>
                                <button
                                    onClick={() => setAnimationPlaying(!animationPlaying)}
                                    style={{
                                        padding: '8px 16px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        border: 'none',
                                        borderRadius: '5px',
                                        background: animationPlaying ? '#dc2626' : '#16a34a',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {animationPlaying ? '⏸ Pausa' : '▶ Reproducir'}
                                </button>
                                <span style={{ marginLeft: '12px', fontSize: '13px', color: '#666' }}>
                                    {selectedFrameIndex + 1} / {visibleFrames.length}
                                </span>
                                <div style={{ marginTop: '8px', fontSize: '10px', color: '#444', maxWidth: '600px', wordWrap: 'break-word' }}>
                                    <strong>DEBUG:</strong> playing={String(animationPlaying)} | frames={visibleFrames.length} | speed={playSpeed}ms | ticks={tickCount} | <span style={{ color: 'red', fontWeight: 'bold' }}>animFrame={animationFrameIndex}</span>
                                    <br />
                                    <strong>LOG:</strong> {debugLog}
                                </div>
                                {debugError && (
                                    <div style={{
                                        marginTop: '8px',
                                        padding: '8px',
                                        background: '#fee',
                                        border: '1px solid #f00',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        color: '#c00'
                                    }}>
                                        ❌ ERROR: {debugError}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Visor;