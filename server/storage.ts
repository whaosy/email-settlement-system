// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)
// Falls back to local file storage when proxy credentials are not configured.

import { ENV } from './_core/env';
import fs from 'fs';
import path from 'path';

type StorageConfig = { baseUrl: string; apiKey: string };

const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'local_storage');
const LOCAL_STORAGE_URL_PREFIX = '/api/local-storage';

function ensureLocalStorageDir(relKey: string) {
  const dir = path.dirname(path.join(LOCAL_STORAGE_DIR, relKey));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function isRemoteStorageConfigured(): boolean {
  return !!(ENV.forgeApiUrl && ENV.forgeApiKey);
}

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  if (!isRemoteStorageConfigured()) {
    // Local file storage fallback
    ensureLocalStorageDir(key);
    const localPath = path.join(LOCAL_STORAGE_DIR, key);
    if (typeof data === 'string') {
      fs.writeFileSync(localPath, data, 'utf8');
    } else {
      fs.writeFileSync(localPath, Buffer.from(data as any));
    }
    const url = `${LOCAL_STORAGE_URL_PREFIX}/${key}`;
    console.log('[Storage] Saved to local storage:', localPath);
    return { key, url };
  }

  const { baseUrl, apiKey } = getStorageConfig();
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const key = normalizeKey(relKey);

  if (!isRemoteStorageConfigured()) {
    const url = `${LOCAL_STORAGE_URL_PREFIX}/${key}`;
    return { key, url };
  }

  const { baseUrl, apiKey } = getStorageConfig();
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

export async function storageFetch(urlOrKey: string): Promise<Buffer> {
  // If it's a local storage URL, read from file system
  if (urlOrKey.startsWith(LOCAL_STORAGE_URL_PREFIX)) {
    const relKey = urlOrKey.replace(LOCAL_STORAGE_URL_PREFIX, '');
    const localPath = path.join(LOCAL_STORAGE_DIR, normalizeKey(relKey));
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
    throw new Error(`Local file not found: ${localPath}`);
  }

  // If it's a relative key and not a full URL, try to get the download URL
  let finalUrl = urlOrKey;
  if (!urlOrKey.startsWith('http')) {
    const { url } = await storageGet(urlOrKey);
    finalUrl = url;
  }

  // Fetch from remote URL
  const response = await fetch(finalUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText} (URL: ${finalUrl})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
