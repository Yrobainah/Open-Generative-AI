'use client';

const DATABASE_NAME = 'lumo-openart-reference-pack-v1';
const DATABASE_VERSION = 1;
const IMAGE_STORE = 'generated-images';
const SOURCE_URL_KEY = 'lumo_reference_source_urls_v1';
const STATE_KEY = 'lumo_reference_pack_state_v1';

function assertBrowser() {
  if (typeof window === 'undefined') throw new Error('This operation requires the browser.');
}

function openDatabase() {
  assertBrowser();
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE)) database.createObjectStore(IMAGE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open the local reference database.'));
  });
}

export async function putGeneratedBlob(jobId, blob) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE, 'readwrite');
      transaction.objectStore(IMAGE_STORE).put(blob, jobId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Could not store the generated image.'));
      transaction.onabort = () => reject(transaction.error || new Error('Image storage was cancelled.'));
    });
  } finally {
    database.close();
  }
}

export async function getGeneratedBlob(jobId) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE, 'readonly');
      const request = transaction.objectStore(IMAGE_STORE).get(jobId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Could not read the generated image.'));
    });
  } finally {
    database.close();
  }
}

export async function deleteGeneratedBlob(jobId) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE, 'readwrite');
      transaction.objectStore(IMAGE_STORE).delete(jobId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Could not remove the generated image.'));
    });
  } finally {
    database.close();
  }
}

export function readPersistedState() {
  assertBrowser();
  try {
    return JSON.parse(window.localStorage.getItem(STATE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function persistState(state) {
  assertBrowser();
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function clearPersistedState() {
  assertBrowser();
  window.localStorage.removeItem(STATE_KEY);
  window.localStorage.removeItem(SOURCE_URL_KEY);
}

function readSourceUrls() {
  try {
    return JSON.parse(window.localStorage.getItem(SOURCE_URL_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeSourceUrls(value) {
  window.localStorage.setItem(SOURCE_URL_KEY, JSON.stringify(value));
}

function apiKeyHeaders(apiKey, headers = {}) {
  return {
    ...headers,
    'x-api-key': apiKey,
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function requestMuapi(apiKey, path, options = {}) {
  const response = await fetch(`/api/muapi/${path}`, {
    ...options,
    cache: 'no-store',
    headers: apiKeyHeaders(apiKey, options.headers || {}),
  });
  const data = await parseResponse(response);
  if (!response.ok) {
    const detail = data?.detail || data?.error || data?.message || response.statusText;
    throw new Error(`MuAPI ${response.status}: ${String(detail).slice(0, 500)}`);
  }
  return { data, response };
}

export async function getLiveBalance(apiKey) {
  const { data } = await requestMuapi(apiKey, 'account/balance');
  const balance = Number(data.balance ?? data.credit_balance ?? data.remaining_balance);
  if (!Number.isFinite(balance)) throw new Error('MuAPI returned an invalid balance.');
  return balance;
}

export async function quoteReferenceJob(apiKey, modelEndpoint, payload) {
  const { data: model } = await requestMuapi(apiKey, `models/${encodeURIComponent(modelEndpoint)}`);
  if (!model.dynamic_pricing) {
    const cost = Number(model.cost);
    if (!Number.isFinite(cost)) throw new Error(`No valid fixed price was returned for ${modelEndpoint}.`);
    return { cost, currency: model.cost_currency || 'USD', dynamic: false };
  }

  const { data: estimate } = await requestMuapi(
    apiKey,
    `models/${encodeURIComponent(modelEndpoint)}/estimate-cost`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const cost = Number(estimate.cost);
  if (!Number.isFinite(cost)) throw new Error(`No valid estimate was returned for ${modelEndpoint}.`);
  return { cost, currency: estimate.currency || 'USD', dynamic: true, strategy: estimate.cost_strategy || null };
}

function normalizeUploadUrl(data) {
  return data?.url || data?.file_url || data?.output?.url || data?.data?.url || data?.data?.file_url || null;
}

export async function ensureHostedSource(apiKey, sourcePath) {
  const cached = readSourceUrls();
  if (cached[sourcePath]?.url) return cached[sourcePath].url;

  const sourceResponse = await fetch(sourcePath, { cache: 'no-store' });
  if (!sourceResponse.ok) throw new Error(`Could not load canonical source ${sourcePath}.`);
  const sourceBlob = await sourceResponse.blob();
  const extension = sourceBlob.type.includes('jpeg') ? 'jpg' : sourceBlob.type.includes('webp') ? 'webp' : 'png';
  const filename = sourcePath.split('/').pop() || `canonical-source.${extension}`;
  const formData = new FormData();
  formData.append('file', new File([sourceBlob], filename, { type: sourceBlob.type || `image/${extension}` }));

  const { data } = await requestMuapi(apiKey, 'upload_file', {
    method: 'POST',
    body: formData,
  });
  const url = normalizeUploadUrl(data);
  if (!url) throw new Error(`MuAPI did not return a hosted URL for ${sourcePath}.`);

  cached[sourcePath] = { url, uploadedAt: new Date().toISOString() };
  writeSourceUrls(cached);
  return url;
}

export function buildGenerationPayload(job, hostedSourceUrl) {
  return {
    prompt: job.prompt,
    image_urls: [hostedSourceUrl],
    image_size: job.imageSize,
  };
}

function normalizeOutputUrl(data) {
  const outputs = data?.outputs || data?.output || data?.images || data?.data?.outputs || data?.data?.images;
  if (Array.isArray(outputs) && outputs.length) {
    const first = outputs[0];
    return typeof first === 'string' ? first : first?.url || first?.image_url || null;
  }
  return data?.url || data?.image_url || data?.output?.url || data?.data?.url || null;
}

function normalizeStatus(data) {
  return String(data?.status || data?.state || '').toLowerCase();
}

export async function submitReferenceJob(apiKey, modelEndpoint, payload) {
  const { data, response } = await requestMuapi(apiKey, modelEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const requestId = data.request_id || data.id || data.task_id || null;
  const directUrl = normalizeOutputUrl(data);
  const headerCost = Number(response.headers.get('x-muapi-cost-usd'));
  const headerBalance = Number(response.headers.get('x-account-balance'));
  return {
    requestId,
    directUrl,
    status: normalizeStatus(data),
    submitCost: Number.isFinite(headerCost) ? headerCost : Number(data?.cost?.amount_usd),
    balanceAfter: Number.isFinite(headerBalance) ? headerBalance : null,
    raw: data,
  };
}

export async function pollReferenceJob(apiKey, requestId, { attempts = 120, intervalMs = 2500, onProgress } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (attempt > 1) await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    const { data, response } = await requestMuapi(apiKey, `predictions/${encodeURIComponent(requestId)}/result`);
    const status = normalizeStatus(data);
    onProgress?.({ attempt, attempts, status, data });
    if (['completed', 'succeeded', 'success'].includes(status)) {
      const url = normalizeOutputUrl(data);
      if (!url) throw new Error(`Generation ${requestId} completed without an image URL.`);
      const headerCost = Number(response.headers.get('x-muapi-cost-usd'));
      const headerBalance = Number(response.headers.get('x-account-balance'));
      return {
        url,
        status,
        cost: Number.isFinite(headerCost) ? headerCost : Number(data?.cost?.amount_usd),
        balanceAfter: Number.isFinite(headerBalance) ? headerBalance : null,
        raw: data,
      };
    }
    if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
      const detail = data?.error || data?.detail || 'Unknown generation error.';
      throw new Error(`Generation ${requestId} ${status}: ${detail}`);
    }
  }
  throw new Error(`Generation ${requestId} did not finish within the protected polling window.`);
}

export async function fetchGeneratedImageBlob(remoteUrl) {
  const response = await fetch(`/api/lumo-kids/reference-media?url=${encodeURIComponent(remoteUrl)}`, { cache: 'no-store' });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not preserve generated image locally: ${response.status} ${detail.slice(0, 200)}`);
  }
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Generated output is not an image.');
  return blob;
}

export function getStoredMuapiKey() {
  assertBrowser();
  return window.__MUAPI_KEY__ || window.localStorage.getItem('muapi_key') || '';
}

export function safeFileName(jobId, blob) {
  const extension = blob?.type?.includes('jpeg') ? 'jpg' : blob?.type?.includes('webp') ? 'webp' : 'png';
  return `${jobId}.${extension}`;
}

export async function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
}
