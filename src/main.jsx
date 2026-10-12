import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './styles/tailwind.css';
import { installMockApi } from './demo/mockApi';

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

if (isDemo) {
  installMockApi();
}

const DemoBadge = () => (
  <div
    style={{
      position: 'fixed',
      bottom: 12,
      left: 12,
      zIndex: 10000,
      padding: '6px 12px',
      borderRadius: 9999,
      background: 'rgba(17, 24, 39, 0.85)',
      color: '#fff',
      font: '500 12px system-ui, sans-serif',
      pointerEvents: 'none',
    }}
  >
    Demo · datos de muestra del radar LGUAXX
  </div>
);

ReactDOM?.createRoot(document.getElementById('root'))?.render(
  <React.StrictMode>
    <App />
    {isDemo && <DemoBadge />}
  </React.StrictMode>
);
