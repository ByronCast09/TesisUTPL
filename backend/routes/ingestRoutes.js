const express = require('express');
const multer = require('multer');
const ingestController = require('../controllers/ingestController');

const router = express.Router();

const MAX_UPLOAD_MB = Number(process.env.INGEST_MAX_FILE_MB || 100);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024,
  },
});

router.post('/processed', upload.single('file'), ingestController.receiveProcessed);

module.exports = router;


