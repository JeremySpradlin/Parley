import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.API_URL || 'http://localhost:8000';

export async function POST(req: Request) {
  const body = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  try {
    const res = await fetch(`${BACKEND_URL}/conversation/start`, {
      method: 'POST',
      headers,
      body,
      redirect: 'manual'
    });

    const resHeaders = new Headers();
    res.headers.forEach((value, key) => resHeaders.set(key, value));

    return new NextResponse(res.body, {
      status: res.status,
      headers: resHeaders
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Proxy error' }, { status: 500 });
  }
} 