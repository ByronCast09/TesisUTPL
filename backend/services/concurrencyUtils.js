"use strict";

async function runWithConcurrency(items, worker, concurrency = 1) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const size = items.length;
  const limit = Math.max(1, Math.floor(Number(concurrency) || 1));
  const results = new Array(size);

  let cursor = 0;
  let error = null;

  const getNextIndex = () => {
    if (error) {
      return null;
    }
    if (cursor >= size) {
      return null;
    }
    const index = cursor;
    cursor += 1;
    return index;
  };

  const workerLoop = async () => {
    while (true) {
      const index = getNextIndex();
      if (index === null) {
        return;
      }

      try {
        results[index] = await worker(items[index], index);
      } catch (err) {
        error = err;
        return;
      }
    }
  };

  const runners = Array.from(
    { length: Math.min(limit, size) },
    () => workerLoop()
  );

  await Promise.all(runners);

  if (error) {
    throw error;
  }

  return results;
}

module.exports = {
  runWithConcurrency
};


