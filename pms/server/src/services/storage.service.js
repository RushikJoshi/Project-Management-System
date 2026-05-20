import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

function toBool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function sanitizeSegment(value, fallback = 'file') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function sanitizeFileName(value, fallback = 'file') {
  const base = path.basename(String(value || fallback));
  const ext = path.extname(base).slice(0, 20).toLowerCase();
  const stem = sanitizeSegment(path.basename(base, ext), fallback);
  return `${stem}${ext}`;
}

function uploadsRoot() {
  return path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));
}

function ensureLocalUploadsDir() {
  const dir = uploadsRoot();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function objectStorageConfig() {
  const provider = String(process.env.OBJECT_STORAGE_PROVIDER || '').trim().toLowerCase();
  return {
    enabled:
      provider === 's3' &&
      Boolean(process.env.OBJECT_STORAGE_BUCKET) &&
      Boolean(process.env.OBJECT_STORAGE_ACCESS_KEY_ID) &&
      Boolean(process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY),
    required: toBool(process.env.OBJECT_STORAGE_REQUIRED, false),
    provider,
    bucket: process.env.OBJECT_STORAGE_BUCKET || '',
    region: process.env.OBJECT_STORAGE_REGION || 'auto',
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT || '',
    publicBaseUrl: (process.env.OBJECT_STORAGE_PUBLIC_BASE_URL || '').replace(/\/+$/, ''),
    keyPrefix: sanitizeSegment(process.env.OBJECT_STORAGE_KEY_PREFIX || 'uploads', 'uploads'),
    forcePathStyle: toBool(process.env.OBJECT_STORAGE_FORCE_PATH_STYLE, false),
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || '',
  };
}

let s3Client;

function getS3Client() {
  const config = objectStorageConfig();
  if (!config.enabled) return null;
  if (s3Client) return s3Client;

  s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint || undefined,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return s3Client;
}

function buildObjectKey({ category, entityId, originalName }) {
  const config = objectStorageConfig();
  const safeCategory = sanitizeSegment(category, 'misc');
  const safeEntityId = sanitizeSegment(entityId, 'unscoped');
  const safeName = sanitizeFileName(originalName, 'file');
  return `${config.keyPrefix}/${safeCategory}/${safeEntityId}/${Date.now()}-${safeName}`;
}

function buildObjectUrl(key) {
  const config = objectStorageConfig();
  if (config.publicBaseUrl) return `${config.publicBaseUrl}/${key}`;
  if (config.endpoint) {
    const endpoint = config.endpoint.replace(/\/+$/, '');
    if (config.forcePathStyle) return `${endpoint}/${config.bucket}/${key}`;
    try {
      const url = new URL(endpoint);
      return `${url.protocol}//${config.bucket}.${url.host}/${key}`;
    } catch {
      return `${endpoint}/${config.bucket}/${key}`;
    }
  }
  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

function localRelativeUrl(fileName) {
  return `/uploads/${fileName}`;
}

function buildAbsoluteUrl(requestBaseUrl, relativePath) {
  const base = String(requestBaseUrl || '').replace(/\/+$/, '');
  const rel = `/${String(relativePath || '').replace(/^\/+/, '')}`;
  return base ? `${base}${rel}` : rel;
}

async function saveLocally({ buffer, originalName, mimeType, requestBaseUrl }) {
  const dir = ensureLocalUploadsDir();
  const safeName = `${Date.now()}-${sanitizeFileName(originalName)}`;
  const fullPath = path.join(dir, safeName);
  await fs.promises.writeFile(fullPath, buffer);
  const relativePath = localRelativeUrl(safeName);
  return {
    storageProvider: 'local',
    objectKey: null,
    localPath: fullPath,
    url: buildAbsoluteUrl(requestBaseUrl, relativePath),
    relativeUrl: relativePath,
    name: sanitizeFileName(originalName),
    type: mimeType || 'application/octet-stream',
  };
}

async function saveToObjectStorage({ buffer, originalName, mimeType, category, entityId }) {
  const config = objectStorageConfig();
  const client = getS3Client();
  if (!client || !config.enabled) {
    throw new Error('Object storage is not configured');
  }

  const key = buildObjectKey({ category, entityId, originalName });
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType || 'application/octet-stream',
      Metadata: {
        originalname: sanitizeFileName(originalName),
      },
    })
  );

  return {
    storageProvider: 's3',
    objectKey: key,
    localPath: null,
    url: buildObjectUrl(key),
    relativeUrl: null,
    name: sanitizeFileName(originalName),
    type: mimeType || 'application/octet-stream',
  };
}

export function storageStatus() {
  const config = objectStorageConfig();
  return {
    objectStorageEnabled: config.enabled,
    objectStorageRequired: config.required,
    provider: config.provider || 'local',
    uploadsDir: uploadsRoot(),
    bucket: config.bucket || null,
  };
}

export function parseManagedObjectKey(url) {
  const config = objectStorageConfig();
  const value = String(url || '').trim();
  if (!value) return null;
  if (config.publicBaseUrl && value.startsWith(`${config.publicBaseUrl}/`)) {
    return value.slice(config.publicBaseUrl.length + 1);
  }
  if (config.endpoint && config.bucket) {
    const endpoint = config.endpoint.replace(/\/+$/, '');
    const pathStylePrefix = `${endpoint}/${config.bucket}/`;
    if (value.startsWith(pathStylePrefix)) {
      return value.slice(pathStylePrefix.length);
    }
  }
  return null;
}

export async function uploadIncomingFile({
  file,
  requestBaseUrl,
  category,
  entityId,
}) {
  if (!file) {
    const err = new Error('No file provided');
    err.statusCode = 400;
    throw err;
  }

  const config = objectStorageConfig();
  const payload = {
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    requestBaseUrl,
    category,
    entityId,
  };

  if (config.enabled) {
    return saveToObjectStorage(payload);
  }

  if (config.required) {
    const err = new Error('Object storage is required but not configured');
    err.statusCode = 503;
    err.code = 'OBJECT_STORAGE_REQUIRED';
    throw err;
  }

  return saveLocally(payload);
}

export async function uploadIncomingFiles(input) {
  const files = Array.isArray(input.files) ? input.files : [];
  const uploads = [];
  for (const file of files) {
    uploads.push(await uploadIncomingFile({ ...input, file }));
  }
  return uploads;
}

export async function checkObjectExists(key) {
  const config = objectStorageConfig();
  const client = getS3Client();
  if (!config.enabled || !client || !key) return false;
  try {
    await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function listObjectKeys(prefix) {
  const config = objectStorageConfig();
  const client = getS3Client();
  if (!config.enabled || !client) return [];

  const keys = [];
  let continuationToken;
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix || config.keyPrefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const item of response.Contents || []) {
      if (item.Key) keys.push(item.Key);
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

export async function getStorageReadiness() {
  const config = objectStorageConfig();
  if (!config.enabled) {
    return { ok: !config.required, mode: 'local-fallback' };
  }

  const client = getS3Client();
  try {
    await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: config.keyPrefix,
        MaxKeys: 1,
      })
    );
    return { ok: true, mode: 'object-storage' };
  } catch (error) {
    return { ok: false, mode: 'object-storage', message: error?.message || 'Storage check failed' };
  }
}

export function getUploadsDirectoryPath() {
  return uploadsRoot();
}
