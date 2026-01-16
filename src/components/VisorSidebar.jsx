import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

const VisorSidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const location = useLocation();
  const [sidebarPosition, setSidebarPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const sidebarRef = useRef(null);

  // Determinar la opción activa del menú según la ruta
  const getActiveMenu = () => {
    if (location.pathname === '/visor') return 'visor';
    if (location.pathname === '/datos-historicos') return 'datos-historicos';
    if (location.pathname === '/analisis-graficos') return 'analisis-graficos';
    return 'visor';
  };

  const activeMenu = getActiveMenu();

  // Handlers para arrastrar el sidebar (soporte mouse + touch)
  const handleMouseDown = (e) => {
    if (e.target.closest('a, button, nav')) return;
    setIsDragging(true);
    if (sidebarRef.current) {
      const rect = sidebarRef.current.getBoundingClientRect();
      const clientX = e.clientX || (e.touches?.[0]?.clientX);
      const clientY = e.clientY || (e.touches?.[0]?.clientY);
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const clientX = e.clientX || (e.touches?.[0]?.clientX);
      const clientY = e.clientY || (e.touches?.[0]?.clientY);
      setSidebarPosition({
        x: clientX - dragOffset.x,
        y: clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      // Mouse events
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Touch events para móviles
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <aside
      ref={sidebarRef}
      className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex absolute w-64 z-30 flex-col backdrop-blur-[18px] bg-[rgba(255,255,255,0.55)] shadow-2xl rounded-lg overflow-hidden cursor-move`}
      style={{
        left: `${sidebarPosition.x || 20}px`,
        top: `${sidebarPosition.y || 230}px`,
        maxHeight: 'calc(100vh - 140px)',
        userSelect: 'none',
        touchAction: 'none' // Prevenir scroll mientras se arrastra
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* Window Panel Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-300/30 bg-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800">RadarEC</span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"></button>
          <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"></button>
          <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"></button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
        <Link
          to="/visor"
          className={`flex items-center px-4 py-3 mb-1 rounded-lg transition-all duration-200 ${activeMenu === 'visor'
            ? 'bg-[#EBF4FF] text-[#3C4043] font-medium border-l-4 border-[#4285F4]'
            : 'text-gray-700 hover:text-[#3272CA] hover:bg-white/40'
            }`}
        >
          <span>Visor</span>
        </Link>
        <Link
          to="/datos-historicos"
          className={`flex items-center px-4 py-3 mb-1 rounded-lg transition-all duration-200 ${activeMenu === 'datos-historicos'
            ? 'bg-[#EBF4FF] text-[#3C4043] font-medium border-l-4 border-[#4285F4]'
            : 'text-gray-700 hover:text-[#3272CA] hover:bg-white/40'
            }`}
        >
          <span>Datos Históricos</span>
        </Link>
        <Link
          to="/analisis-graficos"
          className={`flex items-center px-4 py-3 mb-1 rounded-lg transition-all duration-200 ${activeMenu === 'analisis-graficos'
            ? 'bg-[#EBF4FF] text-[#3C4043] font-medium border-l-4 border-[#4285F4]'
            : 'text-gray-700 hover:text-[#3272CA] hover:bg-white/40'
            }`}
        >
          <span>Análisis Gráficos</span>
        </Link>
      </nav>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-300/30" onMouseDown={(e) => e.stopPropagation()}>
        <h4 className="text-xs font-semibold text-gray-800 mb-3">Intensidad de Precipitación</h4>
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#00FFFF' }}></div>
            <span className="text-xs text-gray-700">Muy Ligera (8-16 dBZ)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#0080FF' }}></div>
            <span className="text-xs text-gray-700">Ligera (16-24 dBZ)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#0000FF' }}></div>
            <span className="text-xs text-gray-700">Moderada (24-32 dBZ)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#00FF00' }}></div>
            <span className="text-xs text-gray-700">Fuerte (32-40 dBZ)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#FFFF00' }}></div>
            <span className="text-xs text-gray-700">Muy Fuerte (48-56 dBZ)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#FF8000' }}></div>
            <span className="text-xs text-gray-700">Intensa (56-64 dBZ)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#FF0000' }}></div>
            <span className="text-xs text-gray-700">Muy Intensa (64-72 dBZ)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#FF00FF' }}></div>
            <span className="text-xs text-gray-700">Extrema (&gt;72 dBZ)</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-2 italic">
          dBZ = Reflectividad del radar
        </p>
      </div>
    </aside>
  );
};

export default VisorSidebar;


