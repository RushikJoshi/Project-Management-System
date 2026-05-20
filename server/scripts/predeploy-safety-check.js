import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { getStorageReadiness, storageStatus } from '../src/services/storage.service.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

async function main() {
  await connectDB();

  const dbReady = mongoose.connection.readyState === 1;
  if (dbReady) pass('MongoDB connection is healthy.');
  else fail('MongoDB is not connected.');

  const storage = await getStorageReadiness();
  if (storage.ok) pass(`Storage readiness is healthy (${storage.mode}).`);
  else fail(`Storage readiness failed: ${storage.message || storage.mode}`);

  const uploadsDir = storageStatus().uploadsDir;
  const stats = fs.statfsSync(uploadsDir);
  const freeMb = Math.round((stats.bavail * stats.bsize) / (1024 * 1024));
  if (freeMb >= Number(process.env.MIN_DEPLOY_FREE_DISK_MB || 1024)) {
    pass(`Free disk space is acceptable (${freeMb}MB available).`);
  } else {
    fail(`Free disk space is too low (${freeMb}MB available).`);
  }

  const rollbackPath = process.env.ROLLBACK_PACKAGE_PATH;
  if (!rollbackPath) {
    console.warn('WARN: ROLLBACK_PACKAGE_PATH is not set. Rollback artifact presence was not checked.');
  } else if (fs.existsSync(path.resolve(rollbackPath))) {
    pass('Rollback package exists.');
  } else {
    fail(`Rollback package is missing: ${rollbackPath}`);
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
