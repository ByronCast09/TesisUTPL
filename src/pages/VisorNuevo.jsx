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
    const [cacheBuster, setCacheBuster] = useState(Date.now());
    const intervalRef = useRef(null);

    useEffect(() => {
        loadFrames();
    }, []);

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
            // ⚡ LGUAXX: Usar endpoint optimizado (igual que LOXX)
            const lguaxxResponse = await fetch(`/api/radar/LGUAXX/pngs/viewer-frames`);
            const lguaxxData = await lguaxxResponse.json();

            if (lguaxxData.frames && lguaxxData.frames.length > 0) {
                const todayFrames = lguaxxData.frames.filter(frame => {
                    const frameDate = new Date(frame.timestamp);
                    const ecuadorMs = frameDate.getTime() - (5 * 60 * 60 * 1000);
                    const ecuadorDate = new Date(ecuadorMs);
                    const frameDateStr = ecuadorDate.toISOString().split('T')[0];
                    return frameDateStr === today;
                });

                todayFrames.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                const framesWithBounds = todayFrames.map(f => ({
                    ...f,
                    bounds: f.bounds?.northEast && f.bounds?.southWest
                        ? [[f.bounds.southWest[0], f.bounds.southWest[1]], [f.bounds.northEast[0], f.bounds.northEast[1]]]
                        : [[-4.944622, -80.770709], [-3.136104, -78.967612]]
                }));

                setLguaxxFrames(framesWithBounds);
                console.log(`✅ LGUAXX: ${framesWithBounds.length} frames para ${today}`);
            } else {
                setLguaxxFrames([]);
            }

            // ⚡ LOXX: Usar endpoint optimizado
            const loxxResponse = await fetch(`/api/radar/LOXX/pngs/viewer-frames`);
            const loxxData = await loxxResponse.json();

            if (loxxData.frames && loxxData.frames.length > 0) {
                // Filtrar frames por fecha Ecuador (cliente hace la conversión timezone)
                const todayFrames = loxxData.frames.filter(frame => {
                    const frameDate = new Date(frame.timestamp);
                    // Convertir UTC a Ecuador (UTC-5)
                    const ecuadorMs = frameDate.getTime() - (5 * 60 * 60 * 1000);
                    const ecuadorDate = new Date(ecuadorMs);
                    const frameDateStr = ecuadorDate.toISOString().split('T')[0];
                    return frameDateStr === today;
                });

                // Ordenar por timestamp ascendente
                todayFrames.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                const framesWithBounds = todayFrames.map(f => ({
                    ...f,
                    bounds: f.bounds?.northEast && f.bounds?.southWest
                        ? [[f.bounds.southWest[0], f.bounds.southWest[1]], [f.bounds.northEast[0], f.bounds.northEast[1]]]
                        : [[-5.077081, -80.286881], [-2.914919, -78.124719]]
                }));

                setLoxxFrames(framesWithBounds);
                console.log(`✅ LOXX: ${framesWithBounds.length} frames para ${today}`);
            } else {
                setLoxxFrames([]);
                console.log('⚠️ No hay frames LOXX disponibles');
            }

            const maxLength = Math.max(lguaxxFrames.length, loxxFrames.length);
            setCurrentIndex(maxLength > 0 ? maxLength - 1 : 0);
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

    const lguaxxFrame = lguaxxFrames[currentIndex];
    const loxxFrame = loxxFrames[currentIndex];

    // Obtener timestamp del frame actual
    const currentFrame = loxxFrame || lguaxxFrame;
    const currentTimestamp = currentFrame?.metadata?.sourceTimestamp || currentFrame?.timestamp;
    const displayDate = currentTimestamp ? new Date(currentTimestamp).toLocaleString('es-EC', {
        dateStyle: 'full',
        timeStyle: 'medium'
    }) : new Date().toLocaleDateString('es-EC', { dateStyle: 'full' });

    return (
        <div className="visor-container">
            {/* Sidebar arrastrablé */}
            <VisorSidebar />

            {/* Header profesional con fecha y botón recargar integrados */}
            <VisorHeader
                lguaxxToggle={showLguaxx}
                setLguaxxToggle={setShowLguaxx}
                loxxToggle={showLoxx}
                setLoxxToggle={setShowLoxx}
                displayDate={displayDate}
                onReload={loadFrames}
                loading={loading}
            />

            <div className="visor-map">
                {loading ? (
                    <div className="loading-overlay"> Cargando...</div>
                ) : (
                    <MapContainer center={[-4.0, -79.5]} zoom={7} style={{ width: '100%', height: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {/* Círculo de cobertura LGUAXX (azul/morado) */}
                        {showLguaxx && (
                            <Circle
                                center={[-4.040, -79.869]} // Centro real basado en bounds de LGUAXX
                                radius={100000} // 100 km de radio
                                pathOptions={{
                                    color: '#6366f1', // Borde azul índigo
                                    fillColor: '#818cf8', // Relleno azul claro
                                    fillOpacity: 0.15,
                                    weight: 2,
                                    opacity: 0.5
                                }}
                            />
                        )}

                        {/* Círculo de cobertura LOXX (verde) */}
                        {showLoxx && (
                            <Circle
                                center={[-3.996, -79.206]} // Centro real basado en bounds de LOXX
                                radius={100000} // 100 km de radio
                                pathOptions={{
                                    color: '#10b981', // Borde verde
                                    fillColor: '#34d399', // Relleno verde claro
                                    fillOpacity: 0.15,
                                    weight: 2,
                                    opacity: 0.5
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

                {/* Control de velocidad */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
