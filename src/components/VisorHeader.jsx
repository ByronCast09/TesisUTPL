import React from 'react';
import { Link } from 'react-router-dom';

const VisorHeader = ({
  lguaxxToggle,
  setLguaxxToggle,
  loxxToggle,
  setLoxxToggle,
  displayDate,
  onReload,
  loading
}) => {
  return (
    <header className="w-full px-4 sm:px-6 lg:px-10 xl:px-20 py-4 bg-white shadow-md z-30 relative">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-[24px] sm:text-[32px] lg:text-[48px] font-poppins font-semibold leading-[36px] sm:leading-[48px] lg:leading-[72px] text-global-1">
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

        {/* Right side controls */}
        <div className="flex items-center space-x-4 lg:space-x-6">
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
      <div className="flex items-center justify-between mt-4">
        {/* Fecha (izquierda) - solo si displayDate está presente */}
        {displayDate && (
          <div className="flex items-center">
            <p className="text-sm font-medium text-gray-700">
              📅 {displayDate}
            </p>
          </div>
        )}

        {/* Toggle Switches (centro-derecha) */}
        <div className="flex items-center space-x-6 ml-auto">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">GUAXX</span>
            <button
              onClick={() => setLguaxxToggle(!lguaxxToggle)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${lguaxxToggle ? 'bg-purple-500' : 'bg-gray-300'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${lguaxxToggle ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">LOXX</span>
            <button
              onClick={() => setLoxxToggle(!loxxToggle)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${loxxToggle ? 'bg-green-500' : 'bg-gray-300'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${loxxToggle ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
            <div className="w-4 h-4 bg-green-500 rounded"></div>
          </div>

          {/* Botón Recargar - solo si onReload está presente */}
          {onReload && (
            <button
              onClick={onReload}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
            >
              {loading ? '⏳ Cargando...' : '🔄 Recargar'}
            </button>
          )}
        </div>
      </div>

    </header>
  );
};

export default VisorHeader;

