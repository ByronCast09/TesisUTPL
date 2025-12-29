import React, { useEffect, useState } from 'react';
import { getRemoteIndex, getProxyImageUrl, getRemoteWmsByQuery } from '@/services/radarService';

const Datos = () => {
  const [radarId, setRadarId] = useState('LGUAXX');
  const [index, setIndex] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wmsInfo, setWmsInfo] = useState(null);

  const loadIndex = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRemoteIndex(radarId);
      setIndex(res.index || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Error al cargar índice remoto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radarId]);

  const handlePublishWms = async (date, fileName) => {
    setWmsInfo(null);
    try {
      const res = await getRemoteWmsByQuery(radarId, date, fileName);
      setWmsInfo(res);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Error al obtener WMS');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="w-full px-6 py-4 bg-white shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600">Datos Históricos</h1>
          <nav className="space-x-6">
            <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">Inicio</a>
            <a href="/visor" className="text-gray-600 hover:text-blue-600 font-medium">Visor</a>
            <a href="/datos" className="text-gray-600 hover:text-blue-600 font-medium">Datos</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <label className="text-sm font-medium text-gray-700">Radar:</label>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md bg-white"
            value={radarId}
            onChange={(e) => setRadarId(e.target.value)}
          >
            <option value="LGUAXX">LGUAXX</option>
            <option value="LOXX">LOXX</option>
          </select>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={loadIndex}
            disabled={loading}
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded mb-6">
            {error}
          </div>
        )}

        {wmsInfo && (
          <div className="p-3 bg-green-100 text-green-800 rounded mb-6">
            <p className="text-sm">Se generó WMS: capa <strong>{wmsInfo.layerName}</strong></p>
            <p className="text-xs">Base: {wmsInfo.baseUrl}</p>
          </div>
        )}

        <div className="space-y-8">
          {index.map((group) => (
            <section key={group.date}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">{group.date}</h2>
                <span className="text-sm text-gray-500">PNG: {group.png?.length || 0} · NetCDF: {group.nc?.length || 0}</span>
              </div>

              {/* Botones para NetCDF */}
              {group.nc && group.nc.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {group.nc.map((f) => (
                    <button
                      key={f.name}
                      className="px-3 py-2 text-xs bg-amber-500 text-white rounded hover:bg-amber-600"
                      onClick={() => handlePublishWms(group.date, f.name)}
                      title="Publicar y ver en WMS"
                    >
                      WMS: {f.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Grid de imágenes PNG via proxy */}
              {group.png && group.png.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.png.map((f) => (
                    <div key={f.name} className="bg-white rounded shadow p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700 truncate" title={f.name}>{f.name}</h3>
                        <a
                          className="text-xs text-blue-600 hover:text-blue-800"
                          href={getProxyImageUrl(radarId, group.date, f.name)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir
                        </a>
                      </div>
                      <img
                        src={getProxyImageUrl(radarId, group.date, f.name)}
                        alt={f.name}
                        className="w-full h-48 object-contain bg-gray-50 border border-gray-200"
                        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'150\'><rect width=\'100%\' height=\'100%\' fill=\'#f3f4f6\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-size=\'14\' fill=\'#6b7280\'>No disponible</text></svg>'; }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay imágenes PNG para esta fecha.</p>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Datos;