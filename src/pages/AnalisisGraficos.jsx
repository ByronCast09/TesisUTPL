import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import VisorHeader from '../components/VisorHeader';
import VisorSidebar from '../components/VisorSidebar';
import {
    getAnalyticsMetrics,
    getTemporalEvolution,
    getProvinceData,
    getIntensityDistribution,
    getWeeklyTrend
} from '../services/analyticsService';

const AnalisisGraficos = () => {
    const [lguaxxToggle, setLguaxxToggle] = useState(true);
    const [loxxToggle, setLoxxToggle] = useState(true);
    const [period, setPeriod] = useState('Hoy'); // Hoy, Semana, Mes, Personalizado
    const [loading, setLoading] = useState(false);

    // Estados para selector personalizado
    const [customMonth, setCustomMonth] = useState(10); // Noviembre (mes 10)
    const [customYear, setCustomYear] = useState(2025); // Año 2025 por defecto

    // Estados para los datos
    const [metrics, setMetrics] = useState({
        totalPrecipitation: 0,
        maxIntensity: 0,
        registeredEvents: 0,
        activeAlerts: 0
    });

    const [temporalData, setTemporalData] = useState([]);
    const [provinceData, setProvinceData] = useState([]);
    const [intensityData, setIntensityData] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);

    useEffect(() => {
        loadData();
    }, [period, customMonth, customYear]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Convertir período del UI a formato API
            let apiPeriod = period === 'Hoy' ? 'today' : period === 'Semana' ? 'week' : period === 'Mes' ? 'month' : 'custom';

            const monthParam = period === 'Personalizado' ? customMonth : null;
            const yearParam = period === 'Personalizado' ? customYear : null;

            console.log('🔍 Analytics Load:', { period, apiPeriod, monthParam, yearParam });

            // Cargar todas las métricas en paralelo - TODOS reciben el período
            const [metricsRes, temporalRes, provinceRes, intensityRes, weeklyRes] = await Promise.all([
                getAnalyticsMetrics(apiPeriod, monthParam, yearParam),
                getTemporalEvolution(apiPeriod, monthParam, yearParam),
                getProvinceData(apiPeriod, monthParam, yearParam),
                getIntensityDistribution(apiPeriod, monthParam, yearParam),
                getWeeklyTrend(apiPeriod, monthParam, yearParam) // ⚠️ ANTES NO RECIBÍA EL PERÍODO
            ]);

            console.log('📊 API Responses:', {
                metrics: metricsRes?.success,
                temporal: temporalRes?.success,
                province: provinceRes?.success,
                intensity: intensityRes?.success,
                weekly: weeklyRes?.success
            });

            // Actualizar métricas
            if (metricsRes?.success) {
                setMetrics({
                    totalPrecipitation: metricsRes.totalPrecipitation || 0,
                    maxIntensity: metricsRes.maxIntensity || 0,
                    registeredEvents: metricsRes.registeredEvents || 0,
                    activeAlerts: metricsRes.activeAlerts || 0
                });
            }

            // Actualizar evolución temporal
            if (temporalRes?.success && temporalRes.data) {
                setTemporalData(temporalRes.data);
            }

            // Actualizar datos por provincia
            if (provinceRes?.success && provinceRes.data) {
                setProvinceData(provinceRes.data);
            }

            // Actualizar distribución de intensidad
            if (intensityRes?.success && intensityRes.data) {
                setIntensityData(intensityRes.data);
            }

            // Actualizar tendencia semanal
            if (weeklyRes?.success && weeklyRes.data) {
                setWeeklyData(weeklyRes.data);
            }

        } catch (error) {
            console.error('Error cargando datos de analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-100 flex relative overflow-hidden">
            <VisorSidebar />

            <div className="flex-1 flex flex-col w-full">
                <VisorHeader
                    lguaxxToggle={lguaxxToggle}
                    setLguaxxToggle={setLguaxxToggle}
                    loxxToggle={loxxToggle}
                    setLoxxToggle={setLoxxToggle}
                />

                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl ml-auto mr-6">
                        {/* Header */}
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-gray-800">Análisis de Datos Meteorológicos</h1>
                            <p className="text-sm text-gray-500 mt-1">Estadísticas y tendencias de precipitación</p>
                        </div>

                        {/* Filtros de Período */}
                        <div className="mb-6">
                            <div className="flex gap-3 mb-3">
                                {['Hoy', 'Semana', 'Mes', 'Personalizado'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${period === p
                                            ? 'bg-gray-800 text-white'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            {/* Selector de Mes/Año (solo visible cuando es Personalizado) */}
                            {period === 'Personalizado' && (
                                <div className="flex gap-3 items-center bg-white p-4 rounded-lg shadow-sm">
                                    <label className="text-sm font-medium text-gray-700">Seleccionar:</label>
                                    <select
                                        value={customMonth}
                                        onChange={(e) => setCustomMonth(parseInt(e.target.value))}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={0}>Enero</option>
                                        <option value={1}>Febrero</option>
                                        <option value={2}>Marzo</option>
                                        <option value={3}>Abril</option>
                                        <option value={4}>Mayo</option>
                                        <option value={5}>Junio</option>
                                        <option value={6}>Julio</option>
                                        <option value={7}>Agosto</option>
                                        <option value={8}>Septiembre</option>
                                        <option value={9}>Octubre</option>
                                        <option value={10}>Noviembre</option>
                                        <option value={11}>Diciembre</option>
                                    </select>
                                    <select
                                        value={customYear}
                                        onChange={(e) => setCustomYear(parseInt(e.target.value))}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={2023}>2023</option>
                                        <option value={2024}>2024</option>
                                        <option value={2025}>2025</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Métricas Principales */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm text-gray-500">Precipitación Total</p>
                                    <Activity className="w-5 h-5 text-blue-500" />
                                </div>
                                <p className="text-2xl font-bold text-gray-800">{metrics.totalPrecipitation} mm</p>
                            </div>

                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm text-gray-500">Intensidad Máx</p>
                                    <TrendingUp className="w-5 h-5 text-orange-500" />
                                </div>
                                <p className="text-2xl font-bold text-gray-800">{metrics.maxIntensity} mm/h</p>
                            </div>

                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm text-gray-500">Eventos Registrados</p>
                                    <Calendar className="w-5 h-5 text-green-500" />
                                </div>
                                <p className="text-2xl font-bold text-gray-800">{metrics.registeredEvents}</p>
                            </div>

                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm text-gray-500">Alertas Activas</p>
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <p className="text-2xl font-bold text-gray-800">{metrics.activeAlerts}</p>
                            </div>
                        </div>

                        {/* Gráficos Principales */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Evolución Temporal */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Evolución Temporal de Precipitación</h3>
                                <p className="text-xs text-gray-500 mb-4">Comparación entre radares GUAXX y LOXX</p>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={temporalData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis dataKey="time" stroke="#6B7280" style={{ fontSize: '12px' }} />
                                        <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} label={{ value: 'mm/h', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="GUAXX" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} />
                                        <Line type="monotone" dataKey="LOXX" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Precipitación por Provincia */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Precipitación por Provincia</h3>
                                <p className="text-xs text-gray-500 mb-4">Acumulados y alertas por región</p>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={provinceData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '12px' }} />
                                        <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} label={{ value: 'mm/h', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Gráficos Secundarios */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Distribución de Intensidad */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Distribución de Intensidad</h3>
                                <p className="text-xs text-gray-500 mb-4">Clasificación de eventos por intensidad</p>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={intensityData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {intensityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Tendencia Semanal */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Tendencia Semanal</h3>
                                <p className="text-xs text-gray-500 mb-4">Precipitación y eventos por día</p>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={weeklyData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis dataKey="day" stroke="#6B7280" style={{ fontSize: '12px' }} />
                                        <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="value" stroke="#3B82F6" fillOpacity={1} fill="url(#colorValue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AnalisisGraficos;
