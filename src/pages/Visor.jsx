import React, { useState } from 'react';
import { 
  Eye, 
  Database, 
  BarChart3, 
  TrendingUp, 
  Bell, 
  Settings, 
  HelpCircle, 
  User,
  RefreshCw
} from 'lucide-react';

const Visor = () => {
  const [guaxxToggle, setGuaxxToggle] = useState(true);
  const [loxxToggle, setLoxxToggle] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="w-full px-4 sm:px-6 lg:px-10 xl:px-20 py-4 bg-white shadow-md z-30 relative">
        <div className="flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <img 
                src="/images/img_utpl_logo.png" 
                alt="UTPL Logo" 
                className="h-12 w-auto"
              />
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">Inicio</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Datos</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Análisis</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Reportes</a>
            </nav>
          </div>

          {/* Title */}
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-blue-600">Universidad Técnica Particular de Loja</h1>
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            <User className="w-6 h-6 text-gray-600 cursor-pointer hover:text-blue-600" />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Registrarse
            </button>
          </div>
        </div>

        {/* Toggle Switches */}
        <div className="flex items-center justify-end space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">GUAXX</span>
            <button
              onClick={() => setGuaxxToggle(!guaxxToggle)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                guaxxToggle ? 'bg-yellow-400' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  guaxxToggle ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">LOXX</span>
            <button
              onClick={() => setLoxxToggle(!loxxToggle)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                loxxToggle ? 'bg-red-400' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  loxxToggle ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute top-4 left-4 z-40 bg-white p-2 rounded-md shadow-md hover:bg-gray-50"
        >
          <Eye className="w-5 h-5 text-gray-600" />
        </button>

        {/* Sidebar */}
        <aside className={`absolute top-0 left-0 h-full w-80 bg-white bg-opacity-90 backdrop-blur-md shadow-lg z-30 transform transition-transform duration-300 ${
          sidebarVisible ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="p-6">
            {/* Sidebar Header */}
            <div className="flex items-center space-x-3 mb-8">
              <img 
                src="/images/img_radarec_logo.png" 
                alt="RadarEC Logo" 
                className="h-10 w-auto"
              />
              <h2 className="text-xl font-bold text-blue-600">RadarEC</h2>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-2 mb-8">
              <a href="#" className="flex items-center space-x-3 px-3 py-2 bg-blue-100 text-blue-600 rounded-md">
                <Eye className="w-5 h-5" />
                <span className="font-medium">Visor</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
                <Database className="w-5 h-5" />
                <span>Datos Históricos</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
                <RefreshCw className="w-5 h-5" />
                <span>Últimos Registros</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
                <BarChart3 className="w-5 h-5" />
                <span>Análisis Gráficos</span>
              </a>
            </nav>

            <hr className="border-gray-200 mb-6" />

            {/* Additional Menu Items */}
            <nav className="space-y-2 mb-8">
              <a href="#" className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
                <Settings className="w-5 h-5" />
                <span>Opciones</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
                <HelpCircle className="w-5 h-5" />
                <span>Soporte</span>
              </a>
            </nav>

            {/* Legend */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Leyenda</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-400 rounded"></div>
                  <span className="text-sm text-gray-600">Ligera</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span className="text-sm text-gray-600">Moderada</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-400 rounded"></div>
                  <span className="text-sm text-gray-600">Fuerte</span>
                </div>
              </div>
            </div>

            <hr className="border-gray-200 mb-6" />

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Usuario</p>
                <p className="text-xs text-gray-500">Administrador</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Map Container */}
        <div className="absolute inset-0 z-10">
          <div 
            className="w-full h-screen bg-cover bg-center overflow-hidden relative"
            style={{ backgroundImage: "url('/images/img_image_5.png')" }}
          >
            {/* Radar Overlays */}
            {guaxxToggle && (
              <div className="absolute bottom-[30%] left-[40%] transform -translate-x-1/2 w-[280px] h-[280px] bg-yellow-400 rounded-full opacity-60" />
            )}
            
            {loxxToggle && (
              <div className="absolute bottom-[20%] right-[20%] w-[220px] h-[220px] bg-red-400 rounded-full opacity-60" />
            )}
          </div>

          {/* Legend Box */}
          <div className="absolute bottom-8 right-8 bg-white bg-opacity-90 backdrop-blur-md rounded-md p-4 shadow-md z-40">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Radares Meteorológicos</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">GUAXX</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">LOXX</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full px-4 sm:px-6 lg:px-10 xl:px-20 py-6 sm:py-8 bg-white border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-8">
            <div className="text-sm text-gray-600">
              <p>Contacto: +593 7 370 1444 ext. 3046</p>
              <p>Email: radarec@utpl.edu.ec</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <img 
              src="/images/img_utpl_logo.png" 
              alt="UTPL" 
              className="h-8 w-auto"
            />
            <div className="flex space-x-2">
              <a href="#" className="text-blue-600 hover:text-blue-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-blue-600 hover:text-blue-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Visor;