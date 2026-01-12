import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import TransparentRadarOverlay from '../components/TransparentRadarOverlay';
import VisorSidebar from '../components/VisorSidebar';
import VisorHeader from '../components/VisorHeader';
import { getPngsFromDb } from '../services/radarService';
import 'leaflet/dist/leaflet.css';
import './VisorNuevo.css';

const VisorNuevo = () => {
    const [lguaxxFrames, setLguaxxFrames] = useState([]);
    const [loxxFrames, setLoxxFrames] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x = normal (800ms)
    const [loading, setLoading] = useState(false);
    const [showLguaxx, setShowLguaxx] = useState(true);
    const [showLoxx, setShowLoxx] = useState(true);
    const [timeInterval, setTimeInterval] = useState(''); // '', '1h', '3h', '6h', '12h', '24h', 'custom'
    const [cacheBuster, setCacheBuster] = useState(Date.now());
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Estado sidebar móvil
    const [noDataMessage, setNoDataMessage] = useState(''); // Mensaje de "sin datos"

    // Estado para la posición del panel flotante
    const [panelPosition, setPanelPosition] = useState({ top: 100, left: null, right: 20 });
    const dragOffset = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);

    // Estados para selección de fecha/hora histórica
    const [selectedDate, setSelectedDate] = useState(new Date()); // Fecha seleccionada
    const [selectedHour, setSelectedHour] = useState(new Date().getHours()); // Hora (0-23)
    const [selectedMinute, setSelectedMinute] = useState(new Date().getMinutes()); // Minuto (0-59)
    const [showCalendarModal, setShowCalendarModal] = useState(false); // Mostrar modal calendario
    const [viewMode, setViewMode] = useState('current'); // 'current' o 'historical'
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth()); // Mes del calendario
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear()); // Año del calendario

    const intervalRef = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        loadFrames(controller.signal);
        return () => controller.abort();
    }, [timeInterval, viewMode]); // Recargar cuando cambia el intervalo o modo

    // Helper function to filter frames by time range (for historical mode with interval)
    const filterFramesByTimeRange = (frames, centerTime, hoursRange) => {
        if (!hoursRange) return frames; // Sin intervalo, devolver todos

        const startTime = new Date(centerTime.getTime() - (hoursRange / 2) * 60 * 60 * 1000);
        const endTime = new Date(centerTime.getTime() + (hoursRange / 2) * 60 * 60 * 1000);

        return frames.filter(frame => {
            const frameTime = new Date(frame.timestamp || frame.sourceTimestamp);
            return frameTime >= startTime && frameTime <= endTime;
        });
    };

    const loadFrames = async (signalArg = null) => {
        // Asegurar que signal es un AbortSignal válido o null (evitar que se pase el evento de click)
        const signal = (signalArg instanceof AbortSignal) ? signalArg : null;

        setLoading(true);
        setCacheBuster(Date.now());

        // Calcular fecha local Ecuador
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        console.log(`[VisorNuevo] Cargando frames para ${today} Ecuador`);

        try {
            // ========== MODO HISTÓRICO ==========
            if (viewMode === 'historical') {
                const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                console.log(`[📅 Modo Histórico] Cargando frames para ${dateStr} ${selectedHour}:${selectedMinute}`);

                // Cargar frames históricos para ambos radares
                const [lguaxxRes, loxxRes] = await Promise.all([
                    getPngsFromDb('LGUAXX', dateStr),
                    getPngsFromDb('LOXX', dateStr)
                ]);

                if (signal && signal.aborted) return; // Verificar abort después de await

                // Procesar LGUAXX histórico
                let lguaxxFramesArray = [];
                if (lguaxxRes?.success && Array.isArray(lguaxxRes.pngs) && lguaxxRes.pngs.length > 0) {
                    let frames = lguaxxRes.pngs.map(png => ({
                        ...png,
                        url: png.url || `/api/radar/pngs/${png.id}/image`,
                        imageUrl: png.url || `/api/radar/pngs/${png.id}/image`,
                        timestamp: png.sourceTimestamp || png.timestamp,
                        bounds: png.metadata?.bounds?.northEast && png.metadata?.bounds?.southWest
                            ? [[png.metadata.bounds.southWest[0], png.metadata.bounds.southWest[1]],
                            [png.metadata.bounds.northEast[0], png.metadata.bounds.northEast[1]]]
                            : [[-4.944622, -80.770709], [-3.136104, -78.967612]]
                    }));

                    // Aplicar filtro por intervalo de tiempo si está configurado
                    if (timeInterval) {
                        const targetTime = new Date(selectedDate);
                        targetTime.setHours(selectedHour, selectedMinute, 0, 0);
                        frames = filterFramesByTimeRange(frames, targetTime, parseInt(timeInterval));
                    }

                    frames.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    lguaxxFramesArray = frames;
                    setLguaxxFrames(frames);
                    console.log(`✅ LGUAXX Histórico: ${frames.length} frames`);
                } else {
                    setLguaxxFrames([]);
                    console.warn(`⚠️ LGUAXX: Sin datos históricos para ${dateStr}`);
                    setNoDataMessage(`LGUAXX: Sin datos para ${dateStr}`);
                    setTimeout(() => setNoDataMessage(''), 3000);
                }

                // Procesar LOXX histórico
                let loxxFramesArray = [];
                if (loxxRes?.success && Array.isArray(loxxRes.pngs) && loxxRes.pngs.length > 0) {
                    let frames = loxxRes.pngs.map(png => ({
                        ...png,
                        url: png.url || `/api/radar/pngs/${png.id}/image`,
                        imageUrl: png.url || `/api/radar/pngs/${png.id}/image`,
                        timestamp: png.sourceTimestamp || png.timestamp,
                        bounds: png.metadata?.bounds?.northEast && png.metadata?.bounds?.southWest
                            ? [[png.metadata.bounds.southWest[0], png.metadata.bounds.southWest[1]],
                            [png.metadata.bounds.northEast[0], png.metadata.bounds.northEast[1]]]
                            : [[-4.344, -79.444], [-3.644, -78.744]]
                    }));

                    // Aplicar filtro por intervalo de tiempo si está configurado
                    if (timeInterval) {
                        const targetTime = new Date(selectedDate);
                        targetTime.setHours(selectedHour, selectedMinute, 0, 0);
                        frames = filterFramesByTimeRange(frames, targetTime, parseInt(timeInterval));
                    }

                    frames.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    loxxFramesArray = frames;
                    setLoxxFrames(frames);
                    console.log(`✅ LOXX Histórico: ${frames.length} frames`);
                } else {
                    setLoxxFrames([]);
                    console.warn(`⚠️ LOXX: Sin datos históricos para ${dateStr}`);
                    setNoDataMessage(`LOXX: Sin datos para ${dateStr}`);
                    setTimeout(() => setNoDataMessage(''), 3000);
                }

                // Resetear índice
                setCurrentIndex(0);
                const maxLength = Math.max(lguaxxFramesArray.length, loxxFramesArray.length);
                if (maxLength > 0) {
                    setTimeout(() => {
                        setCurrentIndex(maxLength - 1);
                        console.log(`📍 Histórico cargado - último frame: ${maxLength}`);
                    }, 100);
                }
                setLoading(false);
                return; // Salir de la función
            }

            // ========== MODO ACTUAL (CURRENT) ==========
            let lguaxxApiUrl = `/api/radar/LGUAXX/pngs/viewer-frames?t=${cacheBuster}`;
            if (timeInterval) {
                // Usar nuevo endpoint que filtra desde el último frame hacia atrás
                lguaxxApiUrl = `/api/radar/LGUAXX/pngs/recent?hours=${timeInterval}&t=${cacheBuster}`;
            }

            const lguaxxResponse = await fetch(lguaxxApiUrl, { signal });
            const lguaxxData = await lguaxxResponse.json();

            let lguaxxFramesArray = [];
            if (lguaxxData.frames && lguaxxData.frames.length > 0) {
                // Si usamos el endpoint /recent, ya viene filtrado por el backend
                let filteredFrames = lguaxxData.frames;

                // Si NO usamos intervalo, filtrar por fecha del día actual
                // IMPORTANTE: Usar getFullYear/getMonth/getDate en lugar de toISOString
                // para comparar en hora local, no UTC
                if (!timeInterval) {
                    filteredFrames = lguaxxData.frames.filter(frame => {
                        const frameDate = new Date(frame.timestamp);
                        // Convertir a hora local Ecuador (UTC-5)
                        const ecuadorMs = frameDate.getTime() - (5 * 60 * 60 * 1000);
                        const ecuadorDate = new Date(ecuadorMs);
                        // Comparar fecha en hora local
                        const frameYear = ecuadorDate.getUTCFullYear();
                        const frameMonth = ecuadorDate.getUTCMonth() + 1;
                        const frameDay = ecuadorDate.getUTCDate();
                        const frameDateStr = `${frameYear}-${String(frameMonth).padStart(2, '0')}-${String(frameDay).padStart(2, '0')}`;
                        return frameDateStr === today;
                    });
                }

                filteredFrames.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                const framesWithBounds = filteredFrames.map(f => ({
                    ...f,
                    imageUrl: `/api/radar/pngs/${f.id}/image?t=${cacheBuster}`,
                    bounds: f.bounds?.northEast && f.bounds?.southWest
                        ? [[f.bounds.southWest[0], f.bounds.southWest[1]], [f.bounds.northEast[0], f.bounds.northEast[1]]]
                        : [[-4.944622, -80.770709], [-3.136104, -78.967612]]
                }));

                lguaxxFramesArray = framesWithBounds;
                setLguaxxFrames(framesWithBounds);
                const intervalMsg = timeInterval ? `(últimas ${timeInterval}h)` : `para ${today}`;
                console.log(`✅ LGUAXX: ${framesWithBounds.length} frames ${intervalMsg}`);
            } else {
                setLguaxxFrames([]);
                const intervalMsg = timeInterval ? `en las últimas ${timeInterval}h` : `para el día ${today}`;
                console.warn(`⚠️ LGUAXX: Sin datos ${intervalMsg}`);
                // Mostrar notificación solo si es por intervalo de tiempo
                if (timeInterval) {
                    setNoDataMessage(`LGUAXX: Sin datos en las últimas ${timeInterval}h`);
                    setTimeout(() => {
                        setNoDataMessage('');
                    }, 3000); // Mostrar notificación 3 segundos
                }
            }
            // ⚡ LOXX: Usar endpoint con intervalo si está seleccionado (igual que LGUAXX)
            let loxxApiUrl = `/api/radar/LOXX/pngs/viewer-frames?t=${cacheBuster}`;
            if (timeInterval) {
                // Usar endpoint que filtra desde el último frame hacia atrás
                loxxApiUrl = `/api/radar/LOXX/pngs/recent?hours=${timeInterval}&t=${cacheBuster}`;
            }

            const loxxResponse = await fetch(loxxApiUrl, { signal });
            const loxxData = await loxxResponse.json();

            let loxxFramesArray = [];
            if (loxxData.frames && loxxData.frames.length > 0) {
                // Usar la misma lógica que LGUAXX - CON filtro de fecha
                let filteredFrames = loxxData.frames;

                // Si NO usamos intervalo, filtrar por fecha del día actual
                // IMPORTANTE: Usar getFullYear/getMonth/getDate en hora local Ecuador
                if (!timeInterval) {
                    filteredFrames = loxxData.frames.filter(frame => {
                        const frameDate = new Date(frame.timestamp);
                        // Convertir a hora local Ecuador (UTC-5)
                        const ecuadorMs = frameDate.getTime() - (5 * 60 * 60 * 1000);
                        const ecuadorDate = new Date(ecuadorMs);
                        // Comparar fecha en hora local
                        const frameYear = ecuadorDate.getUTCFullYear();
                        const frameMonth = ecuadorDate.getUTCMonth() + 1;
                        const frameDay = ecuadorDate.getUTCDate();
                        const frameDateStr = `${frameYear}-${String(frameMonth).padStart(2, '0')}-${String(frameDay).padStart(2, '0')}`;
                        return frameDateStr === today;
                    });
                }

                // Ordenar por timestamp ascendente
                filteredFrames.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                const framesWithBounds = filteredFrames.map(f => ({
                    ...f,
                    bounds: f.bounds?.northEast && f.bounds?.southWest
                        ? [[f.bounds.southWest[0], f.bounds.southWest[1]], [f.bounds.northEast[0], f.bounds.northEast[1]]]
                        : [[-4.344, -79.444], [-3.644, -78.744]] // LOXX bounds por defecto
                }));

                loxxFramesArray = framesWithBounds;
                setLoxxFrames(framesWithBounds);
                const intervalMsg = timeInterval ? `(últimas ${timeInterval}h)` : `del día`;
                console.log(`✅ LOXX: ${framesWithBounds.length} frames ${intervalMsg}`);
            } else {
                setLoxxFrames([]);
                const intervalMsg = timeInterval ? `en las últimas ${timeInterval}h` : `para el día ${today}`;
                console.warn(`⚠️ LOXX: Sin datos ${intervalMsg}`);
                // Mostrar notificación solo si es por intervalo de tiempo
                if (timeInterval) {
                    setNoDataMessage(`LOXX: Sin datos en las últimas ${timeInterval}h`);
                    setTimeout(() => {
                        setNoDataMessage('');
                    }, 3000); // Mostrar notificación 3 segundos
                }
            }
            // ⚡ Establecer índice SIEMPRE desde cero cuando se cargan nuevos frames
            setCurrentIndex(0);
            const maxLength = Math.max(lguaxxFramesArray.length, loxxFramesArray.length);
            if (maxLength > 0) {
                // Ir al último frame después de un breve delay
                setTimeout(() => {
                    setCurrentIndex(maxLength - 1);
                    console.log(`📍 Visor inicializado en último frame: ${maxLength} de ${maxLength}`);
                }, 100);
            }
        } catch (error) {
            console.error('❌ Error cargando frames:', error);
            setLoxxFrames([]);
            setLguaxxFrames([]);
        }

        setLoading(false);
    };

    // 📅 Función para cargar datos históricos SOLO para el radar especificado
    const loadHistoricalData = async (selectedDate, radarId) => {
        setLoading(true);
        setCacheBuster(Date.now());
        console.log(`[📅 Histórico] Cargando frames de ${radarId} para ${selectedDate}`);

        try {
            // Solo cargar datos del radar especificado - el otro mantiene sus datos actuales
            if (radarId === 'LGUAXX') {
                // Cargar LGUAXX histórico
                const lguaxxRes = await getPngsFromDb('LGUAXX', selectedDate);
                if (lguaxxRes?.success && Array.isArray(lguaxxRes.pngs) && lguaxxRes.pngs.length > 0) {
                    const framesWithBounds = lguaxxRes.pngs.map(png => ({
                        ...png,
                        url: png.url || `/api/radar/pngs/${png.id}/image`,
                        imageUrl: png.url || `/api/radar/pngs/${png.id}/image`,
                        timestamp: png.sourceTimestamp || png.timestamp,
                        bounds: png.metadata?.bounds?.northEast && png.metadata?.bounds?.southWest
                            ? [[png.metadata.bounds.southWest[0], png.metadata.bounds.southWest[1]],
                            [png.metadata.bounds.northEast[0], png.metadata.bounds.northEast[1]]]
                            : [[-4.944622, -80.770709], [-3.136104, -78.967612]]
                    }));
                    framesWithBounds.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    lguaxxFramesArray = framesWithBounds;
                    setLguaxxFrames(framesWithBounds);
                    console.log(`✅ LGUAXX Histórico: ${framesWithBounds.length} frames para ${selectedDate}`);
                } else {
                    console.warn(`⚠️ LGUAXX: Sin datos históricos para ${selectedDate}`);
                }
            } else if (radarId === 'LOXX') {
                // Cargar LOXX histórico
                const loxxRes = await getPngsFromDb('LOXX', selectedDate);
                if (loxxRes?.success && Array.isArray(loxxRes.pngs) && loxxRes.pngs.length > 0) {
                    const framesWithBounds = loxxRes.pngs.map(png => ({
                        ...png,
                        url: png.url || `/api/radar/pngs/${png.id}/image`,
                        imageUrl: png.url || `/api/radar/pngs/${png.id}/image`,
                        timestamp: png.sourceTimestamp || png.timestamp,
                        bounds: png.metadata?.bounds?.northEast && png.metadata?.bounds?.southWest
                            ? [[png.metadata.bounds.southWest[0], png.metadata.bounds.southWest[1]],
                            [png.metadata.bounds.northEast[0], png.metadata.bounds.northEast[1]]]
                            : [[-4.344, -79.444], [-3.644, -78.744]]
                    }));
                    framesWithBounds.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    loxxFramesArray = framesWithBounds;
                    setLoxxFrames(framesWithBounds);
                    console.log(`✅ LOXX Histórico: ${framesWithBounds.length} frames para ${selectedDate}`);
                } else {
                    console.warn(`⚠️ LOXX: Sin datos históricos para ${selectedDate}`);
                }
            }

            // Resetear índice
            setCurrentIndex(0);
            setTimeout(() => {
                const maxLength = Math.max(lguaxxFrames.length, loxxFrames.length);
                if (maxLength > 0) {
                    setCurrentIndex(maxLength - 1);
                    console.log(`📍 ${radarId} histórico cargado - último frame: ${maxLength}`);
                }
            }, 100);
        } catch (error) {
            console.error('❌ Error cargando datos históricos:', error);
        }
        setLoading(false);
    };

    // 🚀 PRECARGA DE IMÁGENES para reproducción fluida sin parpadeos
    const preloadedImagesRef = useRef(new Map());

    useEffect(() => {
        if (lguaxxFrames.length === 0 && loxxFrames.length === 0) return;

        const preloadImages = () => {
            const imagesToPreload = [];

            // Agregar frames de LGUAXX
            lguaxxFrames.forEach(frame => {
                if (frame.imageUrl) imagesToPreload.push(frame.imageUrl);
            });

            // Agregar frames de LOXX
            loxxFrames.forEach(frame => {
                if (frame.imageUrl) imagesToPreload.push(frame.imageUrl);
            });

            // Precargar todas las imágenes
            let loaded = 0;
            imagesToPreload.forEach(url => {
                if (!preloadedImagesRef.current.has(url)) {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        loaded++;
                        if (loaded === imagesToPreload.length) {
                            console.log(`✅ Precargadas ${imagesToPreload.length} imágenes`);
                        }
                    };
                    img.src = url;
                    preloadedImagesRef.current.set(url, img);
                }
            });
        };

        // Dar un pequeño delay para que el mapa se renderice primero
        const timer = setTimeout(preloadImages, 500);

        return () => {
            clearTimeout(timer);
            preloadedImagesRef.current.clear();
        };
    }, [lguaxxFrames, loxxFrames]);

    useEffect(() => {
        if (!isPlaying) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        const maxLength = Math.max(lguaxxFrames.length, loxxFrames.length);
        if (maxLength === 0) return;

        // Solo resetear a 0 si estamos al final o si acabamos de presionar play
        // Esto permite cambiar la velocidad sin reiniciar
        if (currentIndex >= maxLength - 1) {
            setCurrentIndex(0);
        }

        // Intervalo base 1200ms para permitir crossfade suave (500ms) sin parpadeos
        const interval = 1200 / playbackSpeed;

        intervalRef.current = setInterval(() => {
            setCurrentIndex(prev => {
                const next = prev + 1;
                if (next >= maxLength) {
                    setIsPlaying(false);
                    return maxLength - 1;
                }
                return next;
            });
        }, interval);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPlaying, lguaxxFrames.length, loxxFrames.length, playbackSpeed, currentIndex]);

    // Calcular maxLength basado en radares activos
    const maxLength = (() => {
        if (showLguaxx && showLoxx) {
            // Ambos activos: usar el máximo
            return Math.max(lguaxxFrames.length, loxxFrames.length);
        } else if (showLguaxx) {
            // Solo LGUAXX activo
            return lguaxxFrames.length;
        } else if (showLoxx) {
            // Solo LOXX activo
            return loxxFrames.length;
        }
        return 0;
    })();

    // 🎯 Mapear el índice actual a los frames correspondientes de cada radar
    // Si un radar tiene menos frames, usar proporción para sincronizar
    const getLguaxxIndex = () => {
        if (lguaxxFrames.length === 0) return -1;
        if (maxLength === 0) return 0;
        // Mapear proporcionalmente el índice actual al rango de LGUAXX
        const proportion = currentIndex / Math.max(1, maxLength - 1);
        return Math.min(
            Math.floor(proportion * Math.max(0, lguaxxFrames.length - 1)),
            lguaxxFrames.length - 1
        );
    };

    const getLoxxIndex = () => {
        if (loxxFrames.length === 0) return -1;
        if (maxLength === 0) return 0;
        // Mapear proporcionalmente el índice actual al rango de LOXX
        const proportion = currentIndex / Math.max(1, maxLength - 1);
        return Math.min(
            Math.floor(proportion * Math.max(0, loxxFrames.length - 1)),
            loxxFrames.length - 1
        );
    };

    const lguaxxIndex = getLguaxxIndex();
    const loxxIndex = getLoxxIndex();
    const lguaxxFrame = lguaxxIndex >= 0 ? lguaxxFrames[lguaxxIndex] : null;
    const loxxFrame = loxxIndex >= 0 ? loxxFrames[loxxIndex] : null;

    // 🔍 Debug: Verificar qué frames están disponibles
    console.log(`[VisorNuevo] Índice actual: ${currentIndex} de ${maxLength}`);
    console.log(`[VisorNuevo] LGUAXX índice: ${lguaxxIndex} de ${lguaxxFrames.length} - Frame:`, lguaxxFrame ? `✅ Disponible (${lguaxxFrame.url})` : '❌ No disponible');
    console.log(`[VisorNuevo] LOXX índice: ${loxxIndex} de ${loxxFrames.length} - Frame:`, loxxFrame ? `✅ Disponible (${loxxFrame.url})` : '❌ No disponible');

    // Obtener timestamp del frame actual (priorizar el radar visible)
    const currentFrame = (() => {
        if (showLguaxx && !showLoxx) {
            // Solo LGUAXX visible
            return lguaxxFrame;
        } else if (showLoxx && !showLguaxx) {
            // Solo LOXX visible
            return loxxFrame;
        } else if (showLguaxx && showLoxx) {
            // Ambos visibles: usar LOXX (más reciente generalmente) o el que tenga datos
            return loxxFrame || lguaxxFrame;
        }
        return null;
    })();

    const currentTimestamp = currentFrame?.metadata?.sourceTimestamp || currentFrame?.timestamp;
    const displayDate = currentTimestamp ? new Date(currentTimestamp).toLocaleString('es-EC', {
        dateStyle: 'full',
        timeStyle: 'medium'
    }) : new Date().toLocaleDateString('es-EC', { dateStyle: 'full' });

    // Función para extraer hora del filename (tiene la hora local correcta)
    const extractTimeFromFilename = (filename) => {
        if (!filename) return null;

        // LOXX: LOXX_20251231_183000.png
        const loxxMatch = filename.match(/(\d{8})_(\d{6})/);
        if (loxxMatch) {
            const dateStr = loxxMatch[1]; // YYYYMMDD
            const timeStr = loxxMatch[2]; // HHMMSS
            return {
                year: dateStr.substring(0, 4),
                month: dateStr.substring(4, 6),
                day: dateStr.substring(6, 8),
                hour: timeStr.substring(0, 2),
                minute: timeStr.substring(2, 4)
            };
        }

        // GUAXX: LGUAXX_2025123118300000dBuZ.png
        const guaxxMatch = filename.match(/LGUAXX_(\d{14})/);
        if (guaxxMatch) {
            const dateTimeStr = guaxxMatch[1]; // YYYYMMDDHHMMSS
            return {
                year: dateTimeStr.substring(0, 4),
                month: dateTimeStr.substring(4, 6),
                day: dateTimeStr.substring(6, 8),
                hour: dateTimeStr.substring(8, 10),
                minute: dateTimeStr.substring(10, 12)
            };
        }

        return null;
    };

    // ⏰ Hora de captura del frame ACTUAL que se está viendo (dinámico durante reproducción)
    const radarCaptureTime = (() => {
        // Usar el frame actual del slider/reproducción
        if (!currentFrame) {
            console.log('[VisorNuevo] No hay frame actual para mostrar hora');
            return null;
        }

        console.log('[VisorNuevo] Mostrando hora del frame actual:', currentFrame.filename);

        const frameTimestamp = currentFrame.metadata?.sourceTimestamp || currentFrame.timestamp;
        if (frameTimestamp) {
            // Timestamp del frame (en UTC desde la BD)
            const utcDate = new Date(frameTimestamp);

            // UTC = Hora original del archivo (UTC)
            const utcYear = utcDate.getUTCFullYear();
            const utcMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
            const utcDay = String(utcDate.getUTCDate()).padStart(2, '0');
            const utcHour = String(utcDate.getUTCHours()).padStart(2, '0');
            const utcMinute = String(utcDate.getUTCMinutes()).padStart(2, '0');

            // LT = Hora local Ecuador del frame (UTC-5)
            // Convertir UTC a hora local Ecuador
            const ecuadorMs = utcDate.getTime() - (5 * 60 * 60 * 1000);
            const ecuadorDate = new Date(ecuadorMs);

            const ltYear = ecuadorDate.getUTCFullYear();
            const ltMonth = String(ecuadorDate.getUTCMonth() + 1).padStart(2, '0');
            const ltDay = String(ecuadorDate.getUTCDate()).padStart(2, '0');
            const ltHour = String(ecuadorDate.getUTCHours()).padStart(2, '0');
            const ltMinute = String(ecuadorDate.getUTCMinutes()).padStart(2, '0');

            return {
                lt: `${ltYear}-${ltMonth}-${ltDay} ${ltHour}:${ltMinute} LT`,
                utc: `${utcYear}-${utcMonth}-${utcDay} ${utcHour}:${utcMinute} UTC`
            };
        }

        return null;
    })();

    return (
        <div className="visor-container">
            {/* Overlay oscuro en móvil cuando sidebar está abierto */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Notificación Toast cuando no hay datos */}
            {noDataMessage && (
                <div style={{
                    position: 'fixed',
                    top: '100px',
                    right: '20px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    zIndex: 10000,
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    {noDataMessage}
                </div>
            )}

            {/* Sidebar arrastrable */}
            <VisorSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

            {/* Header profesional con fecha y botón recargar integrados */}
            <VisorHeader
                lguaxxToggle={showLguaxx}
                setLguaxxToggle={setShowLguaxx}
                loxxToggle={showLoxx}
                setLoxxToggle={setShowLoxx}
                radarTime={radarCaptureTime}
                onReload={loadFrames}
                loading={loading}
                timeInterval={timeInterval}
                setTimeInterval={setTimeInterval}
                playbackSpeed={playbackSpeed}
                setPlaybackSpeed={setPlaybackSpeed}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
            />

            <div className="visor-map">
                {loading ? (
                    <div className="loading-overlay"> Cargando...</div>
                ) : (
                    <MapContainer center={[-4.0, -79.5]} zoom={9} style={{ width: '100%', height: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {/* Círculo de cobertura LGUAXX (azul/morado) */}
                        {showLguaxx && (
                            <Circle
                                center={[-4.036, -79.872]} // Coordenadas oficiales GUAXX (Celica)
                                radius={100000} // 100 km de radio (oficial)
                                pathOptions={{
                                    color: '#6366f1',
                                    fillOpacity: 0,
                                    weight: 2,
                                    opacity: 0.8
                                }}
                            />
                        )}

                        {/* Círculo de cobertura LOXX (verde) */}
                        {showLoxx && (
                            <Circle
                                center={[-3.987, -79.144]} // Coordenadas oficiales LOXX (Loja)
                                radius={70000} // 70 km de radio (oficial)
                                pathOptions={{
                                    color: '#10b981',
                                    fillOpacity: 0,
                                    weight: 2,
                                    opacity: 0.8
                                }}
                            />
                        )}

                        {showLguaxx && lguaxxFrame && lguaxxFrame.url && lguaxxFrame.bounds && (
                            <TransparentRadarOverlay
                                key={`lguaxx-${lguaxxFrame.url}-${cacheBuster}`}
                                imageUrl={`${lguaxxFrame.url}?t=${cacheBuster}`}
                                bounds={lguaxxFrame.bounds}
                                radarId="LGUAXX"
                                opacity={0.7}
                            />
                        )}

                        {showLoxx && loxxFrame && loxxFrame.url && loxxFrame.bounds && (
                            <TransparentRadarOverlay
                                key={`loxx-${loxxFrame.url}-${cacheBuster}`}
                                imageUrl={`${loxxFrame.url}?t=${cacheBuster}`}
                                bounds={loxxFrame.bounds}
                                radarId="LOXX"
                                opacity={0.7}
                            />
                        )}
                    </MapContainer>
                )}

                {/* PANEL UNIFICADO DE CONTROLES (Arrastrable via Header) */}
                <div
                    style={{
                        position: 'absolute',
                        top: `${panelPosition.top}px`,
                        left: panelPosition.left !== null ? `${panelPosition.left}px` : 'auto',
                        right: panelPosition.right !== null ? `${panelPosition.right}px` : 'auto',
                        width: '280px',
                        backgroundColor: '#0f172a', // Fondo oscuro (Dark Slate)
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        overflow: 'hidden',
                        zIndex: 1000,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        userSelect: 'none'
                    }}
                >
                    {/* Header con manejador de arrastre */}
                    <div
                        onMouseDown={(e) => {
                            e.preventDefault(); // Evitar selección de texto
                            const panel = e.currentTarget.parentElement;
                            const rect = panel.getBoundingClientRect();

                            // Calcular posición inicial para delta relativo (prevención de saltos)
                            const startLeft = panel.offsetLeft;
                            const startTop = panel.offsetTop;
                            dragOffset.current = {
                                startMouseX: e.clientX,
                                startMouseY: e.clientY,
                                startPanelLeft: startLeft,
                                startPanelTop: startTop
                            };
                            isDragging.current = true;

                            // Funciones para el movimiento (definidas dentro o fuera, aquí inline para acceso a scope)
                            const handleMouseMove = (moveEvent) => {
                                if (!isDragging.current) return;

                                const deltaX = moveEvent.clientX - dragOffset.current.startMouseX;
                                const deltaY = moveEvent.clientY - dragOffset.current.startMouseY;

                                // Actualizar estado usando deltas
                                setPanelPosition({
                                    top: dragOffset.current.startPanelTop + deltaY,
                                    left: dragOffset.current.startPanelLeft + deltaX,
                                    right: null
                                });
                            };

                            const handleMouseUp = () => {
                                isDragging.current = false;
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                            };

                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                        }}
                        style={{
                            backgroundColor: '#0e7490', // Cyan-700
                            color: 'white',
                            padding: '10px',
                            textAlign: 'center',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'move', // Cursor indica que es movible
                            letterSpacing: '1px'
                        }}
                    >
                        ANIMACIÓN RADAR
                    </div>

                    {/* Body */}
                    <div style={{ padding: '15px', color: 'white' }}>

                        {/* Controles de Reproducción */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '15px' }}>
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                title={isPlaying ? "Pausar" : "Reproducir"}
                                style={{
                                    backgroundColor: 'transparent', border: '2px solid white', borderRadius: '50%',
                                    width: '32px', height: '32px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {isPlaying ? '⏸' : '▶'}
                            </button>
                            <button
                                onClick={() => {
                                    setLoading(true); // Feedback visual
                                    loadFrames(new AbortController().signal); // Recargar
                                }}
                                title="Detener/Recargar"
                                style={{
                                    backgroundColor: 'transparent', border: '2px solid white', borderRadius: '50%',
                                    width: '32px', height: '32px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                }}
                            >
                                ⏹
                            </button>
                            {/* Anterior */}
                            <button
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                style={{
                                    backgroundColor: 'transparent', border: '2px solid white', borderRadius: '50%',
                                    width: '32px', height: '32px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                ◀
                            </button>
                            {/* Siguiente */}
                            <button
                                onClick={() => setCurrentIndex(Math.min(maxLength - 1, currentIndex + 1))}
                                style={{
                                    backgroundColor: 'transparent', border: '2px solid white', borderRadius: '50%',
                                    width: '32px', height: '32px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                ▶
                            </button>
                            {/* Velocidad - */}
                            <button
                                onClick={() => setPlaybackSpeed(s => Math.max(0.25, s - 0.25))}
                                style={{
                                    backgroundColor: 'transparent', border: '2px solid white', borderRadius: '50%',
                                    width: '32px', height: '32px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                }}
                            >
                                -
                            </button>
                            {/* Velocidad + */}
                            <button
                                onClick={() => setPlaybackSpeed(s => Math.min(4, s + 0.25))}
                                style={{
                                    backgroundColor: 'transparent', border: '2px solid white', borderRadius: '50%',
                                    width: '32px', height: '32px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                }}
                            >
                                +
                            </button>
                        </div>

                        {/* Display de Tiempo */}
                        <div style={{ textAlign: 'center', marginBottom: '10px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold' }}>
                            {(() => {
                                const lguaxxIdx = showLguaxx ? getLguaxxIndex(currentIndex) : -1;
                                const loxxIdx = showLoxx ? getLoxxIndex(currentIndex) : -1;
                                const frame = (lguaxxIdx !== -1 && lguaxxFrames[lguaxxIdx]) ? lguaxxFrames[lguaxxIdx] :
                                    (loxxIdx !== -1 && loxxFrames[loxxIdx]) ? loxxFrames[loxxIdx] : null;

                                if (frame) {
                                    const d = new Date(frame.timestamp || frame.sourceTimestamp);
                                    // Ajustar zona horaria si es necesario, o usar UTC si ya está en local
                                    // Asumiendo que timestamp es UTC y queremos mostrar local o como venga
                                    // Usamos lógica simple de formateo
                                    const day = String(d.getDate()).padStart(2, '0');
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    const year = d.getFullYear();
                                    const h = String(d.getHours()).padStart(2, '0');
                                    const m = String(d.getMinutes()).padStart(2, '0');
                                    return `${day}/${month}/${year} ${h}:${m}`;
                                }
                                return '--/--/---- --:--';
                            })()}
                        </div>

                        {/* Slider de Progreso */}
                        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
                            <input
                                type="range"
                                min="0"
                                max={Math.max(0, maxLength - 1)}
                                value={currentIndex}
                                onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                                style={{
                                    width: '100%',
                                    cursor: 'pointer',
                                    accentColor: '#ffffff' // Blanco para contrastar
                                }}
                            />
                        </div>

                        {/* Inputs Grid */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                            {/* Intervalo */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#cbd5e1' }}>Intervalo:</label>
                                <select
                                    value={timeInterval}
                                    onChange={(e) => setTimeInterval(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        backgroundColor: '#0e7490', // Cyan 700
                                        color: 'white',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">Todo el día</option>
                                    <option value="1">1h</option>
                                    <option value="3">3h</option>
                                    <option value="6">6h</option>
                                    <option value="12">12h</option>
                                    <option value="24">24h</option>
                                </select>
                            </div>

                            {/* Fecha */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#cbd5e1' }}>Fecha:</label>
                                <div
                                    onClick={() => setShowCalendarModal(true)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #0e7490',
                                        borderRadius: '4px',
                                        backgroundColor: 'transparent',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <span style={{ fontSize: '14px' }}>
                                        {viewMode === 'current' ?
                                            // Mostrar fecha actual formateada
                                            (() => {
                                                const now = new Date();
                                                const d = String(now.getDate()).padStart(2, '0');
                                                const m = String(now.getMonth() + 1).padStart(2, '0');
                                                const y = now.getFullYear();
                                                return `${d}/${m}/${y} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                            })()
                                            :
                                            (() => {
                                                const d = String(selectedDate.getDate()).padStart(2, '0');
                                                const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                                const y = selectedDate.getFullYear();
                                                const h = String(selectedHour).padStart(2, '0');
                                                const min = String(selectedMinute).padStart(2, '0');
                                                return `${d}/${m}/${y} ${h}:${min}`;
                                            })()
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div> {/* Closing visor-map */}

            {/* Modal de Calendario para selección de fecha/hora histórica */}
            {showCalendarModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000
                    }}
                    onClick={() => setShowCalendarModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                            maxWidth: '350px',
                            width: '90%'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header del calendario con navegación de mes/año */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <button
                                onClick={() => {
                                    if (calendarMonth === 0) {
                                        setCalendarMonth(11);
                                        setCalendarYear(calendarYear - 1);
                                    } else {
                                        setCalendarMonth(calendarMonth - 1);
                                    }
                                }}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '16px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                ◄
                            </button>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                                {new Date(calendarYear, calendarMonth).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </h3>
                            <button
                                onClick={() => {
                                    if (calendarMonth === 11) {
                                        setCalendarMonth(0);
                                        setCalendarYear(calendarYear + 1);
                                    } else {
                                        setCalendarMonth(calendarMonth + 1);
                                    }
                                }}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '16px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                ►
                            </button>
                        </div>

                        {/* Días de la semana */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '4px',
                            marginBottom: '8px',
                            textAlign: 'center'
                        }}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                <div key={day} style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280' }}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendario de días */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '4px',
                            marginBottom: '16px'
                        }}>
                            {(() => {
                                const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                                const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                                const cells = [];

                                // Espacios vacíos al inicio
                                for (let i = 0; i < firstDay; i++) {
                                    cells.push(<div key={`empty-${i}`} />);
                                }

                                // Días del mes
                                for (let day = 1; day <= daysInMonth; day++) {
                                    const currentDay = day;
                                    const isSelected = selectedDate.getDate() === day &&
                                        selectedDate.getMonth() === calendarMonth &&
                                        selectedDate.getFullYear() === calendarYear;

                                    cells.push(
                                        <div
                                            key={day}
                                            onClick={() => {
                                                const newDate = new Date(calendarYear, calendarMonth, currentDay);
                                                setSelectedDate(newDate);
                                            }}
                                            style={{
                                                padding: '8px',
                                                fontSize: '13px',
                                                textAlign: 'center',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                backgroundColor: isSelected ? '#3b82f6' : 'white',
                                                color: isSelected ? 'white' : '#1f2937',
                                                fontWeight: isSelected ? '600' : 'normal',
                                                border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.backgroundColor = 'white';
                                                }
                                            }}
                                        >
                                            {day}
                                        </div>
                                    );
                                }

                                return cells;
                            })()}
                        </div>

                        {/* Sección de Time */}
                        <div style={{ marginBottom: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px', display: 'block' }}>
                                Time
                            </label>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '12px', textAlign: 'center' }}>
                                {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}
                            </div>

                            {/* Slider de Hora */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                    Hora
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="23"
                                    value={selectedHour}
                                    onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Slider de Minuto */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                    Minuto
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="59"
                                    value={selectedMinute}
                                    onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                            <button
                                onClick={() => {
                                    // Volver a datos actuales
                                    const now = new Date();
                                    setSelectedDate(now);
                                    setSelectedHour(now.getHours());
                                    setSelectedMinute(now.getMinutes());
                                    setCalendarMonth(now.getMonth());
                                    setCalendarYear(now.getFullYear());
                                    setViewMode('current');
                                    setShowCalendarModal(false);
                                    setCacheBuster(Date.now());
                                    setNoDataMessage(''); // Limpiar mensajes
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    backgroundColor: 'white',
                                    color: '#374151',
                                    cursor: 'pointer'
                                }}
                            >
                                Ahora
                            </button>
                            <button
                                onClick={() => {
                                    // Cargar datos históricos
                                    setViewMode('historical');
                                    setShowCalendarModal(false);
                                    setCacheBuster(Date.now());
                                    setNoDataMessage(''); // Limpiar mensajes
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    border: 'none',
                                    borderRadius: '6px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default VisorNuevo;
