const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// Health check endpoint
router.get('/health', healthController.getHealth);

// Estadísticas del sistema
router.get('/stats', healthController.getStats);

// Limpiar caché manualmente
router.post('/cache/clear', healthController.clearCache);

module.exports = router;
