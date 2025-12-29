const fs = require('fs');
const path = require('path');
const pipelineConfig = require('../config/pipelineConfig');

const { stateStoragePath, indexStoragePath } = pipelineConfig.paths;

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSON(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`pipelineStateService: error leyendo ${filePath}: ${err.message}`);
    return fallback;
  }
}

function writeJSON(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getState() {
  return readJSON(stateStoragePath, { radars: {} });
}

function setState(newState) {
  writeJSON(stateStoragePath, newState);
}

function updateState(updater) {
  const current = getState();
  const updated = updater({ ...current }) || current;
  setState(updated);
  return updated;
}

function getIndex() {
  return readJSON(indexStoragePath, { updatedAt: null, radars: {} });
}

function setIndex(indexData) {
  writeJSON(indexStoragePath, indexData);
}

function updateIndex(radarsUpdater) {
  const current = getIndex();
  const updatedIndex = radarsUpdater({ ...current }) || current;
  setIndex(updatedIndex);
  return updatedIndex;
}

module.exports = {
  getState,
  setState,
  updateState,
  getIndex,
  setIndex,
  updateIndex
};

