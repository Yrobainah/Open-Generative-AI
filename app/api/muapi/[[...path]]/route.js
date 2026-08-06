import { NextResponse } from 'next/server';

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const ALLOWED_EXACT = new Set([
  'account/balance',
  'upload_file',
  'seedream-5.0-edit',
]);
const ALLOWED_PREFIXES = [
  'models/',
  'predictions/',
];

function getApiKey(request) {
  const headerKey = request.headers.get('x-api-key');
  if (headerKey?.trim()) return headerKey.trim();
  const authorization = request.headers.get('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim();
  return null;
}

function normalizePath(params) {
  const segments = params?.path || [];
  return segments.map((segment) => String(segment).trim()).filter(Boolean).join('/');
}

function isAllowedPath(path) {
  if (ALLOWED_EXACT.has(path)) return true;
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function forwardedHeaders(request, apiKey) {
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');
  if (contentType) headers.set('content-type', contentType);
  if (accept) headers.set('accept', accept);
  headers.set('x-api-key', apiKey);
  return headers;
}

function responseHeaders(response) {
  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  const cost = response.headers.get('x-muapi-cost-usd');
  const balance = response.headers.get('x-account-balance');
  if (contentType) headers.set('content-type', contentType);
  if (cost) headers.set('x-muapi-cost-usd', cost);
  if (balance) headers.set('x-account-balance', balance);
  headers.set('cache-control', 'no-store');
  return headers;
}

async function proxy(request, context, method) {
  const resolvedParams = await context.params;
  const path = normalizePath(resolvedParams);
  if (!path || !isAllowedPath(path)) {
    return NextResponse.json({ error: 'MuAPI path not allowed.' }, { status: 403 });
  }

  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing MuAPI API key.' }, { status: 401 });
  }

  const incomingUrl = new URL(request.url);
  const target = `${MUAPI_BASE}/${path}${incomingUrl.search}`;
  const init = {
    method,
    headers: forwardedHeaders(request, apiKey),
    cache: 'no-store',
  };

  if (!['GET', 'HEAD'].includes(method)) {
    init.body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(target, init);
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders(response),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'MuAPI proxy failed.' },
      { status: 502 },
    );
  }
}

export async function GET(request, context) {
  return proxy(request, context, 'GET');
}

export async function POST(request, context) {
  return proxy(request, context, 'POST');
}

export async function DELETE(request, context) {
  return proxy(request, context, 'DELETE');
}
