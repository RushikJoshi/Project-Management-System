import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import Company from '../src/models/Company.js';
import connectDB from '../src/config/db.js';
import { getTenantModels } from '../src/config/tenantDb.js';
import { checkObjectExists, parseManagedObjectKey, storageStatus } from '../src/services/storage.service.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function verifyAttachmentDocs(Model, companyId) {
  const docs = await Model.find({
    'attachments.0': { $exists: true },
  }).select('_id attachments');

  let missing = 0;

  for (const doc of docs) {
    for (const attachment of doc.attachments || []) {
      const key = attachment.objectKey || parseManagedObjectKey(attachment.url);
      if (!key) continue;
      const exists = await checkObjectExists(key);
      if (!exists) {
        missing += 1;
        console.error(`Missing object: tenant=${companyId} model=${Model.modelName} doc=${doc._id} key=${key}`);
      }
    }
  }

  return missing;
}

async function main() {
  const status = storageStatus();
  if (!status.objectStorageEnabled) {
    throw new Error('Object storage must be configured before running verification.');
  }

  await connectDB();
  const companies = await Company.find().select('_id').lean();
  let missing = 0;

  for (const company of companies) {
    const { Task, QuickTask } = await getTenantModels(company._id);
    missing += await verifyAttachmentDocs(Task, company._id);
    missing += await verifyAttachmentDocs(QuickTask, company._id);
  }

  await mongoose.disconnect();

  if (missing > 0) {
    throw new Error(`Durable storage verification failed. Missing objects: ${missing}`);
  }

  console.log('Durable storage verification passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
