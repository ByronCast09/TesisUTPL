import React from 'react';

const Sidebar = ({ className = '' }) => {
  const menuItems = [
    { label: 'Ver datos', active: true },
    { label: 'Histórico', active: false },
    { label: 'Registros recientes', active: false },
    { label: 'Gráficos', active: false }
  ];

  return (
    <aside className={`w-full max-w-[280px] bg-white shadow-lg ${className}`}>
      <div className="p-6">
        <nav className="space-y-2">
          {menuItems?.map((item, index) => (
            <button
              key={index}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
                item?.active 
                  ? 'bg-global-4 text-white font-medium' :'text-global-6 hover:bg-gray-100'
              }`}
            >
              <span className="text-sm font-poppins">
                {item?.label}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;