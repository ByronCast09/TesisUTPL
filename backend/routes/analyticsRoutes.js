const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Métricas agregadas
router.get('/metrics', analyticsController.getMetrics);

// Evolución temporal
router.get('/temporal', analyticsController.getTemporalEvolution);

// Datos por provincia
router.get('/provinces', analyticsController.getProvinceData);

// Distribución de intensidad
router.get('/intensity', analyticsController.getIntensityDistribution);

// Tendencia semanal
router.get('/weekly', analyticsController.getWeeklyTrend);

module.exports = router;
