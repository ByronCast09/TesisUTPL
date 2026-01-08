import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import TransparentRadarOverlay from '../components/TransparentRadarOverlay';
import VisorSidebar from '../components/VisorSidebar';
import VisorHeader from '../components/VisorHeader';
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
    const [timeInterval, setTimeInterval] = useState(''); // '', '1h', '3h', '6h', '12h', '24h'
    const [cacheBuster, setCacheBuster] = useState(Date.now());
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Estado sidebar móvil
    const intervalRef = useRef(null);

    useEffect(() => {
        loadFrames();
    }, [timeInterval]); // Recargar cuando cambia el intervalo

    const loadFrames = async () => {
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
            // ⚡ LGUAXX: Usar endpoint con intervalo si está seleccionado
            let lguaxxApiUrl = `/api/radar/LGUAXX/pngs/viewer-frames?t=${cacheBuster}`;
            if (timeInterval) {
                // Usar nuevo endpoint que filtra desde el último frame hacia atrás
                lguaxxApiUrl = `/api/radar/LGUAXX/pngs/recent?hours=${timeInterval}&t=${cacheBuster}`;
            }

            const lguaxxResponse = await fetch(lguaxxApiUrl);
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
            }
            // ⚡ LOXX: Usar endpoint con intervalo si está seleccionado (igual que LGUAXX)
            let loxxApiUrl = `/api/radar/LOXX/pngs/viewer-frames?t=${cacheBuster}`;
            if (timeInterval) {
                // Usar endpoint que filtra desde el último frame hacia atrás
                loxxApiUrl = `/api/radar/LOXX/pngs/recent?hours=${timeInterval}&t=${cacheBuster}`;
            }

            const loxxResponse = await fetch(loxxApiUrl);
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
                console.log('⚠️ No hay frames LOXX disponibles');
            }
            // ⚡ Establecer índice al último frame INMEDIATAMENTE
            const maxLength = Math.max(lguaxxFramesArray.length, loxxFramesArray.length);
            if (maxLength > 0) {
                const lastIndex = maxLength - 1;
                // Usar setTimeout con delay 0 para asegurar que React haya terminado de actualizar el estado
                setTimeout(() => {
                    setCurrentIndex(lastIndex);
                    console.log(`📍 Visor inicializado en último frame: ${lastIndex + 1} de ${maxLength}`);
                }, 0);
            }
        } catch (error) {
            console.error('❌ Error cargando frames:', error);
            setLoxxFrames([]);
            setLguaxxFrames([]);
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

                {/* Selector de intervalo draggable */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '60px',
                        right: '20px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(5px)',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        cursor: 'move',
                        userSelect: 'none'
                    }}
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDrag={(e) => {
                        if (e.clientX === 0 && e.clientY === 0) return;
                        const target = e.currentTarget;
                        target.style.left = `${e.clientX - 80}px`;
                        target.style.top = `${e.clientY - 40}px`;
                        target.style.right = 'auto';
                        target.style.bottom = 'auto';
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#4b5563',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            Intervalo:
                        </label>
                        <select
                            value={timeInterval}
                            onChange={(e) => setTimeInterval(e.target.value)}
                            style={{
                                padding: '6px 10px',
                                fontSize: '13px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                outline: 'none',
                                backgroundColor: 'white',
                                cursor: 'pointer'
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
                </div>
            </div>

            <div className="visor-footer">
                <div className="playback-controls">
                    <button onClick={() => setCurrentIndex(0)} disabled={maxLength === 0}>
                        ⏮ Primero
                    </button>
                    <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0 || maxLength === 0}>
                        ◀ Anterior
                    </button>
                    <button onClick={() => setIsPlaying(!isPlaying)} disabled={maxLength === 0} className={isPlaying ? 'pause-btn' : 'play-btn'}>
                        {isPlaying ? '⏸ Pausar' : '▶ Reproducir'}
                    </button>
                    <button onClick={() => setCurrentIndex(Math.min(maxLength - 1, currentIndex + 1))} disabled={currentIndex === maxLength - 1 || maxLength === 0}>
                        Siguiente ▶
                    </button>
                    <button onClick={() => setCurrentIndex(maxLength - 1)} disabled={maxLength === 0}>
                        Último ⏭
                    </button>
                </div>

                {/* Control de velocidad - Solo en Desktop (oculto en móvil) */}
                <div className="hidden md:flex" style={{ alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>
                        Velocidad:
                    </span>
                    <input
                        type="range"
                        min="0.25"
                        max="4"
                        step="0.25"
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                        style={{ width: '120px' }}
                    />
                    <span style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#1f2937',
                        minWidth: '45px',
                        textAlign: 'center'
                    }}>
                        {playbackSpeed}x
                    </span>
                </div>

                <div className="frame-counter">
                    Frame: {currentIndex + 1} / {maxLength}
                </div>
            </div>
        </div>
    );
};

export default VisorNuevo;
