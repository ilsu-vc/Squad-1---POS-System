/**
 * src/app/api/roles/[...path]/route.ts
 * Next.js API gateway — proxies all /api/roles/* requests to role-service.
 */
import { NextRequest, NextResponse } from 'next/server';

const SERVICE_URL = process.env.ROLE_SERVICE_URL || 'http://localhost:4005';

async function proxyRequest(req: NextRequest, path: string) {
  const url = `${SERVICE_URL}/${path}`;
  const init: RequestInit = {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      init.body = JSON.stringify(await req.json());
    } catch {
      // no body
    }
  }
  const response = await fetch(url, init);
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
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
