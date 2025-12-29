/**
 * Script de inicialización para GeoServer en Apache Tomcat
 * Este script configura el espacio de trabajo y almacenes de datos necesarios para los radares
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Configuración de GeoServer
const GEOSERVER_URL = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver/rest';
const GEOSERVER_USERNAME = process.env.GEOSERVER_USERNAME || 'admin';
const GEOSERVER_PASSWORD = process.env.GEOSERVER_PASSWORD || 'geoserver';
const GEOSERVER_WORKSPACE = process.env.GEOSERVER_WORKSPACE || 'radar';

// Configuración básica para las solicitudes a GeoServer
const geoserverAuth = {
  username: GEOSERVER_USERNAME,
  password: GEOSERVER_PASSWORD
};

/**
 * Crea un espacio de trabajo en GeoServer si no existe
 */
async function createWorkspace() {
  try {
    console.log(`Verificando si existe el espacio de trabajo ${GEOSERVER_WORKSPACE}...`);
    
    // Verificar si el espacio de trabajo ya existe
    try {
      const checkResponse = await axios.get(
        `${GEOSERVER_URL}/workspaces/${GEOSERVER_WORKSPACE}`,
        { auth: geoserverAuth }
      );
      
      if (checkResponse.status === 200) {
        console.log(`El espacio de trabajo ${GEOSERVER_WORKSPACE} ya existe.`);
        return;
      }
    } catch (error) {
      // Si obtenemos un 404, el espacio de trabajo no existe
      if (error.response && error.response.status !== 404) {
        throw error;
      }
    }
    
    // Crear el espacio de trabajo
    console.log(`Creando espacio de trabajo ${GEOSERVER_WORKSPACE}...`);
    const response = await axios.post(
      `${GEOSERVER_URL}/workspaces`,
      {
        workspace: {
          name: GEOSERVER_WORKSPACE
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        auth: geoserverAuth
      }
    );
    
    if (response.status === 201) {
      console.log(`Espacio de trabajo ${GEOSERVER_WORKSPACE} creado exitosamente.`);
    } else {
      console.log(`Respuesta inesperada al crear espacio de trabajo: ${response.status}`);
    }
  } catch (error) {
    console.error('Error al crear espacio de trabajo:', error.message);
    if (error.response) {
      console.error('Detalles:', error.response.data);
    }
    throw error;
  }
}

/**
 * Configura un almacén de datos NetCDF para un radar específico
 * @param {string} radarId - ID del radar (LGUAXX o LOXX)
 */
async function setupNetCDFDataStore(radarId) {
  try {
    console.log(`Configurando almacén de datos NetCDF para ${radarId}...`);
    
    // Verificar si el almacén ya existe
    try {
      const checkResponse = await axios.get(
        `${GEOSERVER_URL}/workspaces/${GEOSERVER_WORKSPACE}/coveragestores/${radarId}`,
        { auth: geoserverAuth }
      );
      
      if (checkResponse.status === 200) {
        console.log(`El almacén de datos ${radarId} ya existe.`);
        return;
      }
    } catch (error) {
      // Si obtenemos un 404, el almacén no existe
      if (error.response && error.response.status !== 404) {
        throw error;
      }
    }
    
    // Crear el almacén de datos
    console.log(`Creando almacén de datos ${radarId}...`);
    const response = await axios.post(
      `${GEOSERVER_URL}/workspaces/${GEOSERVER_WORKSPACE}/coveragestores`,
      {
        coverageStore: {
          name: radarId,
          type: 'NetCDF',
          enabled: true,
          workspace: {
            name: GEOSERVER_WORKSPACE
          },
          url: `file:data/radar/${radarId}.nc`
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        auth: geoserverAuth
      }
    );
    
    if (response.status === 201) {
      console.log(`Almacén de datos ${radarId} creado exitosamente.`);
    } else {
      console.log(`Respuesta inesperada al crear almacén de datos: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error al configurar almacén de datos para ${radarId}:`, error.message);
    if (error.response) {
      console.error('Detalles:', error.response.data);
    }
    throw error;
  }
}

/**
 * Configura los estilos para las capas de radar
 */
async function setupRadarStyles() {
  try {
    console.log('Configurando estilos para las capas de radar...');
    
    // Verificar si el estilo ya existe
    const styleName = 'radar_reflectivity';
    try {
      const checkResponse = await axios.get(
        `${GEOSERVER_URL}/styles/${styleName}`,
        { auth: geoserverAuth }
      );
      
      if (checkResponse.status === 200) {
        console.log(`El estilo ${styleName} ya existe.`);
        return;
      }
    } catch (error) {
      // Si obtenemos un 404, el estilo no existe
      if (error.response && error.response.status !== 404) {
        throw error;
      }
    }
    
    // Crear el estilo
    console.log(`Creando estilo ${styleName}...`);
    
    // Primero creamos la entrada del estilo
    const createResponse = await axios.post(
      `${GEOSERVER_URL}/styles`,
      {
        style: {
          name: styleName,
          filename: `${styleName}.sld`
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        auth: geoserverAuth
      }
    );
    
    if (createResponse.status !== 201) {
      throw new Error(`Error al crear estilo: ${createResponse.status}`);
    }
    
    // Luego subimos el contenido SLD
    const sldContent = `<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" 
    xmlns="http://www.opengis.net/sld" 
    xmlns:ogc="http://www.opengis.net/ogc" 
    xmlns:xlink="http://www.w3.org/1999/xlink" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
    xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>radar_reflectivity</Name>
    <UserStyle>
      <Name>radar_reflectivity</Name>
      <Title>Estilo para reflectividad de radar</Title>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <ColorMap type="ramp">
              <ColorMapEntry color="#FFFFFF" quantity="0" opacity="0"/>
              <ColorMapEntry color="#9CFAFF" quantity="5" opacity="0.5"/>
              <ColorMapEntry color="#00ECEC" quantity="10" opacity="0.6"/>
              <ColorMapEntry color="#009BFF" quantity="15" opacity="0.7"/>
              <ColorMapEntry color="#0000FF" quantity="20" opacity="0.8"/>
              <ColorMapEntry color="#00FF00" quantity="25" opacity="0.8"/>
              <ColorMapEntry color="#FFFF00" quantity="30" opacity="0.8"/>
              <ColorMapEntry color="#FFC800" quantity="35" opacity="0.9"/>
              <ColorMapEntry color="#FF9600" quantity="40" opacity="0.9"/>
              <ColorMapEntry color="#FF0000" quantity="45" opacity="1.0"/>
              <ColorMapEntry color="#B40000" quantity="50" opacity="1.0"/>
              <ColorMapEntry color="#640000" quantity="55" opacity="1.0"/>
              <ColorMapEntry color="#FF00FF" quantity="60" opacity="1.0"/>
              <ColorMapEntry color="#9955FF" quantity="65" opacity="1.0"/>
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>`;
    
    const uploadResponse = await axios.put(
      `${GEOSERVER_URL}/styles/${styleName}`,
      sldContent,
      {
        headers: { 'Content-Type': 'application/vnd.ogc.sld+xml' },
        auth: geoserverAuth
      }
    );
    
    if (uploadResponse.status === 200) {
      console.log(`Estilo ${styleName} creado exitosamente.`);
    } else {
      console.log(`Respuesta inesperada al subir estilo: ${uploadResponse.status}`);
    }
  } catch (error) {
    console.error('Error al configurar estilos:', error.message);
    if (error.response) {
      console.error('Detalles:', error.response.data);
    }
    throw error;
  }
}

/**
 * Función principal que ejecuta la inicialización
 */
async function initializeGeoServer() {
  try {
    console.log('Iniciando configuración de GeoServer...');
    
    // Crear espacio de trabajo
    await createWorkspace();
    
    // Configurar almacenes de datos para cada radar
    await setupNetCDFDataStore('LGUAXX');
    await setupNetCDFDataStore('LOXX');
    
    // Configurar estilos
    await setupRadarStyles();
    
    console.log('Configuración de GeoServer completada exitosamente.');
  } catch (error) {
    console.error('Error durante la inicialización de GeoServer:', error);
    process.exit(1);
  }
}

// Ejecutar la inicialización
initializeGeoServer();