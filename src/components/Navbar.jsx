import { Search, User } from 'lucide-react';
import { Button } from '../ui/button';
import "../styles/layout.css"; // Importa tu CSS personalizado
import Visor from '../pages/Visor';
import { Link } from "react-router-dom"; // Importa Link

const Navbar = () => {
  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo">
          <div className="navbar-logo-circle">
            <span>U</span>
          </div>
          <span className="navbar-logo-text">UTPL</span>
        </div>

        {/* Navigation */}
        <nav className="navbar-nav">
          <Link to="/" className="navbar-link">
            Inicio
          </Link>
          <Link to="/visor" className="navbar-link">
            Visor
          </Link>
          <a href="#contacto" className="navbar-link">
            Contacto
          </a>
          <a href="#equipo" className="navbar-link">
            Equipo
          </a>
        </nav>

        {/* Actions */}
        <div className="navbar-actions">
          <Button variant="ghost" size="sm">
            <User style={{ width: 20, height: 20 }} />
          </Button>
          <Button variant="ghost" size="sm">
            <Search style={{ width: 20, height: 20 }} />
          </Button>
          <Button variant="outline" size="sm">
            Regístrate
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;