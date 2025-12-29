import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import page components
import Home from './pages/Home';
import Visor from './pages/Visor';
import VisorNuevo from './pages/VisorNuevo';
import Equipo from './pages/Equipo';
import DatosHistoricos from './pages/DatosHistoricos';
import AnalisisGraficos from './pages/AnalisisGraficos';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/visor" element={<VisorNuevo />} />
        <Route path="/visor-nuevo" element={<VisorNuevo />} />
        <Route path="/visor-antiguo" element={<Visor />} />
        <Route path="/equipo" element={<Equipo />} />
        <Route path="/datos-historicos" element={<DatosHistoricos />} />
        <Route path="/analisis-graficos" element={<AnalisisGraficos />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;