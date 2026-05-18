/**
 * src/app/api/products/[...path]/route.ts
 * Next.js API gateway — proxies all /api/products/* requests to product-service.
 */
import { NextRequest, NextResponse } from 'next/server';

const SERVICE_URL = process.env.POS_FRONTEND_INVENTORY_SERVICE_URL || 'http://localhost:3033';

async function proxyRequest(req: NextRequest, path: string) {
  try {
    const url = `${SERVICE_URL}/${path}${req.nextUrl.search}`;
    const init: RequestInit = {
      method: req.method,
      headers: { 
        'Content-Type': 'application/json',
        ...(req.headers.get('Authorization') ? { 'Authorization': req.headers.get('Authorization') as string } : {})
      },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        init.body = JSON.stringify(await req.json());
      } catch {
        // no body
      }
    }
    const response = await fetch(url, init);
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { error: 'Service returned non-JSON response', status: response.status, text: await response.text() };
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error(`Proxy error for ${req.url}:`, error);
    return NextResponse.json({ error: 'Proxy initialization failed', details: error.message }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join('/'));
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join('/'));
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join('/'));
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join('/'));
}
