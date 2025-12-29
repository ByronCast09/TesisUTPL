import React from 'react';
import Header from '../components/Header';
import Button from '../components/ui/Button';

const Equipo = () => {
  const coordinador = {
    nombre: "Andreas Erwin Fries",
    email: "aefries@utpl.edu.ec",
    imagen: "/images/team/andreas_fries.png" // Ajustar según la ruta real de la imagen
  };

  const equipo = [
    {
      nombre: "Fernando Rodrigo Oñate Valdivieso",
      email: "fronate@utpl.edu.ec",
      imagen: "/images/team/fernando_onate.png"
    },
    {
      nombre: "Carlos Alberto Iñiguez Armijos",
      email: "cainiguez@utpl.edu.ec",
      imagen: "/images/team/carlos_iniguez.png"
    },
    {
      nombre: "Pablo Alejandro Ochoa Cueva",
      email: "paochoa@utpl.edu.ec",
      imagen: "/images/team/pablo_ochoa.png"
    },
    {
      nombre: "Victor Hugo Gonzalez Jaramillo",
      email: "vhgonzalez@utpl.edu.ec",
      imagen: "/images/team/victor_gonzalez.png"
    },
    {
      nombre: "Franz Leonardo Pucha Cofrep",
      email: "fapucha@utpl.edu.ec",
      imagen: "/images/team/franz_pucha.png"
    }
  ];

  return (
    <div className="w-full bg-global-2">
      {/* Hero Section with Background */}
      <section 
        className="w-full bg-cover bg-center bg-no-repeat relative rounded-b-[40px] sm:rounded-b-[50px] lg:rounded-b-[60px] overflow-hidden min-h-[500px] sm:min-h-[600px] lg:min-h-[700px]"
        style={{
          backgroundImage: "url('/images/img_geminigeneratedimage8xcgau8xcgau8xcg_1.png')"
        }}
      >
        <div className="w-full max-w-[1440px] mx-auto">
          {/* Header */}
          <Header />
          
          {/* Hero Content */}
          <div className="px-4 sm:px-6 lg:px-[66px] pb-8 sm:pb-12 lg:pb-16 pt-12 sm:pt-16 lg:pt-24">
            <div className="flex flex-col lg:flex-row justify-start items-start w-full">
              <div className="w-full lg:w-1/2 max-w-[650px]">
                {/* Content Card */}
                <div className="bg-global-3 rounded-[10px] p-4 sm:p-6 lg:p-[16px] mb-6 lg:mb-0">
                  <div className="mb-4 sm:mb-6 lg:mb-[106px]">
                    <p className="text-[12px] sm:text-[14px] lg:text-[16px] font-poppins font-semibold leading-[18px] sm:leading-[21px] lg:leading-[24px] tracking-[2px] sm:tracking-[2.5px] lg:tracking-[3px] text-global-4 mb-2 sm:mb-3 lg:mb-4">
                      Nuevo Formato!
                    </p>
                    <h1 className="text-[28px] sm:text-[36px] lg:text-[52px] font-poppins font-bold leading-[35px] sm:leading-[45px] lg:leading-[65px] text-global-5 mb-4 sm:mb-6 lg:mb-8">
                      Observatorio Clima
                    </h1>
                    <p className="text-[14px] sm:text-[16px] lg:text-[18px] font-poppins font-medium leading-[20px] sm:leading-[22px] lg:leading-[24px] text-global-4 w-full lg:w-[92%]">
                      El Observatorio Climático UTPL se consolida como un espacio de ciencia aplicada, donde convergen el conocimiento académico, la innovación tecnológica y el compromiso social para impulsar políticas públicas y prácticas sostenibles en alianza con gobiernos locales, empresas, organizaciones sociales y la ciudadanía. Con esta iniciativa, UTPL avanza con paso firme hacia una universidad más comprometida con el futuro del planeta y con el bienestar de las generaciones presentes y futuras.
                    </p>
                  </div>
                </div>
                
                {/* CTA Button */}
                <div className="flex justify-center lg:justify-start lg:ml-[354px] lg:-mt-[36px]">
                  <Button
                    variant="custom"
                    className="bg-global-1 text-button-1 text-[14px] sm:text-[16px] font-poppins font-bold leading-[20px] sm:leading-[24px] uppercase px-6 sm:px-8 lg:px-[34px] py-4 sm:py-5 lg:py-[24px] hover:bg-opacity-90 transition-colors"
                    onClick={() => console.log('Comienza ya clicked')}
                  >
                    Comienza ya!
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="w-full bg-global-3 rounded-b-[40px] sm:rounded-b-[50px] lg:rounded-b-[60px]">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-[96px] py-8 sm:py-12 lg:py-[72px]">
          
          {/* Coordinador Section */}
          <div className="flex flex-col items-center mb-12 sm:mb-16 lg:mb-[64px]">
            <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-montserrat font-semibold leading-[25px] sm:leading-[28px] lg:leading-[30px] text-global-2 mb-6 sm:mb-8 lg:mb-[40px]">
              Coordinador
            </h2>
            <div className="flex flex-col items-center">
              <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] lg:w-[160px] lg:h-[160px] rounded-full overflow-hidden mb-4 sm:mb-5 lg:mb-6">
                <img 
                  src={coordinador.imagen} 
                  alt={coordinador.nombre}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/images/placeholder-avatar.png'; // Fallback si no hay imagen
                  }}
                />
              </div>
              <h3 className="text-[16px] sm:text-[18px] lg:text-[20px] font-montserrat font-semibold leading-[20px] sm:leading-[22px] lg:leading-[24px] text-global-2 mb-2 sm:mb-3">
                {coordinador.nombre}
              </h3>
              <a 
                href={`mailto:${coordinador.email}`}
                className="text-[14px] sm:text-[15px] lg:text-[16px] font-montserrat font-normal leading-[20px] sm:leading-[22px] lg:leading-[24px] text-global-1 hover:underline"
              >
                {coordinador.email}
              </a>
            </div>
          </div>

          {/* Equipo Section */}
          <div className="mt-12 sm:mt-16 lg:mt-[64px]">
            <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-montserrat font-semibold leading-[25px] sm:leading-[28px] lg:leading-[30px] text-global-2 mb-6 sm:mb-8 lg:mb-[40px] text-center">
              Equipo
            </h2>
            <div className="flex flex-col sm:flex-row justify-center items-start gap-8 sm:gap-10 lg:gap-12 max-w-[1000px] mx-auto">
              {/* Columna 1: Fernando y Victor */}
              <div className="flex flex-col items-center gap-8 sm:gap-10 lg:gap-12">
                {/* Fernando */}
                <div className="flex flex-col items-center">
                  <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] lg:w-[160px] lg:h-[160px] rounded-full overflow-hidden mb-4 sm:mb-5 lg:mb-6">
                    <img 
                      src={equipo[0].imagen} 
                      alt={equipo[0].nombre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/images/placeholder-avatar.png';
                      }}
                    />
                  </div>
                  <h3 className="text-[14px] sm:text-[16px] lg:text-[18px] font-montserrat font-semibold leading-[18px] sm:leading-[20px] lg:leading-[22px] text-global-2 mb-2 sm:mb-3 text-center">
                    {equipo[0].nombre}
                  </h3>
                  <a 
                    href={`mailto:${equipo[0].email}`}
                    className="text-[13px] sm:text-[14px] lg:text-[15px] font-montserrat font-normal leading-[18px] sm:leading-[20px] lg:leading-[22px] text-global-1 hover:underline text-center"
                  >
                    {equipo[0].email}
                  </a>
                </div>
                {/* Victor */}
                <div className="flex flex-col items-center">
                  <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] lg:w-[160px] lg:h-[160px] rounded-full overflow-hidden mb-4 sm:mb-5 lg:mb-6">
                    <img 
                      src={equipo[3].imagen} 
                      alt={equipo[3].nombre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/images/placeholder-avatar.png';
                      }}
                    />
                  </div>
                  <h3 className="text-[14px] sm:text-[16px] lg:text-[18px] font-montserrat font-semibold leading-[18px] sm:leading-[20px] lg:leading-[22px] text-global-2 mb-2 sm:mb-3 text-center">
                    {equipo[3].nombre}
                  </h3>
                  <a 
                    href={`mailto:${equipo[3].email}`}
                    className="text-[13px] sm:text-[14px] lg:text-[15px] font-montserrat font-normal leading-[18px] sm:leading-[20px] lg:leading-[22px] text-global-1 hover:underline text-center"
                  >
                    {equipo[3].email}
                  </a>
                </div>
              </div>

              {/* Columna 2: Carlos (solo) */}
              <div className="flex flex-col items-center">
                <div className="flex flex-col items-center">
                  <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] lg:w-[160px] lg:h-[160px] rounded-full overflow-hidden mb-4 sm:mb-5 lg:mb-6">
                    <img 
                      src={equipo[1].imagen} 
                      alt={equipo[1].nombre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/images/placeholder-avatar.png';
                      }}
                    />
                  </div>
                  <h3 className="text-[14px] sm:text-[16px] lg:text-[18px] font-montserrat font-semibold leading-[18px] sm:leading-[20px] lg:leading-[22px] text-global-2 mb-2 sm:mb-3 text-center">
                    {equipo[1].nombre}
                  </h3>
                  <a 
                    href={`mailto:${equipo[1].email}`}
                    className="text-[13px] sm:text-[14px] lg:text-[15px] font-montserrat font-normal leading-[18px] sm:leading-[20px] lg:leading-[22px] text-global-1 hover:underline text-center"
                  >
                    {equipo[1].email}
                  </a>
                </div>
              </div>

              {/* Columna 3: Pablo y Franz */}
              <div className="flex flex-col items-center gap-8 sm:gap-10 lg:gap-12">
                {/* Pablo */}
                <div className="flex flex-col items-center">
                  <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] lg:w-[160px] lg:h-[160px] rounded-full overflow-hidden mb-4 sm:mb-5 lg:mb-6">
                    <img 
                      src={equipo[2].imagen} 
                      alt={equipo[2].nombre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/images/placeholder-avatar.png';
                      }}
                    />
                  </div>
                  <h3 className="text-[14px] sm:text-[16px] lg:text-[18px] font-montserrat font-semibold leading-[18px] sm:leading-[20px] lg:leading-[22px] text-global-2 mb-2 sm:mb-3 text-center">
                    {equipo[2].nombre}
                  </h3>
                  <a 
                    href={`mailto:${equipo[2].email}`}
                    className="text-[13px] sm:text-[14px] lg:text-[15px] font-montserrat font-normal leading-[18px] sm:leading-[20px] lg:leading-[22px] text-global-1 hover:underline text-center"
                  >
                    {equipo[2].email}
                  </a>
                </div>
                {/* Franz */}
                <div className="flex flex-col items-center">
                  <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] lg:w-[160px] lg:h-[160px] rounded-full overflow-hidden mb-4 sm:mb-5 lg:mb-6">
                    <img 
                      src={equipo[4].imagen} 
                      alt={equipo[4].nombre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/images/placeholder-avatar.png';
                      }}
                    />
                  </div>
                  <h3 className="text-[14px] sm:text-[16px] lg:text-[18px] font-montserrat font-semibold leading-[18px] sm:leading-[20px] lg:leading-[22px] text-global-2 mb-2 sm:mb-3 text-center">
                    {equipo[4].nombre}
                  </h3>
                  <a 
                    href={`mailto:${equipo[4].email}`}
                    className="text-[13px] sm:text-[14px] lg:text-[15px] font-montserrat font-normal leading-[18px] sm:leading-[20px] lg:leading-[22px] text-global-1 hover:underline text-center"
                  >
                    {equipo[4].email}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Divider Line */}
          <div className="w-full mt-12 sm:mt-16 lg:mt-[64px]">
            <div className="w-full h-[1px] sm:h-[2px] bg-global-1"></div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <section className="w-full">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-[182px] py-4 sm:py-6 lg:py-[26px]">
          <div className="flex flex-col lg:flex-row justify-start items-start lg:items-center gap-8 sm:gap-10 lg:gap-12">
            {/* Contact Info */}
            <div className="flex flex-col gap-3 sm:gap-4 lg:gap-[16px] w-full lg:w-[36%]">
              <h3 className="text-[20px] sm:text-[22px] lg:text-[24px] font-montserrat font-semibold leading-[25px] sm:leading-[28px] lg:leading-[30px] text-center lg:text-left text-global-2">
                CONTACTO
              </h3>
              <div className="text-[13px] sm:text-[14px] lg:text-[15px] font-montserrat font-semibold leading-[25px] sm:leading-[28px] lg:leading-[30px] text-left text-global-3">
                <p>Ecuador</p>
                <p>Dirección: Marcelino Champagnat s/n</p>
                <p>Teléfono: +593 3701444</p>
              </div>
            </div>

            {/* UTPL Logo */}
            <div className="w-full lg:w-[42%] flex justify-center">
              <img 
                src="/images/img_image_4.png" 
                alt="UTPL Logo"
                className="w-full max-w-[300px] sm:max-w-[350px] lg:max-w-[448px] h-auto"
              />
            </div>

            {/* Social Media */}
            <div className="flex flex-col gap-3 sm:gap-4 lg:gap-[16px] items-center lg:items-start w-full lg:w-[20%] mt-4 sm:mt-5 lg:mt-[22px]">
              <h3 className="text-[20px] sm:text-[22px] lg:text-[24px] font-montserrat font-semibold leading-[25px] sm:leading-[28px] lg:leading-[30px] text-center text-global-2">
                REDES SOCIALES
              </h3>
              <div className="flex justify-center lg:justify-start items-center gap-3 sm:gap-4 lg:gap-[16px] w-full">
                <a href="#facebook" className="hover:opacity-75 transition-opacity">
                  <img 
                    src="/images/img_ic_baseline_facebook.svg" 
                    alt="Facebook"
                    className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] lg:w-[24px] lg:h-[24px]"
                  />
                </a>
                <a href="#twitter" className="hover:opacity-75 transition-opacity">
                  <img 
                    src="/images/img_fa6_brands_x_twitter.svg" 
                    alt="Twitter"
                    className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] lg:w-[24px] lg:h-[24px]"
                  />
                </a>
                <a href="#instagram" className="hover:opacity-75 transition-opacity">
                  <img 
                    src="/images/img_mdi_instagram.svg" 
                    alt="Instagram"
                    className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] lg:w-[24px] lg:h-[24px]"
                  />
                </a>
                <a href="#youtube" className="hover:opacity-75 transition-opacity">
                  <img 
                    src="/images/img_mdi_youtube.svg" 
                    alt="YouTube"
                    className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] lg:w-[24px] lg:h-[24px]"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Equipo;

