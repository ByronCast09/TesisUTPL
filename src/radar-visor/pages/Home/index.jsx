import React from 'react';
import Header from '../../components/common/Header';
import Button from '../../components/ui/Button';

const Home = () => {
  const weatherData = [
    {
      location: "UTPL",
      conditions: "Conditions as of: 13:26 Wednesday, Aug 13, 2025",
      temperature: "19,7°C",
      high: "19,7°C",
      highTime: "at 13:26",
      low: "11,9°C",
      lowTime: "at 06:37",
      wind: {
        speed: "2,2 m/s SSW",
        gust: "High gust 8,0 m/s at 11:42"
      },
      humidity: {
        value: "67,0%",
        feelsLike: "Feels like 19,7°C"
      },
      rain: {
        current: "0,0 mm",
        seasonal: "Seasonal Total 661,0 mm"
      },
      barometer: {
        pressure: "1.012,1 hPa",
        trend: "Falling Rapidly"
      }
    },
    {
      location: "UTPL, Malacatos",
      conditions: "Conditions as of: 13:26 Wednesday, Aug 13, 2025",
      temperature: "25,7°C",
      high: "25,9°C",
      highTime: "at 10:38",
      low: "12,3°C",
      lowTime: "at 06:45",
      wind: {
        speed: "0,0 m/s",
        gust: ""
      },
      humidity: {
        value: "48,0%",
        feelsLike: "Feels like 25,6°C"
      },
      rain: {
        current: "0,0 mm",
        seasonal: "Seasonal Total 769,1 mm"
      },
      barometer: {
        pressure: "1.011,1 hPa",
        trend: "Falling Rapidly"
      }
    },
    {
      location: "UTPL Vilcabamba",
      conditions: "Conditions as of: 13:15 Wednesday, Aug 13, 2025",
      temperature: "11,4°C",
      high: "11,4°C",
      highTime: "at 13:14",
      low: "8,4°C",
      lowTime: "at 04:08",
      wind: {
        speed: "6,3 m/s NE",
        gust: "High gust 17,0 m/s at 00:42"
      },
      humidity: {
        value: "100,0%",
        feelsLike: "Feels like 8,3°C"
      },
      rain: {
        current: "0,3 mm",
        seasonal: "Seasonal Total 1.119,6 mm"
      },
      barometer: {
        pressure: "1.018,1 hPa",
        trend: "Steady"
      }
    }
  ];

  return (
    <div className="w-full bg-global-2">
      {/* Hero Section with Background */}
      <section 
        className="w-full bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "url('/images/img_geminigeneratedimage8xcgau8xcgau8xcg_1.png')"
        }}
      >
        <div className="w-full max-w-[1440px] mx-auto">
          {/* Header */}
          <Header />
          
          {/* Hero Content */}
          <div className="px-4 sm:px-6 lg:px-[66px] pb-8 sm:pb-12 lg:pb-16">
            <div className="flex flex-col lg:flex-row justify-center items-start w-full">
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
      {/* What is it Section */}
      <section className="w-full">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-[96px] py-8 sm:py-12 lg:py-[72px]">
          <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-montserrat font-semibold leading-[25px] sm:leading-[28px] lg:leading-[30px] text-global-2 mb-6 sm:mb-8 lg:mb-[30px]">
            ¿Qué es?
          </h2>
          <p className="text-[14px] sm:text-[15px] lg:text-[16px] font-montserrat font-normal leading-[20px] sm:leading-[22px] lg:leading-[24px] text-global-1 w-full lg:w-[96%] mb-8 sm:mb-10 lg:mb-[40px]">
            Desde la Universidad Técnica Particular de Loja reafirmamos nuestro compromiso con el desarrollo sostenible y la transformación territorial a través de la ciencia y la tecnología. Por ello, nos enorgullece presentar el primer Observatorio Climático Universitario del Ecuador, una iniciativa pionera orientada al fortalecimiento de la toma de decisiones informadas en todos los niveles de la sociedad. Este observatorio nace con la misión de brindar datos meteorológicos de alta calidad y cobertura, así como de sistematizar experiencias exitosas en la implementación de medidas de adaptación y resiliencia frente al cambio climático. Su propósito es claro: reducir la vulnerabilidad social, económica y ambiental en los territorios más expuestos.
          </p>

          {/* Three Column Info Section */}
          <div className="ml-0 lg:ml-[20px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
              {/* Data Collection */}
              <div className="flex flex-col gap-6 sm:gap-7 lg:gap-[30px]">
                <h3 className="text-[20px] sm:text-[22px] lg:text-[24px] font-montserrat font-semibold leading-[25px] sm:leading-[28px] lg:leading-[30px] text-global-2">
                  Datos que recolecta
                </h3>
                <div className="text-[14px] sm:text-[15px] lg:text-[16px] font-montserrat font-normal leading-[20px] sm:leading-[22px] lg:leading-[24px] text-global-1 w-full lg:w-[64%]">
                  <p>- Precipitación</p>
                  <p>- Humedad relativa</p>
                  <p>- Temperatura</p>
                  <p>- Viento</p>
                  <p>- Radiación Solar</p>
                  <p>- Presión Atmosférica</p>
                </div>
              </div>

              {/* Geographic Reach */}
              <div className="flex flex-col gap-6 sm:gap-7 lg:gap-[32px]">
                <h3 className="text-[20px] sm:text-[22px] lg:text-[24px] font-montserrat font-semibold leading-[25px] sm:leading-[28px] lg:leading-[30px] text-global-2">
                  Alcance Geográfico
                </h3>
                <p className="text-[14px] sm:text-[15px] lg:text-[16px] font-montserrat font-normal leading-[18px] sm:leading-[19px] lg:leading-[20px] text-global-1 mb-4 sm:mb-5 lg:mb-[22px]">
                  Provincias de Loja, El Oro y Zamora
                </p>
              </div>

              {/* TIC Tools */}
              <div className="flex flex-col gap-6 sm:gap-7 lg:gap-[30px] w-full lg:w-[24%]">
                <h3 className="text-[20px] sm:text-[22px] lg:text-[24px] font-montserrat font-semibold leading-[25px] sm:leading-[28px] lg:leading-[30px] text-global-2">
                  Herramientas TIC
                </h3>
                <p className="text-[14px] sm:text-[15px] lg:text-[16px] font-montserrat font-normal leading-[20px] sm:leading-[22px] lg:leading-[24px] text-global-1 w-full">
                  12 estaciones meteorológicas de UTPL, 40 estaciones del INAMHI y 30 del Gobierno Provincial de Loja; radar meteorológico GUAXX y LOXX, sensores y visor en plataforma web.
                </p>
              </div>
            </div>
          </div>

          {/* Weather Cards Section */}
          <div className="mt-12 sm:mt-16 lg:mt-[64px] mx-0 lg:mx-[18px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {weatherData?.map((station, index) => (
                <div key={index} className="w-full">
                  <img 
                    src={`/images/img_image_${index + 1}.png`} 
                    alt={`Weather data for ${station?.location}`}
                    className="w-full h-auto object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* Divider Line */}
      <div className="w-full">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-[76px] py-8 sm:py-12 lg:py-[64px]">
          <div className="w-full h-[1px] sm:h-[2px] bg-global-1"></div>
        </div>
      </div>
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

export default Home;