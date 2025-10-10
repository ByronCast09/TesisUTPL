import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import page components
import Home from './pages/Home';
import Visor from './pages/Visor';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/visor" element={<Visor />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;