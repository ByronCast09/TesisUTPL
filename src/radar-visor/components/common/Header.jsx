import React, { useState } from 'react';
import Button from '../ui/Button';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-[14px]">
        <div className="flex flex-col lg:flex-row justify-between items-center py-4 lg:py-0 lg:h-[95px]">
          {/* Logo */}
          <div className="flex justify-between items-center w-full lg:w-auto">
            <h1 className="text-[24px] sm:text-[32px] lg:text-[48px] font-poppins font-semibold leading-[36px] sm:leading-[48px] lg:leading-[72px] text-global-1">
              UTPL
            </h1>
            
            {/* Mobile Menu Toggle */}
            <button 
              className="block lg:hidden p-2" 
              aria-label="Open menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className={`${menuOpen ? 'block' : 'hidden'} lg:block w-full lg:w-auto mt-4 lg:mt-0`}>
            <div className="flex flex-col lg:flex-row justify-between items-center lg:w-[40%] space-y-4 lg:space-y-0">
              <a 
                href="#inicio" 
                className="text-[14px] lg:text-[16px] font-poppins font-medium leading-[21px] lg:leading-[24px] text-global-1 hover:text-global-5 transition-colors"
              >
                Inicio
              </a>
              <a 
                href="#visor" 
                className="text-[14px] lg:text-[16px] font-poppins font-medium leading-[21px] lg:leading-[24px] text-global-1 hover:text-global-5 transition-colors"
              >
                Visor
              </a>
              <a 
                href="#contacto" 
                className="text-[14px] lg:text-[16px] font-poppins font-medium leading-[21px] lg:leading-[24px] text-global-1 hover:text-global-5 transition-colors"
              >
                Contacto
              </a>
              <a 
                href="#equipo" 
                className="text-[14px] lg:text-[16px] font-poppins font-medium leading-[21px] lg:leading-[24px] text-global-1 hover:text-global-5 transition-colors"
              >
                Equipo
              </a>
            </div>
          </nav>

          {/* Action Icons and Register Button */}
          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <div className="flex items-center space-x-6 mr-0 lg:mr-[46px]">
              <a href="#account" className="hover:opacity-75 transition-opacity">
                <img 
                  src="/images/img_mdi_account_alert_outline.svg" 
                  alt="Account" 
                  className="w-[24px] h-[28px] lg:w-[28px] lg:h-[32px]"
                />
              </a>
              <a href="#search" className="hover:opacity-75 transition-opacity">
                <img 
                  src="/images/img_akar_icons_search.svg" 
                  alt="Search" 
                  className="w-[24px] h-[28px] lg:w-[28px] lg:h-[32px]"
                />
              </a>
            </div>
            
            <Button
              variant="custom"
              className="text-[14px] lg:text-[16px] font-poppins font-medium leading-[21px] lg:leading-[24px] text-global-1 border border-[#212832] rounded-[5px] px-2 py-1 lg:px-[8px] lg:py-[8px] mt-[3px] lg:mt-[6px] hover:bg-gray-50 transition-colors"
              onClick={() => console.log('Register clicked')}
            >
              Regístrate
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;