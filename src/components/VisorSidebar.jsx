import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from 'lucide-react';

const VisorSidebar = () => {
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
    if (location.pathname === '/soporte') return 'soporte';
    return 'visor';
  };

  const activeMenu = getActiveMenu();

  // Handlers para arrastrar el sidebar
  const handleMouseDown = (e) => {
    if (e.target.closest('a, button, nav')) return;
    setIsDragging(true);
    if (sidebarRef.current) {
      const rect = sidebarRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setSidebarPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <aside
      ref={sidebarRef}
      className="absolute w-64 z-30 flex flex-col backdrop-blur-[18px] bg-[rgba(255,255,255,0.55)] shadow-2xl rounded-lg overflow-hidden cursor-move"
      style={{
        left: `${sidebarPosition.x || 20}px`,
        top: `${sidebarPosition.y || 230}px`,
        maxHeight: 'calc(100vh - 140px)',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
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
        <Link
          to="/soporte"
          className={`flex items-center px-4 py-3 mb-1 rounded-lg transition-all duration-200 ${activeMenu === 'soporte'
              ? 'bg-[#EBF4FF] text-[#3C4043] font-medium border-l-4 border-[#4285F4]'
              : 'text-gray-700 hover:text-[#3272CA] hover:bg-white/40'
            }`}
        >
          <span>Soporte</span>
        </Link>
      </nav>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-300/30" onMouseDown={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(0, 255, 0)' }}></div>
            <span className="text-xs text-gray-700">Ligera</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(255, 255, 0)' }}></div>
            <span className="text-xs text-gray-700">Moderada</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(255, 50, 0)' }}></div>
            <span className="text-xs text-gray-700">Fuerte</span>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="px-4 py-3 border-t border-gray-300/30 flex items-center justify-between" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gray-200/60 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-800">Full Name</span>
            <span className="text-xs text-gray-600">Designation</span>
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </aside>
  );
};

export default VisorSidebar;


