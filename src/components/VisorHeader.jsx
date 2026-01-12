import React from 'react';
import { Link } from 'react-router-dom';

const VisorHeader = ({
  lguaxxToggle,
  setLguaxxToggle,
  loxxToggle,
  setLoxxToggle,
  radarTime,
  onReload,
  loading,
  timeInterval,
  setTimeInterval,
  playbackSpeed,
  setPlaybackSpeed,
  isSidebarOpen,
  setIsSidebarOpen
}) => {
  return (
    <header className="w-full px-2 py-2 md:px-4 md:py-4 lg:px-10 xl:px-20 bg-white shadow-md z-30 relative">
      <div className="flex items-center justify-between">
        {/* Logo + Hamburger (móvil) */}
        <div className="flex items-center gap-3">
          {/* Botón Hamburguesa - Solo móvil */}
          <button
            onClick={() => setIsSidebarOpen && setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Menú"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarOpen ? (
                // Icono X cuando está abierto
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                // Icono hamburguesa cuando está cerrado
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <h1 className="text-[18px] md:text-[24px] lg:text-[48px] font-poppins font-semibold leading-[24px] md:leading-[36px] lg:leading-[72px] text-global-1">
            UTPL
          </h1>
        </div>

        {/* Navigation Menu - Centered */}
        <nav className="hidden md:flex items-center space-x-8 lg:space-x-12">
          <Link to="/" className="text-[14px] lg:text-[16px] font-poppins font-medium leading-[21px] lg:leading-[24px] text-global-1 hover:text-global-5 transition-colors">
            Inicio
          </Link>
          <Link to="/visor" className="text-[14px] lg:text-[16px] font-poppins font-medium leading-[21px] lg:leading-[24px] text-global-1 hover:text-global-5 transition-colors">
            Visor
          </Link>
          <a href="#contacto" className="text-[14px] lg:text-[16px] font-poppins font-medium leading-[21px] lg:leading-[24px] text-global-1 hover:text-global-5 transition-colors">
            Contacto
          </a>
          <Link to="/equipo" className="text-[14px] lg:text-[16px] font-poppins font-medium leading-[21px] lg:leading-[24px] text-global-1 hover:text-global-5 transition-colors">
            Equipo
          </Link>
        </nav>

        {/* Right side controls - Hidden on mobile */}
        <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
          <img
            src="/images/img_mdi_account_alert_outline.svg"
            alt="Account"
            className="w-[24px] h-[28px] lg:w-[28px] lg:h-[32px] cursor-pointer hover:opacity-75"
          />
          <img
            src="/images/img_akar_icons_search.svg"
            alt="Search"
            className="w-[24px] h-[28px] lg:w-[28px] lg:h-[32px] cursor-pointer hover:opacity-75"
          />
          <button className="text-[14px] lg:text-[16px] font-poppins font-medium leading-[21px] lg:leading-[24px] text-global-1 border border-[#212832] rounded-[5px] px-2 py-1 lg:px-[8px] lg:py-[8px] hover:bg-gray-50 transition-colors">
            Regístrate
          </button>
        </div>
      </div>

      {/* Toggle Switches and Date/Reload (Segunda fila) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-1 md:mt-4 gap-2">
        {/* Fechas (izquierda) - Compacto en móvil */}
        <div className="flex flex-col text-xs md:text-sm">
          {radarTime && (() => {
            // Calcular tiempo relativo (hace X min)
            const now = new Date();
            const utcString = radarTime.utc.replace(' UTC', '').replace(' ', 'T') + ':00Z';
            const captureTime = new Date(utcString);
            const diffMs = now - captureTime;
            const diffMinutes = Math.floor(diffMs / 60000);

            let relativeTime = '';
            if (diffMinutes < 1) {
              relativeTime = 'hace 0min';
            } else if (diffMinutes < 60) {
              relativeTime = `hace ${diffMinutes}min`;
            } else {
              const diffHours = Math.floor(diffMinutes / 60);
              relativeTime = `hace ${diffHours}h${diffMinutes % 60}min`;
            }

            return (
              <div className="text-gray-600">
                <p className="hidden md:block">⏰ Última captura:</p>
                <p className="font-medium">
                  <span className="md:hidden">⏰ </span>
                  {radarTime.lt} • {relativeTime}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Toggle Switches (centro-derecha) */}
        <div className="flex flex-wrap items-center gap-2 md:space-x-6 md:ml-auto">
          <div className="flex items-center space-x-1">
            <span className="text-xs md:text-sm font-medium text-gray-700">GUAXX</span>
            <button
              onClick={() => setLguaxxToggle(!lguaxxToggle)}
              className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors ${lguaxxToggle ? 'bg-purple-500' : 'bg-gray-300'
                }`}
            >
              <span
                className={`inline-block h-3 w-3 md:h-4 md:w-4 transform rounded-full bg-white transition-transform ${lguaxxToggle ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
            <div className="w-3 h-3 md:w-4 md:h-4 bg-purple-500 rounded"></div>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-xs md:text-sm font-medium text-gray-700">LOXX</span>
            <button
              onClick={() => setLoxxToggle(!loxxToggle)}
              className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors ${loxxToggle ? 'bg-green-500' : 'bg-gray-300'
                }`}
            >
              <span
                className={`inline-block h-3 w-3 md:h-4 md:w-4 transform rounded-full bg-white transition-transform ${loxxToggle ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
            <div className="w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded"></div>
          </div>

          {/* Botón Recargar - compacto en móvil */}
          {onReload && (
            <button
              onClick={onReload}
              disabled={loading}
              className={`px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm font-medium rounded-md transition-all ${loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
            >
              {loading ? (window.innerWidth < 768 ? '⏳' : '⏳ Cargando...') : (window.innerWidth < 768 ? '🔄' : '🔄 Recargar')}
            </button>
          )}


        </div>
      </div>

      {/* Tercera fila - Control de Velocidad SOLO en Móvil - MÁS COMPACTO */}
      {playbackSpeed !== undefined && setPlaybackSpeed && (
        <div className="flex md:hidden items-center justify-center mt-1 pb-1">
          <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded border border-gray-200">
            <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Vel:</span>
            <input
              type="range"
              min="0.25"
              max="4"
              step="0.25"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="text-xs font-bold text-gray-900 min-w-[28px] text-center">
              {playbackSpeed}x
            </span>
          </div>
        </div>
      )}

    </header>
  );
};

export default VisorHeader;

