import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Company from '../src/models/Company.js';
import connectDB from '../src/config/db.js';
import { getTenantModels } from '../src/config/tenantDb.js';
import {
  getUploadsDirectoryPath,
  parseManagedObjectKey,
  storageStatus,
  uploadIncomingFile,
} from '../src/services/storage.service.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DRY_RUN = process.argv.includes('--dry-run');
const REQUEST_BASE_URL = process.env.APP_BASE_URL || '';
const uploadsDir = getUploadsDirectoryPath();

function isLegacyLocalUrl(value) {
  return String(value || '').includes('/uploads/');
}

function localFileFromUrl(url) {
  const marker = '/uploads/';
  const index = String(url || '').indexOf(marker);
  if (index === -1) return null;
  const fileName = String(url).slice(index + marker.length);
  return path.join(uploadsDir, path.basename(fileName));
}

async function migrateAttachmentArray(Model, companyId, filter = {}) {
  const docs = await Model.find(filter);
  let updatedCount = 0;

  for (const doc of docs) {
    let changed = false;
    for (const attachment of doc.attachments || []) {
      if (!isLegacyLocalUrl(attachment.url) || parseManagedObjectKey(attachment.url)) continue;
      const localPath = localFileFromUrl(attachment.url);
      if (!localPath || !fs.existsSync(localPath)) continue;

      if (DRY_RUN) {
        console.log(`[dry-run] Would migrate attachment ${attachment.name} for ${Model.modelName} ${doc._id}`);
        continue;
      }

      const buffer = await fs.promises.readFile(localPath);
      const uploaded = await uploadIncomingFile({
        file: {
          buffer,
          originalname: attachment.name,
          mimetype: attachment.type,
          size: attachment.size,
        },
        requestBaseUrl: REQUEST_BASE_URL,
        category: `${Model.modelName.toLowerCase()}-attachments`,
        entityId: String(doc._id),
      });

      attachment.url = uploaded.url;
      attachment.storageProvider = uploaded.storageProvider;
      attachment.objectKey = uploaded.objectKey;
      changed = true;
    }

    if (changed) {
      await doc.save();
      updatedCount += 1;
      console.log(`Migrated attachments for ${Model.modelName} ${doc._id} in tenant ${companyId}`);
    }
  }

  return updatedCount;
}

async function migrateAvatars(User, companyId) {
  const users = await User.find({
    avatar: { $exists: true, $ne: null },
  });
  let updatedCount = 0;

  for (const user of users) {
    if (!isLegacyLocalUrl(user.avatar) || parseManagedObjectKey(user.avatar)) continue;
    const localPath = localFileFromUrl(user.avatar);
    if (!localPath || !fs.existsSync(localPath)) continue;

    if (DRY_RUN) {
      console.log(`[dry-run] Would migrate avatar for user ${user._id}`);
      continue;
    }

    const buffer = await fs.promises.readFile(localPath);
    const uploaded = await uploadIncomingFile({
      file: {
        buffer,
        originalname: path.basename(localPath),
        mimetype: 'application/octet-stream',
        size: buffer.length,
      },
      requestBaseUrl: REQUEST_BASE_URL,
      category: 'avatars',
      entityId: String(user._id),
    });

    user.avatar = uploaded.url;
    await user.save();
    updatedCount += 1;
    console.log(`Migrated avatar for user ${user._id} in tenant ${companyId}`);
  }

  return updatedCount;
}

async function main() {
  const status = storageStatus();
  if (!status.objectStorageEnabled) {
    throw new Error('Object storage must be configured before running migration.');
  }

  await connectDB();
  const companies = await Company.find().select('_id').lean();

  let totalUpdated = 0;
  for (const company of companies) {
    const { Task, QuickTask, User } = await getTenantModels(company._id);
    totalUpdated += await migrateAttachmentArray(Task, company._id);
    totalUpdated += await migrateAttachmentArray(QuickTask, company._id);
    totalUpdated += await migrateAvatars(User, company._id);
  }

  console.log(DRY_RUN ? `[dry-run] Migration scan complete.` : `Migration complete. Updated ${totalUpdated} documents.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
