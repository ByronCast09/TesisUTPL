import React, { useState } from 'react';
import EditText from '../../components/ui/EditText';

const RadarDashboard = () => {
  const [guaxxToggle, setGuaxxToggle] = useState(true);
  const [loxxToggle, setLoxxToggle] = useState(true);

  return (
    <div className="w-full min-h-screen bg-global-11 flex flex-col">
      {/* Header */}
      <header className="w-full px-4 sm:px-6 lg:px-10 xl:px-20 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-0">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/images/img_group_black_900.svg" 
              alt="UTPL Logo" 
              className="w-[30px] h-[21px] sm:w-[40px] sm:h-[28px]"
            />
          </div>

          {/* Navigation and Controls */}
          <div className="w-full lg:w-auto flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-8">
            {/* Main Navigation */}
            <nav className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8">
              <span className="text-sm sm:text-base font-medium text-global-1 font-poppins">Inicio</span>
              <span className="text-sm sm:text-base font-medium text-global-1 font-poppins">Visor</span>
              <span className="text-sm sm:text-base font-medium text-global-1 font-poppins">Contacto</span>
              <span className="text-sm sm:text-base font-medium text-global-1 font-poppins">Equipo</span>
            </nav>

            {/* UTPL Title and Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 lg:gap-8 w-full lg:w-auto">
              <h1 className="text-2xl sm:text-3xl lg:text-[48px] font-semibold text-global-1 font-poppins leading-tight">
                UTPL
              </h1>
              
              {/* Account and Search Icons */}
              <div className="flex items-center gap-4 sm:gap-6">
                <img 
                  src="/images/img_mdi_account_alert_outline.svg" 
                  alt="Account" 
                  className="w-[20px] h-[14px] sm:w-[28px] sm:h-[20px] cursor-pointer"
                />
                <img 
                  src="/images/img_akar_icons_search.svg" 
                  alt="Search" 
                  className="w-[20px] h-[14px] sm:w-[28px] sm:h-[20px] cursor-pointer"
                />
              </div>
            </div>

            {/* Register Button */}
            <button className="px-3 py-2 sm:px-4 sm:py-2 border border-[#212832] rounded-md text-sm sm:text-base font-medium text-global-1 font-poppins hover:bg-gray-50 transition-colors duration-200">
              Regístrate
            </button>
          </div>
        </div>

        {/* Toggle Switches */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mt-6 lg:mt-4 justify-end">
          {/* GUAXX Toggle */}
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-sm sm:text-base font-medium text-global-1 font-poppins">GUAXX</span>
            <div 
              className={`relative w-[60px] sm:w-[94px] h-[28px] sm:h-[38px] rounded-full cursor-pointer transition-colors duration-300 ${
                guaxxToggle ? 'bg-header-1' : 'bg-gray-300'
              }`}
              onClick={() => setGuaxxToggle(!guaxxToggle)}
            >
              <div 
                className={`absolute top-[3px] w-[22px] sm:w-[34px] h-[22px] sm:h-[34px] bg-header-4 rounded-full transition-transform duration-300 ${
                  guaxxToggle ? 'translate-x-[35px] sm:translate-x-[57px]' : 'translate-x-[3px]'
                }`}
              />
            </div>
            <div className="w-[16px] sm:w-[22px] h-[16px] sm:h-[22px] bg-header-2 rounded-lg" />
          </div>

          {/* LOXX Toggle */}
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-sm sm:text-base font-medium text-global-1 font-poppins">LOXX</span>
            <div 
              className={`relative w-[60px] sm:w-[94px] h-[28px] sm:h-[38px] rounded-full cursor-pointer transition-colors duration-300 ${
                loxxToggle ? 'bg-header-1' : 'bg-gray-300'
              }`}
              onClick={() => setLoxxToggle(!loxxToggle)}
            >
              <div 
                className={`absolute top-[3px] w-[22px] sm:w-[34px] h-[22px] sm:h-[34px] bg-header-4 rounded-full transition-transform duration-300 ${
                  loxxToggle ? 'translate-x-[35px] sm:translate-x-[57px]' : 'translate-x-[3px]'
                }`}
              />
            </div>
            <div className="w-[16px] sm:w-[22px] h-[16px] sm:h-[22px] bg-header-3 rounded-lg" />
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-10 pb-16">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full">
          {/* Sidebar */}
          <aside className="w-full lg:w-[280px] xl:w-[320px] bg-white rounded-lg shadow-lg border border-[#e2e1e77e] p-4 sm:p-6">
            {/* Sidebar Header */}
            <div className="flex flex-col gap-5 mb-6">
              <img 
                src="/images/img_actions.svg" 
                alt="Actions" 
                className="w-[32px] h-[8px] sm:w-[42px] sm:h-[10px]"
              />
              
              <div className="flex items-center gap-3">
                <img 
                  src="/images/img_logo.svg" 
                  alt="RadarEC Logo" 
                  className="w-[33px] h-[14px] sm:w-[44px] sm:h-[18px]"
                />
                <span className="text-sm sm:text-base font-medium text-global-1 font-poppins">
                  RadarEC
                </span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1 mb-6">
              {/* Active Item - Visor */}
              <div className="flex items-center">
                <div className="flex items-center gap-3 px-3 py-2 flex-1">
                  <img 
                    src="/images/img_home.svg" 
                    alt="Home" 
                    className="w-[14px] h-[14px] sm:w-[18px] sm:h-[18px]"
                  />
                  <span className="text-xs sm:text-sm text-global-7 font-abyssinica">
                    Visor
                  </span>
                </div>
                <div className="w-[3px] sm:w-[4px] h-[28px] sm:h-[38px] bg-global-4 rounded-l-sm" />
              </div>

              {/* Other Menu Items */}
              {[
                { icon: '/images/img_vector.svg', label: 'Datos Históricos' },
                { icon: '/images/img_tasks.svg', label: 'Últimos Registros' },
                { icon: '/images/img_stats.svg', label: 'Análisis Gráficos' }
              ]?.map((item, index) => (
                <div key={index} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
                  <img 
                    src={item?.icon} 
                    alt={item?.label} 
                    className="w-[14px] h-[14px] sm:w-[18px] sm:h-[18px]"
                  />
                  <span className="text-xs sm:text-sm text-global-6 font-abyssinica">
                    {item?.label}
                  </span>
                </div>
              ))}
            </nav>

            {/* Divider */}
            <div className="w-full h-[1px] bg-global-10 mb-6" />

            {/* Notifications */}
            <div className="mb-6">
              <EditText
                placeholder="Notificaciones"
                className="bg-edittext-1 px-10 py-2 text-xs sm:text-sm text-global-6 font-abyssinica rounded-md"
                leftImage={{
                  src: "/images/img_notifications.svg",
                  width: 18,
                  height: 18
                }}
                onChange={() => {}}
              />
            </div>

            {/* Additional Menu Items */}
            <nav className="space-y-1 mb-8">
              {[
                { icon: '/images/img_settings.svg', label: 'Opciones' },
                { icon: '/images/img_support.svg', label: 'Soporte' }
              ]?.map((item, index) => (
                <div key={index} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
                  <img 
                    src={item?.icon} 
                    alt={item?.label} 
                    className="w-[14px] h-[14px] sm:w-[18px] sm:h-[18px]"
                  />
                  <span className="text-xs sm:text-sm text-global-6 font-abyssinica">
                    {item?.label}
                  </span>
                </div>
              ))}
            </nav>

            {/* Legend */}
            <div className="bg-global-7 rounded-md p-3 sm:p-4 mb-6">
              <div className="space-y-3 sm:space-y-4">
                {[
                  { color: 'bg-global-12', label: 'Ligera' },
                  { color: 'bg-global-13', label: 'Moderada' },
                  { color: 'bg-global-8', label: 'Fuerte' }
                ]?.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-[16px] sm:w-[22px] h-[16px] sm:h-[22px] ${item?.color} rounded-lg`} />
                    <span className="text-xs sm:text-sm text-global-6 font-abyssinica">
                      {item?.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-[1px] bg-global-9 mb-5" />

            {/* User Profile */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <img 
                  src="/images/img_ellipse_212.png" 
                  alt="User Avatar" 
                  className="w-[32px] h-[32px] sm:w-[42px] sm:h-[42px] rounded-full"
                />
                <div className="flex flex-col">
                  <span className="text-xs sm:text-base font-medium text-global-6 font-aeonik">
                    Full Name
                  </span>
                  <span className="text-xs sm:text-sm text-global-6 font-aeonik">
                    Designation
                  </span>
                </div>
              </div>
              <img 
                src="/images/img_exit.svg" 
                alt="Exit" 
                className="w-[14px] h-[14px] sm:w-[18px] sm:h-[18px] cursor-pointer"
              />
            </div>
          </aside>

          {/* Map Container */}
          <div className="flex-1 relative">
            <div 
              className="w-full h-[400px] sm:h-[500px] lg:h-[600px] xl:h-[700px] bg-cover bg-center rounded-lg overflow-hidden relative"
              style={{ backgroundImage: "url('/images/img_image_5.png')" }}
            >
              {/* Radar Overlays */}
              {guaxxToggle && (
                <div className="absolute bottom-[80px] sm:bottom-[120px] left-1/2 transform -translate-x-1/2 w-[150px] sm:w-[180px] lg:w-[226px] h-[150px] sm:h-[180px] lg:h-[226px] bg-global-5 rounded-full opacity-80" />
              )}
              
              {loxxToggle && (
                <div className="absolute bottom-[20px] sm:bottom-[40px] right-[60px] sm:right-[100px] lg:right-[140px] w-[150px] sm:w-[180px] lg:w-[226px] h-[150px] sm:h-[180px] lg:h-[226px] bg-global-6 rounded-full opacity-80" />
              )}
            </div>

            {/* Legend Box */}
            <div className="absolute bottom-4 right-4 bg-global-7 rounded-md p-3 sm:p-4">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-[16px] sm:w-[22px] h-[16px] sm:h-[22px] bg-global-5 rounded-lg" />
                  <span className="text-xs sm:text-sm text-global-6 font-abyssinica">
                    GUAXX
                  </span>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-[16px] sm:w-[22px] h-[16px] sm:h-[22px] bg-global-6 rounded-lg" />
                  <span className="text-xs sm:text-sm text-global-6 font-abyssinica">
                    LOXX
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Footer Divider */}
      <div className="w-full h-[1px] sm:h-[2px] bg-global-1 mx-4 sm:mx-6 lg:mx-28 mb-8" />
      {/* Footer */}
      <footer className="px-4 sm:px-6 lg:px-28 pb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 lg:gap-12">
          {/* Contact Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-global-2 font-montserrat">
              CONTACTO
            </h3>
            <div className="text-sm sm:text-base text-global-3 font-montserrat font-semibold leading-relaxed">
              <p>Ecuador</p>
              <p>Dirección: Marcelino Champagnat s/n</p>
              <p>Teléfono: +593 3701444</p>
            </div>
          </div>

          {/* University Logo */}
          <div className="flex-shrink-0">
            <img 
              src="/images/img_image_4.png" 
              alt="UTPL University Logo" 
              className="w-[280px] sm:w-[350px] lg:w-[448px] h-[112px] sm:h-[140px] lg:h-[180px] object-contain"
            />
          </div>

          {/* Social Media Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-global-2 font-montserrat">
              REDES SOCIALES
            </h3>
            <div className="flex items-center gap-4">
              <img 
                src="/images/img_ic_baseline_facebook.svg" 
                alt="Facebook" 
                className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] cursor-pointer hover:opacity-80 transition-opacity"
              />
              <img 
                src="/images/img_fa6_brands_x_twitter.svg" 
                alt="Twitter" 
                className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] cursor-pointer hover:opacity-80 transition-opacity"
              />
              <img 
                src="/images/img_mdi_instagram.svg" 
                alt="Instagram" 
                className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] cursor-pointer hover:opacity-80 transition-opacity"
              />
              <img 
                src="/images/img_mdi_youtube.svg" 
                alt="YouTube" 
                className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] cursor-pointer hover:opacity-80 transition-opacity"
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RadarDashboard;