import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import "../styles/layout.css"; // Importa tu CSS personalizado

const Footer = () => {
  return (
    <footer className="footer">
      {/* Contact Information */}
      <div className="footer-contact">
        <strong>CONTACTO</strong>
        <div>
          <p>Ecuador</p>
          <p>Dirección: Marcelino Champagnat s/n</p>
          <p>Teléfono: +593 3701444</p>
        </div>
      </div>

      {/* UTPL Logo */}
      <div className="footer-logo">
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{
            width: "64px",
            height: "64px",
            background: "#1e40af",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "1rem"
          }}>
            <span style={{ color: "#fff", fontWeight: "bold", fontSize: "2rem" }}>U</span>
          </div>
          <div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#1e40af" }}>UTPL</div>
            <div style={{ fontSize: "1rem", color: "#374151" }}>La Universidad Católica de Loja</div>
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="footer-social">
        <strong>REDES SOCIALES</strong>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <a href="#" aria-label="Facebook">
            <Facebook />
          </a>
          <a href="#" aria-label="Twitter">
            <Twitter />
          </a>
          <a href="#" aria-label="Instagram">
            <Instagram />
          </a>
          <a href="#" aria-label="YouTube">
            <Youtube />
          </a>
        </div>
      </div>

      {/* Copyright */}
      <div style={{ width: "100%", textAlign: "center", marginTop: "2rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
        <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
          © 2025 Universidad Técnica Particular de Loja (UTPL). Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;