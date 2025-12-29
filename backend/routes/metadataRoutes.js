const express = require('express');
const metadataController = require('../controllers/metadataController');

const router = express.Router();

router.get('/radars', metadataController.listRadars);
router.get('/radars/:radarId/processed', metadataController.listProcessedForRadar);
router.get('/radars/:radarId/processed/latest', metadataController.getLatestForRadar);
router.get('/radars/:radarId/dates', metadataController.getAvailableDates);

router.get('/processed', metadataController.listProcessed);
router.get('/processed/:id', metadataController.getProcessedById);
router.get('/processed/:id/image', metadataController.streamImageById);

router.get('/summary', metadataController.getSummary);

module.exports = router;


