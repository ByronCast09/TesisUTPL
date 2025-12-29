const fs = require('fs');
const path = require('path');
let admin = null;
let bucket = null;

const pipelineConfig = require('../config/pipelineConfig');

function ensureFirebase() {
  if (!pipelineConfig.firebase.enabled) {
    return false;
  }
  if (bucket) {
    return true;
  }

  try {
    // Lazy load firebase-admin para evitar dependencia si no se usa
    // eslint-disable-next-line global-require
    admin = require('firebase-admin');
  } catch (error) {
    console.error('Firebase habilitado pero firebase-admin no está instalado:', error.message);
    return false;
  }

  let credential = null;

  if (pipelineConfig.firebase.credentialsBase64) {
    const jsonString = Buffer.from(pipelineConfig.firebase.credentialsBase64, 'base64').toString('utf-8');
    credential = admin.credential.cert(JSON.parse(jsonString));
  } else if (pipelineConfig.firebase.credentialsPath) {
    const resolved = path.resolve(pipelineConfig.firebase.credentialsPath);
    const content = fs.readFileSync(resolved, 'utf-8');
    credential = admin.credential.cert(JSON.parse(content));
  } else {
    console.error('Firebase habilitado pero no se proporcionó credencial (FIREBASE_SERVICE_ACCOUNT o FIREBASE_SERVICE_ACCOUNT_BASE64)');
    return false;
  }

  try {
    admin.initializeApp({
      credential,
      storageBucket: pipelineConfig.firebase.bucket,
      databaseURL: pipelineConfig.firebase.databaseURL
    });
    bucket = admin.storage().bucket();
    return true;
  } catch (error) {
    console.error('Error inicializando Firebase:', error.message);
    return false;
  }
}

async function uploadFile(localPath, destination, contentType) {
  if (!ensureFirebase()) {
    return null;
  }
  await bucket.upload(localPath, {
    destination,
    metadata: {
      contentType
    },
    resumable: false,
    validation: 'crc32c'
  });
  const file = bucket.file(destination);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 30 // 30 días
  });
  return { destination, url };
}

async function uploadProcessed(entry) {
  if (!ensureFirebase()) {
    return null;
  }

  const date = entry.metadata?.date || entry.metadata?.sourceDate || entry.timestamp?.slice(0, 10);
  const dateFolder = date || 'unknown-date';
  const prefix = pipelineConfig.firebase.storagePrefix || 'radar';
  const basePath = `${prefix}/${entry.radarId}/${dateFolder}`;

  const pngDest = `${basePath}/${path.basename(entry.local.png)}`;
  const jsonDest = `${basePath}/${path.basename(entry.local.json)}`;

  const uploads = [];
  uploads.push(uploadFile(entry.local.png, pngDest, 'image/png'));
  uploads.push(uploadFile(entry.local.json, jsonDest, 'application/json'));

  if (pipelineConfig.firebase.uploadOriginals && entry.source?.h5Path) {
    const originalDest = `${basePath}/${path.basename(entry.source.h5Path)}`;
    uploads.push(uploadFile(entry.source.h5Path, originalDest, 'application/octet-stream'));
  }

  const results = await Promise.all(uploads);

  const [pngUpload, jsonUpload, originalUpload] = results;

  return {
    png: pngUpload,
    json: jsonUpload,
    original: originalUpload
  };
}

module.exports = {
  uploadProcessed
};

