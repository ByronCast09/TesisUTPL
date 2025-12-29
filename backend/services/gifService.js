const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const pipelineConfig = require('../config/pipelineConfig');
const pipelineStorage = require('./pipelineStorageService');
const storageService = require('./pipelineStorageService');

const pythonBin = pipelineConfig.processing?.pythonCmd || 'python';
const GIF_FRAME_MS = Number(process.env.RADAR_PIPELINE_GIF_FRAME_MS || 300);

function getDateFromEntry(entry) {
  return entry?.metadata?.date || (entry?.timestamp || '').slice(0, 10);
}

function getGifOutputPath(radarId, date) {
  const { processedStorageDir } = pipelineConfig.paths;
  const sanitizedDate = date.replace(/[^0-9-]/g, '');
  const fileName = `${radarId}_${sanitizedDate.replace(/-/g, '')}.gif`;
  return path.join(processedStorageDir, radarId, sanitizedDate, fileName);
}

async function createGifWithPython(images, outputPath) {
  const manifestPath = path.join(
    os.tmpdir(),
    `gif_manifest_${Date.now()}_${Math.random().toString(16).slice(2)}.json`
  );
  const manifestData = {
    images,
    duration: GIF_FRAME_MS,
    loop: 0
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData), 'utf-8');

  await new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'create_gif_from_pngs.py');
    const args = [scriptPath, '--manifest', manifestPath, '--output', outputPath];

    const proc = spawn(pythonBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('close', (code) => {
      fs.unlink(manifestPath, () => {});
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `create_gif_from_pngs.py exited with code ${code}`));
      }
    });
  });
}

async function ensureGifForDate(radarId, date, providedEntries = null) {
  const entries = providedEntries || storageService.getTimeline(radarId, { limit: undefined, date });
  if (!entries || entries.length < 2) {
    return null;
  }

  const images = entries
    .map((entry) => entry?.local?.png)
    .filter((pngPath) => pngPath && fs.existsSync(pngPath));

  if (images.length < 2) {
    return null;
  }

  const outputPath = getGifOutputPath(radarId, date);
  const outputDir = path.dirname(outputPath);
  pipelineStorage.ensureDir(outputDir);

  const latestFrameTime = Math.max(
    ...images.map((imgPath) => fs.statSync(imgPath).mtimeMs)
  );

  let needGenerate = true;
  if (fs.existsSync(outputPath)) {
    const gifMtime = fs.statSync(outputPath).mtimeMs;
    if (gifMtime >= latestFrameTime) {
      needGenerate = false;
    }
  }

  if (needGenerate) {
    await createGifWithPython(images, outputPath);
  }

  const firstEntry = entries[0] || {};
  const bounds = firstEntry?.metadata?.bounds || null;

  return {
    gifPath: outputPath,
    publicGif: pipelineStorage.buildPublicPath(outputPath),
    bounds
  };
}

module.exports = {
  ensureGifForDate
};


