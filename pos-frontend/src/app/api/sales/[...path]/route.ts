/**
 * src/app/api/sales/[...path]/route.ts
 * Next.js API gateway — proxies all /api/sales/* requests to sales-service.
 */
import { NextRequest, NextResponse } from 'next/server';

const SERVICE_URL = process.env.SALES_SERVICE_URL || 'http://localhost:4003';

async function proxyRequest(req: NextRequest, path: string) {
  try {
    const url = `${SERVICE_URL}/${path}`;
    const init: RequestInit = {
      method: req.method,
      headers: { 
        'Content-Type': 'application/json',
        ...(req.headers.get('Authorization') ? { 'Authorization': req.headers.get('Authorization') as string } : {})
      },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const body = await req.json();
        init.body = JSON.stringify(body);
      } catch {
        // no body or invalid json
      }
    }
    const response = await fetch(url, init);
    
    // Check if content-type is json before parsing
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

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path.join('/'));
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path.join('/'));
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path.join('/'));
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path.join('/'));
}
