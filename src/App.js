// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Importa tus páginas
import Home from "./pages/Home";
import Visor from "./pages/Visor";
import Datos from "./pages/Datos";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home/>} /> 
        <Route path="/visor" element={<Visor/>} />
        <Route path="/datos" element={<Datos/>} />
      </Routes>
    </Router>
  );
}

export default App;
