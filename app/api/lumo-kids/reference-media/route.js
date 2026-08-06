import { NextResponse } from 'next/server';

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_HOSTS = new Set([
  'cdn.muapi.ai',
  'storage.googleapis.com',
]);

function allowedHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return ALLOWED_HOSTS.has(normalized)
    || normalized.endsWith('.muapi.ai')
    || normalized.endsWith('.fal.media')
    || normalized.endsWith('.fal.ai');
}

export async function GET(request) {
  const incoming = new URL(request.url);
  const raw = incoming.searchParams.get('url');
  if (!raw) return NextResponse.json({ error: 'Missing media URL.' }, { status: 400 });

  let target;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid media URL.' }, { status: 400 });
  }

  if (target.protocol !== 'https:' || !allowedHostname(target.hostname)) {
    return NextResponse.json({ error: 'Media host not allowed.' }, { status: 403 });
  }

  try {
    const response = await fetch(target, { cache: 'no-store', redirect: 'follow' });
    if (!response.ok) {
      return NextResponse.json({ error: `Remote media failed with ${response.status}.` }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Remote resource is not an image.' }, { status: 415 });
    }

    const announcedLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(announcedLength) && announcedLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Remote image is too large.' }, { status: 413 });
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Remote image is too large.' }, { status: 413 });
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': contentType,
        'content-length': String(bytes.byteLength),
        'cache-control': 'private, max-age=300',
        'content-disposition': 'inline',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not fetch remote media.' },
      { status: 502 },
    );
  }
}
